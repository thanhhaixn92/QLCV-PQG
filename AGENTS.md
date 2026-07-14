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

## 3. Quy tắc Lưu trữ Trạng thái Mô-đun (Module State Persistence - G3)

- **Cô lập lưu trữ**: Trạng thái mô-đun chỉ được đọc/ghi thông qua `ModuleStateRepository` và ghi nhận vào collection riêng `system_module_states`. Tuyệt đối không can thiệp hay ghi nhận vào collection Tasks hoặc các dữ liệu người dùng khác.
- **Trạng thái hợp lệ**: Chỉ lưu trữ các trạng thái `enabled`, `disabled`, `degraded`. Trạng thái `unavailable` được suy diễn động ở thời điểm chạy nếu mô-đun không được đăng ký.
- **Xử lý đồng thời (Concurrency)**: Bắt buộc áp dụng kiểm soát đồng thời lạc quan (Optimistic Concurrency Control - OCC) bằng cách sử dụng `expectedVersion` và các giao dịch (Transactions) để tránh xung đột ghi đè dữ liệu.
- **Tính tự phục hồi**: Startup hydration của mô-đun phải được thiết kế để không gây lỗi crash máy chủ khi xảy ra lỗi Firestore; trong trường hợp đó, hệ thống tự động rơi về trạng thái suy giảm (degraded) có kiểm soát hoặc in-memory.

## 4. Quy tắc làm việc với Google AI Studio (AI Studio Rules of Engagement)

AI Studio có thể tiếp tục được dùng để phát triển, nhưng không được là nơi quyết định trạng thái production. Quy trình và cam kết bắt buộc bao gồm:

- **Phát triển theo nhánh (Branch-based development)**: AI Studio chỉ được phép tạo và sửa đổi trên các nhánh tính năng (`feature/*`), không bao giờ được push trực tiếp lên nhánh `main`.
- **Giới hạn phạm vi (Strict Scoping)**: Mỗi lượt phát triển phải bám sát phạm vi của một Checkpoint duy nhất. Không tự ý mở rộng, phát triển lan sang các Checkpoint tiếp theo khi chưa được nghiệm thu.
- **Tuân thủ Hợp đồng & Bảo mật (Contract & Security Preservation)**:
  - Tuyệt đối không xóa bỏ các chốt bảo mật (Security Guards) hoặc hạ thấp tiêu chuẩn xác thực để vượt qua các bài kiểm định hoặc làm bài kiểm thử (tests) chuyển xanh.
  - Không phá vỡ các hợp đồng giao diện dữ liệu (Contracts) đã thỏa thuận ở lớp `/src/shared`.
- **Cơ chế xác thực nghiệm thu (Verification & Definition of Done)**:
  - Bắt buộc thực hiện kiểm tra kiểm lỗi tĩnh (`npm run lint`), kiểm thử tự động (`npm test`), và biên dịch thành công (`npm run build`) trước khi hoàn tất công việc.
  - Mỗi khi kết thúc nhiệm vụ, phải cập nhật và phản ánh chính xác kết quả vào tệp tài liệu kiến trúc hoặc hiện trạng `Design.md`.

