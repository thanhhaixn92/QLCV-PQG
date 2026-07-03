# Tài liệu Kiến trúc QLCV_PQG Next v3.0

Hệ thống được thiết kế theo mô hình **Nguyên khối Mô-đun (Modular Monolith)** nhằm đảm bảo khả năng mở rộng linh hoạt, tách biệt ranh giới nghiệp vụ nhưng vẫn đơn giản hóa hạ tầng triển khai.

## 1. Nguyên tắc cốt lõi

- **Máy chủ là Nguồn Sự Thật**: Mọi quyết định về trạng thái bật/tắt của mô-đun, quyền hạn tài khoản, cấu hình mô hình AI đều do máy chủ quyết định. Frontend chỉ phản ánh trạng thái này.
- **Ranh giới cô lập**: Các mô-đun trao đổi với nhau thông qua API và các hợp đồng (contracts) được định nghĩa tại `/src/shared`. Không cho phép liên kết trực tiếp phi cấu trúc giữa các lớp dữ liệu.
- **Bảo mật AI Agent**: Trợ lý AI (Gemini) không được phép truy xuất trực tiếp các nguồn dữ liệu thô (Firestore, Drive). Tất cả phải thông qua `AgentGateway` và `ToolRegistry` để lọc quyền hạn và trạng thái mô-đun trước khi thực thi.

## 2. Luồng đồng bộ trạng thái (State Sync Flow)

```
[ Client App Start ]
        │
        ▼ (Yêu cầu thông tin vận hành)
[ GET /api/runtime-config ]
        │
        ▼
[ Server Module Registry ] ──► Đọc trạng thái từ Cấu hình/DB
        │
        ▼ (Trả về danh sách Modules & Trạng thái)
[ Client App Shell ] ──► Ẩn/Hiện đường dẫn phù hợp trong Navigation
```

## 3. Quản lý Quyền hạn (RBAC & Tool Security)

Mỗi công cụ (Tool) đăng ký vào `ToolRegistry` của AI bắt buộc khai báo:
- Mô-đun sở hữu (`moduleId`).
- Quyền hạn yêu cầu (`requiredPermissions`).
- Mức độ rủi ro (`risk`): `read`, `write`, `sensitive`, `destructive`.

Khi thực thi công cụ, hệ thống kiểm tra kép:
1. Mô-đun sở hữu công cụ có đang ở trạng thái `enabled` không.
2. Vai trò tài khoản của người dùng có sở hữu đầy đủ quyền hạn không.

## 4. Cơ chế Lưu trữ Trạng thái Mô-đun (Module State Persistence - G3)

Để duy trì trạng thái vận hành của các mô-đun qua các lần khởi động lại máy chủ (process restarts), G3 giới thiệu lớp lưu trữ bền vững độc lập:

### 4.1. Khối mẫu thiết kế kho lưu trữ (Repository Pattern)
Hệ thống trừu tượng hóa phương thức lưu trữ thông qua `ModuleStateRepository`:
- **Firestore Module State Repository**: Lưu trữ dữ liệu thực tế trên Cloud Firestore thuộc collection `system_module_states`.
- **In-Memory Module State Repository**: Sử dụng cho môi trường kiểm thử CI/CD và môi trường phát triển cục bộ khi chưa cấu hình Firebase Credentials, giúp bảo đảm khả năng cô lập tốt (test isolation).

### 4.2. Luồng Hydration lúc khởi chạy (Startup Hydration Flow)
1. Máy chủ khởi động, gọi `registerAllModules()` để đăng ký các mô-đun mặc định từ tệp kê khai (Manifests).
2. Gọi `moduleStateService.hydrateFromRepository()` để nạp trạng thái từ Repository.
3. Nếu Repository có bản ghi trạng thái của mô-đun hợp lệ, hệ thống sẽ cập nhật bộ lưu trữ Runtime trong memory (`ModuleRegistry`).
4. Nếu chưa có hoặc xảy ra lỗi (ví dụ Firestore mất kết nối), hệ thống giữ nguyên trạng thái mặc định từ Manifest để bảo đảm tính tự phục hồi (fail-safe).

### 4.3. Kiểm soát Đồng thời Lạc quan (Optimistic Concurrency Control - OCC)
Mỗi document lưu trên Firestore chứa một thuộc tính `version` tăng tự động. Khi cập nhật trạng thái mô-đun (`PUT /api/admin/modules/:id/state`), quản trị viên có thể truyền lên `expectedVersion`. Hệ thống sử dụng Giao dịch Firestore (Transactions) để kiểm tra:
- Nếu phiên bản hiện tại trên Database khác với `expectedVersion`, giao dịch sẽ hủy bỏ và trả về lỗi `CONFLICT` (HTTP 409).
- Giúp ngăn chặn tuyệt đối tình trạng tranh chấp dữ liệu (race conditions) khi có nhiều quản trị viên cùng thao tác cấu hình hệ thống.

