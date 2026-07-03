# Quy chuẩn Bảo mật Hệ thống (SECURITY.md)

Hệ thống QLCV_PQG Next áp dụng các nguyên tắc bảo mật phòng thủ nghiêm ngặt nhằm bảo vệ dữ liệu nghiệp vụ và các tài nguyên trí tuệ nhân tạo.

## 1. Bảo mật Khóa bí mật (Secret containment)

- **Gemini API Key**: Tuyệt đối không bao giờ được xuất hiện hoặc truyền tải xuống Client (Trình duyệt). Tất cả các lời gọi AI đều phải được bọc trong một endpoint API bảo mật phía Server-side.
- **Không Hardcode thông tin nhạy cảm**: Toàn bộ cấu hình tài nguyên hệ thống (Firebase Project ID, Database ID, Gemini API Key) phải được nạp thông qua biến môi trường tại `/src/server/app/serverConfig.ts`.

## 2. Kiểm soát luồng AI Agent (AI Gateway Restrictions)

- Các Agent và mô hình ngôn ngữ lớn (LLM) tuyệt đối không có quyền kết nối trực tiếp đến các lớp hạ tầng dữ liệu thô như Cloud Firestore hay Google Drive.
- Mọi hoạt động truy xuất thông tin phải đi qua `ToolRegistry` để thẩm định quyền người dùng thực tế (`requiredPermissions`) và kiểm tra xem phân hệ nghiệp vụ chứa công cụ đó có đang bị vô hiệu hóa hay không.

## 3. Hệ thống phân quyền chặt chẽ (RBAC)

- Kiểm duyệt quyền hạn được thực thi ngay tại tầng định tuyến của API (`checkPermission` middleware).
- Một yêu cầu hợp lệ bắt buộc đi qua bộ lọc:
  1. Kiểm tra tính hợp lệ của Token người dùng.
  2. Xác định vai trò (`UserRole`) và đối chiếu danh sách quyền thực tế trong `ROLE_PERMISSIONS`.
  3. Kiểm tra xem hành động nghiệp vụ có liên kết với mô-đun bị tắt hay không.
