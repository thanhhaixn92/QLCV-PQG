# Hướng dẫn dành cho AI Agent (AGENTS.md)

Tài liệu này lưu trữ các quy tắc phát triển dự án QLCV_PQG Next dành cho AI Coding Agent.

## 1. Quy tắc cấu trúc mã nguồn (Development Rules)

- **Không sử dụng kiểu `any` phi cấu trúc**: Luôn khai báo tường minh kiểu dữ liệu (Strict TypeScript) để bảo đảm an toàn kết xuất.
- **Tôn trọng ranh giới mô-đun**: Khi xây dựng chức năng nghiệp vụ mới:
  - Tạo cấu trúc thư mục riêng biệt tại `/src/client/modules/<tên_module>`.
  - Đăng ký Manifest và công cụ AI liên đới tại Máy chủ thông qua `/src/server/modules/registerModules.ts`.
- **Đồng bộ hóa Correlation ID (`requestId`)**:
  - Bắt buộc lấy `requestId` từ yêu cầu đầu vào của Express và chuyển tiếp xuống các lớp xử lý (Services, Repositories).
  - Ghi nhận đầy đủ mã định danh này khi xuất nhật ký kiểm toán (`auditService.logEvent`).

## 2. Quy chuẩn Phản hồi lỗi API

- Không bao giờ trả về lỗi thô (stack traces) cho người dùng.
- Mọi API phản hồi lỗi phải tuân thủ đúng định dạng `ApiErrorResponse` và sử dụng tập hợp mã lỗi chuẩn hóa trong `ErrorCode`.
