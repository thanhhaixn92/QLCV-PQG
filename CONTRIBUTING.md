# Hướng dẫn Đóng góp Dự án (CONTRIBUTING.md)

Chào mừng bạn tham gia đóng góp xây dựng hệ thống QLCV_PQG Next! Để duy trì chất lượng mã nguồn cao nhất, vui lòng tuân thủ các quy định dưới đây.

## 1. Quy trình phát triển tính năng mới

1. **Phân tích yêu cầu**: Xác định rõ chức năng nghiệp vụ của bạn có nằm trong một mô-đun riêng biệt hay không.
2. **Khai báo Manifest**: Viết cấu hình Zod Schema tại `/src/shared/schemas` nếu tính năng của bạn yêu cầu một mô-đun mới.
3. **Viết kiểm thử tự động**: Viết bổ sung các kịch bản kiểm thử vào bộ test của dự án `/src/tests/runTests.ts` để bảo đảm các tính năng không làm phá vỡ cấu trúc có sẵn.
4. **Kiểm tra mã nguồn**: Chạy kiểm thử tự động trước khi đẩy mã nguồn lên nhánh chính:
   ```bash
   npm run test
   ```

## 2. Tiêu chuẩn viết Code (Clean Code Guidelines)

- Không swallow lỗi (bỏ qua catch block trống). Luôn bọc lỗi bằng `AppError` kèm Correlation ID tương ứng để phục vụ truy dấu vết lỗi.
- Đặt tên hàm rõ ràng, thể hiện đúng mục đích nghiệp vụ.
- Giữ các tệp giao diện React tối giản. Di chuyển các logic nghiệp vụ phức tạp ra ngoài các Hook hoặc các tệp Service tương ứng.
