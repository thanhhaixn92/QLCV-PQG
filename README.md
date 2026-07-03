# QLCV_PQG Next (v3.0)

[![CI Pipeline](https://github.com/thanhhaixn92/QLCV-PQG/actions/workflows/ci.yml/badge.svg)](https://github.com/thanhhaixn92/QLCV-PQG/actions/workflows/ci.yml)

Hệ thống quản lý công việc, biên tập nội dung, quản lý tài liệu và trợ lý AI nội bộ thế hệ mới, được thiết kế theo kiến trúc **Nguyên khối Mô-đun (Modular Monolith)** sử dụng React, TypeScript, Node.js và Tailwind CSS.

## 🚀 Trạng Thái Dự Án (Implemented, Mocked, Planned)

- **CI Pipeline & Automated Controls**: Đã thiết lập GitHub Actions tích hợp chạy tự động `lint` (TypeScript check), `test` (các kịch bản đơn vị và tích hợp HTTP), và `build` dự án trên mỗi luồng đẩy mã nguồn.
- **Module Registry & State Controller (Implemented)**: Quản lý bật/tắt trạng thái các phân hệ nghiệp vụ tập trung tại máy chủ. Khi tắt mô-đun, các API liên quan bị chặn ngay tại biên với mã lỗi `MODULE_DISABLED`, giao diện ẩn đi và không để lộ endpoint.
  - **Lưu trữ Bền vững (G3 Persistence)**: Đã tích hợp lưu trữ trạng thái mô-đun bền vững xuống Firestore (collection `system_module_states`) hoặc tự động rơi về InMemory fallback thông minh. Hỗ trợ cơ chế Optimistic Concurrency Control (OCC) thông qua `expectedVersion` để ngăn chặn xung đột dữ liệu ghi đè.
- **Truy vấn Công việc (tasks-query) (Mocked for Isolation)**: Phân hệ `tasks-query` hiện tại đã được bóc tách hoàn toàn ra khỏi Core Router và được cô lập thành mô-đun nghiệp vụ riêng biệt tại `/src/server/modules/tasks-query/` cho mục đích kiểm định hành vi biên (module-isolation testing). Các API trả về dữ liệu mock mô phỏng và chưa kích hoạt database thật.
- **Role-Based Access Control (RBAC) (Implemented)**: Hỗ trợ phân quyền người dùng thông minh, bảo mật phân tầng nghiệp vụ theo vai trò.
- **Correlation ID Tracking (Implemented)**: Tự động đồng bộ hóa mã yêu cầu `requestId` xuyên suốt luồng giao dịch thông qua Middleware thiết lập duy nhất tại biên, lưu nhật ký kiểm toán để dễ dàng theo dấu lỗi.
- **Fail-safe Infrastructure (Mocked/Simulated)**: Cơ chế giả lập dữ liệu tự động kích hoạt nếu Firestore và Gemini chưa được cấu hình, đảm bảo ứng dụng lõi vẫn hoạt động bình thường mà không gây crash máy chủ.
  - *Lưu ý*: Các kết nối Firestore và Gemini thật hiện chưa được khởi tạo cho các nghiệp vụ trong giai đoạn này. Các luật bảo mật Firestore (`firestore.rules`) được thiết lập an toàn mặc định là **deny-all** (`allow read, write: if false;`), ngăn chặn mọi truy cập dữ liệu trực tiếp từ client khi chưa có Data Inventory và Permission Model chính thức.

## 📁 Cấu trúc Thư mục

- `/src/shared/`: Chứa các hợp đồng API, Zod schemas và cấu trúc mã lỗi chuẩn.
- `/src/server/`: Mã nguồn máy chủ Node.js/Express, bộ điều phối AI Agent, dịch vụ kiểm toán và phân quyền.
  - `/src/server/modules/tasks-query/`: Mô-đun truy vấn công việc với các thành phần được cô lập gồm Module Manifest, Routes và Service Mock.
- `/src/client/`: Giao diện React SPA, đồng bộ trạng thái mô-đun từ máy chủ qua API.
- `/src/tests/`: Bộ ca kiểm thử tự động xác thực vận hành hệ thống lõi và kiểm thử tích hợp HTTP sử dụng `supertest`.

## 🛠️ Cách Vận Hành

1. **Khởi chạy môi trường phát triển (Full-stack)**:
   ```bash
   npm run dev
   ```

2. **Chạy bộ kiểm thử tự động**:
   ```bash
   npm run test
   ```

3. **Kiểm tra cú pháp & TypeScript**:
   ```bash
   npm run lint
   ```

4. **Biên dịch sản phẩm (Vite + Esbuild Bundle)**:
   ```bash
   npm run build
   ```
