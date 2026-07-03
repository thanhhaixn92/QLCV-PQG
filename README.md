# QLCV_PQG Next (v3.0)

Hệ thống quản lý công việc, biên tập nội dung, quản lý tài liệu và trợ lý AI nội bộ thế hệ mới, được thiết kế theo kiến trúc **Nguyên khối Mô-đun (Modular Monolith)** sử dụng React, TypeScript, Node.js và Tailwind CSS.

## 🚀 Trạng Thái Dự Án (Implemented, Mocked, Planned)

- **Module Registry & State Controller (Implemented/Mocked)**: Quản lý bật/tắt trạng thái các phân hệ nghiệp vụ tập trung tại máy chủ. Khi tắt mô-đun, các API liên quan bị chặn ngay tại biên, giao diện ẩn đi và không để lộ endpoint.
  - *Lưu ý*: Trạng thái mô-đun hiện tại được lưu **in-memory** trong bộ nhớ tiến trình Node.js cho mục đích thử nghiệm (sẽ reset về mặc định sau khi khởi động lại máy chủ). Cơ chế lưu bền vững (Persistent Production) chưa được triển khai.
- **Role-Based Access Control (RBAC) (Implemented)**: Hỗ trợ phân quyền người dùng thông minh, bảo mật phân tầng nghiệp vụ theo vai trò.
- **Correlation ID Tracking (Implemented)**: Tự động đồng bộ hóa mã yêu cầu `requestId` xuyên suốt luồng giao dịch, lưu nhật ký kiểm toán để dễ dàng theo dấu lỗi.
- **Fail-safe Infrastructure (Mocked/Simulated)**: Cơ chế giả lập dữ liệu tự động kích hoạt nếu Firestore và Gemini chưa được cấu hình, đảm bảo ứng dụng lõi vẫn hoạt động bình thường mà không gây crash máy chủ.
  - *Lưu ý*: Firestore và Gemini hiện chưa được sử dụng cho các nghiệp vụ thật ở giai đoạn này.

## 📁 Cấu trúc Thư mục

- `/src/shared/`: Chứa các hợp đồng API, Zod schemas và cấu trúc mã lỗi chuẩn.
- `/src/server/`: Mã nguồn máy chủ Node.js/Express, bộ điều phối AI Agent, dịch vụ kiểm toán và phân quyền.
- `/src/client/`: Giao diện React SPA, đồng bộ trạng thái mô-đun từ máy chủ qua API.
- `/src/tests/`: Bộ ca kiểm thử tự động xác thực vận hành hệ thống lõi.

## 🛠️ Cách Vận Hành

1. **Khởi chạy môi trường phát triển (Full-stack)**:
   ```bash
   npm run dev
   ```

2. **Chạy bộ kiểm thử tự động**:
   ```bash
   npm run test
   ```

3. **Biên dịch sản phẩm (Vite + Esbuild Bundle)**:
   ```bash
   npm run build
   ```
