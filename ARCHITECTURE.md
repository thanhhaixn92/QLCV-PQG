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
