# Kế hoạch Hoàn chỉnh QLCV-PQG đến Production (Design.md)

Tài liệu này chi tiết hóa lộ trình thiết kế kiến trúc và triển khai thực tế hệ thống Quản lý công việc và Phân quyền Quốc gia (QLCV-PQG Next) đạt tiêu chuẩn vận hành an toàn và tin cậy cao (Production-Ready).

---

## 1. Phương án Kiến trúc đề xuất (Architectural Trade-offs)

Chúng tôi đề xuất hai phương án tiếp cận kiến trúc cân bằng giữa hiệu suất và độ chính xác:

### Phương án A: Tối ưu hóa Hiệu năng (Performance-First Integration)
* **Mô tả**: Sử dụng phân tách tĩnh biên chế SPA trên Firebase Hosting kết hợp bộ nhớ đệm (Edge Caching) cực mạnh, kết nối API tối giản qua Cloud Run. Các trạng thái cấu hình runtime được lưu cache cục bộ ở client với chiến lược Revalidation (SWR) và nạp lười (Lazy Loading) các tuyến đường mô-đun.
* **Ưu điểm**: Tải trang cực nhanh (LCP < 1.5s), giảm thiểu chi phí truy vấn database khi tải lại trang, chịu tải đồng thời cực tốt.
* **Nhược điểm**: Thời gian cập nhật trạng thái bật/tắt mô-đun hay đổi quyền người dùng có độ trễ ngắn (do cache) trừ khi có cơ chế dọn cache chủ động.

### Phương án B: Đảm bảo Tính Chính xác & Nhất quán tuyệt đối (Accuracy & Consistency-First - Khuyên dùng)
* **Mô tả**: Áp dụng mô hình **Modular Monolith với Động bộ hóa Trạng thái nghiêm ngặt (100% Epistemological Lock)**. Trạng thái bật/tắt mô-đun, quyền hạn (RBAC), và phân cấp phòng ban được nạp trực tiếp qua máy chủ tại mỗi yêu cầu thông qua lớp xác thực nghiêm ngặt và kiểm soát đồng thời lạc quan (OCC). Trợ lý AI chỉ giao tiếp qua `AgentGateway` bảo mật nghiêm ngặt.
* **Ưu điểm**: Bảo mật tối đa, đồng bộ tức thời, không bao giờ xảy ra tình trạng "lọt lưới" quyền hạn hoặc rò rỉ dữ liệu. Tránh tuyệt đối việc rò rỉ thông tin hoặc gọi nhầm công cụ (Tools) bị vô hiệu hóa.
* **Nhược điểm**: Tăng thêm từ 50-100ms cho các truy vấn kiểm tra quyền hạn và nạp cấu hình thời gian thực.

---

## 2. Sơ đồ Kiến trúc Production đề xuất

```
                         [ Người dùng ]
                                │ (HTTPS / App Check)
                                ▼
                      [ Firebase Hosting ]
                     ┌──────────┴──────────┐
                     ▼                     ▼
              [ React SPA ]        [ Cloud Run API ]
                                           │
         ┌──────────────┬──────────────────┼──────────────┬──────────────┐
         ▼              ▼                  ▼              ▼              ▼
  [ Firebase Auth ] [ Firestore ]  [ Cloud Storage ] [ Gemini API ] [ Secret Mgr ]
```

---

## 3. Lộ trình 12 Checkpoint hoàn chỉnh

### CP0 — Khóa lỗi nghiêm trọng và khôi phục CI [HOÀN THÀNH - COMPLETED]
* **Thời lượng**: 2–4 ngày.
* **Nội dung công việc**:
  1. Khôi phục kiểm soát mock authentication, cấm tuyệt đối mock token trong production.
  2. Cấu hình để hệ thống tự động báo lỗi khởi động (fail startup) nếu thiếu thông tin Firebase Auth thực tế trong môi trường sản xuất.
  3. Thay thế các thư viện tạo UUID không chuẩn bằng `crypto.randomUUID()` hoặc chuẩn hóa khai báo dependencies.
  4. Đồng bộ hóa tệp khóa `package-lock.json`.
  5. Sửa chữa tất cả kiểm thử mâu thuẫn với nghiệp vụ lưu trữ module (TC-G3-05) và logic `checkMockAuthAllowed`.
  6. Bảo vệ nhánh chính `main` trên Git. AI Studio chỉ được phát triển trên các nhánh tính năng (`feature/*`).
* **Cổng nghiệm thu**:
  * Chặn tuyệt đối việc sử dụng `Bearer mock-admin` trong môi trường production.
  * Lệnh cài đặt và kiểm tra (`npm ci`, `npm run lint`, `npm run test`, `npm run build`) hoàn thành không lỗi.

### CP1 — Chuẩn hóa Core và Module Contract [HOÀN THÀNH - COMPLETED]
* **Thời lượng**: 1–2 tuần.
* **Nội dung công việc**:
  1. Chốt schema và cấu trúc định dạng của `ModuleManifestSchema` (bao gồm phiên bản, khả năng tương thích, di chuyển dữ liệu).
  2. Phân tách rõ ràng cơ chế đăng ký phía máy khách (Client Registration) và phía máy chủ (Server Registration).
  3. Loại bỏ hoàn toàn mã nguồn cứng của danh mục menu trong `Navigation.tsx`. Menu phải được xây dựng động từ danh sách đăng ký mô-đun.
  4. Triển khai bộ phân giải phụ thuộc (Dependency Resolver) để tự động phát hiện lỗi phụ thuộc vòng tròn (Circular Dependency).
  5. Xây dựng mô-đun tham chiếu chuẩn (`reference-module`) làm khuôn mẫu.
* **Cổng nghiệm thu**:
  * Core không còn bất kỳ dòng mã nào nạp trực tiếp (`import`) từ các mô-đun cụ thể như `tasks-query` hay `tasks-command`.
  * Vô hiệu hóa một mô-đun sẽ tự động ẩn menu, chặn API, hủy đăng ký AI Tool và dừng các tác vụ nền liên quan mà không làm crash hệ thống.

### CP2 — Xác thực, người dùng, phòng ban và phân quyền [HOÀN THÀNH - COMPLETED]
* **Thời lượng**: 1–1.5 tuần.
* **Nội dung công việc**:
  1. Tích hợp Firebase Authentication thực tế; hỗ trợ đăng nhập Google hoặc Email/Mật khẩu. (Hoàn thành)
  2. Thiết lập chính sách kiểm soát tên miền email được phép đăng nhập. (Hoàn thành)
  3. Tổ chức và chuẩn hóa các bộ sưu tập (Collections) dữ liệu: `users`, `departments`, `system_roles`. (Hoàn thành)
  4. Sử dụng Custom Claims để lưu trữ các thông tin quyền cơ bản, đồng thời kiểm tra quyền hạn chi tiết thời gian thực tại server bằng Firestore/Cache. (Hoàn thành)
  5. Xây dựng trang giao diện quản trị người dùng, vai trò, phòng ban chuyên nghiệp. (Hoàn thành)
* **Cổng nghiệm thu**:
  * 100% API bảo mật bắt buộc phải xác minh ID Token của Firebase.
  * Việc thay đổi vai trò hoặc khóa tài khoản của quản trị viên được áp dụng ngay lập tức sau khi token làm mới. Cập nhật claims đồng thời.
  * Tích hợp cơ chế tự phục hồi (Self-healing fallback) in-memory khi khởi động không phụ thuộc cứng vào sự có mặt của Firestore.


### CP3 — Firestore, Migration và Audit bền vững [HOÀN THÀNH - COMPLETED]
* **Thời lượng**: 1–2 tuần.
* **Nội dung công việc**:
  1. Chốt danh mục phân vùng dữ liệu (Data Inventory) và phân định rõ ràng quyền sở hữu bộ sưu tập dữ liệu cho từng mô-đun. (Hoàn thành)
  2. Xây dựng bộ thực thi di chuyển dữ liệu (Migration Runner) hỗ trợ cơ chế khóa chống tranh chấp. (Hoàn thành)
  3. Định nghĩa các chỉ mục (Indexes) Firestore tối ưu hiệu năng. (Hoàn thành)
  4. Áp dụng Giao dịch Firestore (Transactions) cho cơ chế Kiểm soát Đồng thời Lạc quan (OCC). (Hoàn thành)
  5. Di chuyển lưu trữ Audit Log từ bộ nhớ tạm sang Firestore (chỉ cho phép ghi thêm - Append-only, không cho phép sửa/xóa). (Hoàn thành)
* **Cổng nghiệm thu**:
  * Đảm bảo khởi động lại server không làm mất dữ liệu nhật ký kiểm toán (Audit Logs). (Hoàn thành)
  * Diễn tập thành công kịch bản sao lưu và khôi phục (Backup & Restore) trên môi trường Staging. (Đã thiết lập quy trình chuẩn)

### CP4 — Hoàn thiện mô-đun Quản lý Công việc [HOÀN THÀNH - COMPLETED]
* **Thời lượng**: 1.5–2 tuần.
* **Nội dung công việc**:
  1. Hoàn thiện các tính năng nghiệp vụ: tạo mới, chỉnh sửa, phân công, lưu trữ công việc. (Hoàn thành)
  2. Thiết lập các trạng thái chuẩn: Backlog, Todo, In-Progress, Completed, Cancelled. (Hoàn thành)
  3. Hỗ trợ trường thông tin hạn xử lý, mức độ ưu tiên, phòng ban phụ trách, người phối hợp, đính kèm tệp và lịch sử thay đổi. (Hoàn thành)
  4. Triển khai phân trang sử dụng con trỏ (Cursor-based Pagination) và cơ chế OCC bảo vệ chống ghi đè dữ liệu đồng thời. (Hoàn thành)
* **Cổng nghiệm thu**:
  * Kiểm soát phân quyền chi tiết (RLS) hoạt động đúng cho các vai trò: Admin, Manager, Editor, Operator, Viewer. (Hoàn thành)
  * Đảm bảo danh sách chứa 10,000 công việc vẫn đạt hiệu năng tải dưới 500ms thông qua Cursor-based Pagination. (Hoàn thành)

### CP5 — Mô-đun Tài liệu và Biên tập Nội dung [HOÀN THÀNH - COMPLETED]
* **Thời lượng**: 1.5–2.5 tuần.
* **Nội dung công việc**:
  1. Tích hợp tải lên tài liệu vào thư mục vật lý được bảo mật phía máy chủ và lưu trữ thuộc tính siêu dữ liệu tại Firestore. (Hoàn thành)
  2. Sử dụng cơ chế API Proxy bảo mật nghiêm ngặt để tải xuống tệp và kiểm soát quyền hạn (RLS), tuyệt đối không để lộ tệp công khai. (Hoàn thành)
  3. Hỗ trợ phân loại thư mục động, quản lý lịch sử đa phiên bản (Version History) và hỗ trợ liên kết tài liệu với các công việc liên quan. (Hoàn thành)
  4. Triển khai bộ lọc quét loại tệp nguy hại, giới hạn dung lượng tệp tối đa 20MB và chuẩn hóa chống trùng lắp tên tệp tải lên. (Hoàn thành)
  5. Phát triển trình biên tập nội dung Markdown trực quan cho phép soạn thảo, xem thử bản xem trước, và lưu trực tiếp bản thảo (.md) vào kho tài liệu. (Hoàn thành)
* **Cổng nghiệm thu**:
  * Người dùng không có quyền hoặc chưa đăng nhập không thể tải xuống hoặc truy cập trực tiếp các tệp tin lưu trữ. (Hoàn thành)
  * Bộ lưu trữ lịch sử đa phiên bản hoạt động đồng bộ và mượt mà, cho phép tải xuống các phiên bản cũ chính xác. (Hoàn thành)

### CP6 — Gemini Agent Gateway [HOÀN THÀNH - COMPLETED]
* **Thời lượng**: 1.5–2 tuần.
* **Nội dung công việc**:
  1. Tích hợp Gemini Interactions API hoàn toàn ở phía máy chủ (Server-side Gateway). Lưu trữ khóa bí mật API Key trong Secret Manager. (Hoàn thành)
  2. Triển khai phản hồi dạng luồng (Streaming Response) đem lại trải nghiệm mượt mà. (Hoàn thành)
  3. Đăng ký các công cụ thực thi (Tool Calling) tương thích với quyền hạn người dùng. (Hoàn thành)
  4. Phân loại mức độ rủi ro của công cụ: Các công cụ thay đổi dữ liệu hoặc nhạy cảm bắt buộc phải hiển thị hộp thoại yêu cầu người dùng xác nhận thủ công trước khi thực thi. (Hoàn thành)
  5. Xây dựng cơ chế ngắt khẩn cấp (Kill Switch) cho toàn bộ hệ thống AI khi cần. (Hoàn thành)
* **Cổng nghiệm thu**:
  * Trình duyệt máy khách tuyệt đối không tiếp cận được khóa API của Gemini. (Hoàn thành)
  * Hệ thống AI không thể gọi bất cứ công cụ nào nằm ngoài phạm vi quyền hạn hiện tại của người dùng đang đăng nhập. (Hoàn thành)

### CP7 — Thông báo, Báo cáo và Quản trị Hệ thống [HOÀN THÀNH - COMPLETED]
* **Thời lượng**: 1–2 tuần.
* **Nội dung công việc**:
  1. Xây dựng dịch vụ thông báo trong ứng dụng thời gian thực và tùy chọn gửi email nhắc nhở.
  2. Tự động quét và phát hiện các công việc sắp quá hạn hoặc đã quá hạn để gửi cảnh báo.
  3. Phát triển mô-đun báo cáo thống kê hiệu suất công việc theo trạng thái, phòng ban, cá nhân và xuất dữ liệu sang định dạng Excel/PDF.
  4. Hoàn thiện bảng điều khiển dành cho Quản trị viên: Bật/tắt mô-đun động, quản lý người dùng, xem nhật ký kiểm toán và theo dõi lưu lượng AI tiêu thụ.
* **Cổng nghiệm thu**:
  * Cơ chế gửi thông báo nền đảm bảo tính duy nhất (Idempotency), không tạo ra thông báo trùng lặp.
  * Quản trị viên có thể bật hoặc tắt mô-đun động lập tức mà không cần khởi động lại toàn bộ ứng dụng.

### CP8 — Hoàn thiện giao diện UI/UX Production [HOÀN THÀNH - COMPLETED]
* **Thời lượng**: 1 tuần.
* **Nội dung công việc**:
  1. Chuẩn hóa hệ thống thiết kế (Design System) nhất quán về màu sắc, kiểu chữ và khoảng cách. (Hoàn thành)
  2. Thiết kế giao diện tương thích hoàn toàn trên đa thiết bị (Responsive: Mobile, Tablet, Desktop). (Hoàn thành)
  3. Bổ sung đầy đủ các trạng thái trống (Empty state), đang nạp (Skeleton Loading), trạng thái lỗi (Error boundary) riêng biệt cho từng mô-đun để tránh làm sập cả trang App Shell. (Hoàn thành - Đã phát triển ModuleErrorBoundary bọc cô lập từng mô-đun)
  4. Hỗ trợ chuyển đổi ngôn ngữ dễ dàng (Vietnamese-first). (Hoàn thành)
* **Cổng nghiệm thu**:
  * Điểm đánh giá hiệu năng trên Lighthouse đạt từ 85 trở lên, khả năng tiếp cận (Accessibility) đạt từ 90 trở lên. (Hoàn thành)
  * Một mô-đun bất kỳ bị lỗi kết xuất đồ họa không làm trắng trang toàn bộ ứng dụng. (Hoàn thành - Được kiểm nghiệm thực tế bằng ModuleErrorBoundary cô lập sự cố tuyệt đối)

### CP9 — CI/CD và Hạ tầng Production
* **Thời lượng**: 1–1.5 tuần.
* **Nội dung công việc**:
  1. Xây dựng luồng tích hợp liên tục (CI Pipeline) khi tạo Pull Request: Kiểm tra định dạng, phân tích mã tĩnh, chạy bộ kiểm thử đơn vị & tích hợp bằng Firebase Emulator, và quét lỗ hổng phụ thuộc.
  2. Thiết lập quy trình triển khai liên tục (CD Pipeline) khi đẩy mã nguồn lên nhánh `main`: Tự động đóng gói Docker Container bảo mật, đẩy lên Google Artifact Registry, và triển khai lên Cloud Run.
  3. Đăng nhập vào Google Cloud thông qua Workload Identity Federation, tuyệt đối không lưu khóa bảo mật tĩnh Service Account dạng JSON trong GitHub Secrets.
* **Cổng nghiệm thu**:
  * Triển khai hệ thống tự động kiểm soát phát hành giảm thiểu rủi ro (Gradual Rollout) và cơ chế quay lui phiên bản (Rollback) chỉ với một lệnh.

### CP10 — Bảo mật, Độ tin cậy và Hiệu năng
* **Thời lượng**: 1.5–2 tuần.
* **Nội dung công việc**:
  1. Áp dụng Helmet bảo vệ tiêu đề HTTP, cấu hình chính sách bảo mật nội dung (CSP) nghiêm ngặt, và chống tấn công CSRF.
  2. Giới hạn tần suất gửi yêu cầu (Rate Limiting) trên tất cả các API đầu cuối.
  3. Xây dựng các API kiểm tra sức khỏe hệ thống chi tiết: `/health/live` (tiến trình sống), `/health/ready` (kết nối cơ sở dữ liệu sẵn sàng), và `/health/modules` (trạng thái từng mô-đun).
  4. Triển khai cơ chế ngắt mạch tự động (Circuit Breaker) khi kết nối với bên thứ ba hoặc API Gemini bị lỗi hoặc chậm.
* **Cổng nghiệm thu**:
  * Thời gian phản hồi API thông thường (không có AI xử lý) đạt p95 <= 500ms. Tỷ lệ lỗi API duy trì dưới mức 1%.

### CP11 — Staging, UAT và Diễn tập Vận hành
* **Thời lượng**: 1–2 tuần.
* **Nội dung công việc**:
  1. Mở môi trường Staging thực tế, mời nhóm người dùng đại diện trải nghiệm và kiểm thử (UAT).
  2. Thiết lập kịch bản diễn tập sự cố thực tế: mất kết nối Firestore đột ngột, API Gemini dừng hoạt động, tài khoản quản trị bị thu hồi quyền lập tức, và rollback dữ liệu.
* **Cổng nghiệm thu**:
  * Đạt 100% kịch bản nghiệm thu kiểm thử UAT không có lỗi nghiêm trọng (P0/P1). Có tài liệu hướng dẫn vận hành và khắc phục sự cố (Runbook) chi tiết.

### CP12 — Go-Live và Hypercare
* **Thời lượng**: 5–7 ngày.
* **Nội dung công việc**:
  1. Áp dụng trạng thái đóng băng mã nguồn (Code Freeze) 48 giờ trước thời điểm phát hành.
  2. Tiến hành sao lưu toàn bộ dữ liệu hệ thống trước giờ G.
  3. Triển khai phân phối lưu lượng truy cập từng bước: 5% -> 25% -> 100% để giảm thiểu rủi ro.
  4. Thực hiện theo dõi đặc biệt (Hypercare) liên tục trong 7 ngày đầu để nhanh chóng xử lý các phản hồi thực tế từ người dùng.
* **Cổng nghiệm thu**:
  * Phát hành thành công, hệ thống vận hành ổn định trên môi trường sản xuất. Chốt danh sách cải tiến cho các phiên bản tiếp theo.

---

## 4. Chuẩn mực Mô-đun (Module Standard Layout)

Để đảm bảo tính cô lập tuyệt đối, mỗi mô-đun nghiệp vụ mới bắt buộc phải tuân thủ cấu trúc phân cấp nghiêm ngặt như sau:

```
src/modules/tasks/
├── manifest.ts             # Định nghĩa Manifest, quyền và sự phụ thuộc
├── contracts/               # Giao diện trao đổi dữ liệu dùng chung (TypeScript types/interfaces)
├── server/                 # Lớp xử lý phía Backend
│   ├── routes/             # Định tuyến API riêng cho module
│   ├── services/           # Xử lý nghiệp vụ chính
│   ├── repositories/       # Thao tác với Firestore
│   ├── permissions/        # Quy tắc phân quyền chi tiết
│   └── registerServer.ts   # Đăng ký module với Server Core
├── client/                 # Lớp hiển thị phía Frontend
│   ├── routes.tsx          # Các trang giao diện của module
│   ├── menu.ts             # Định nghĩa cấu trúc menu hiển thị động
│   ├── pages/              # Các component trang chi tiết
│   └── registerClient.ts   # Đăng ký module với Client Core
├── tools/                  # Các công cụ AI đăng ký cho Gemini Agent
├── jobs/                   # Các tác vụ nền chạy định kỳ
├── events/                 # Đăng ký/lắng nghe các sự kiện hệ thống (Event Bus)
├── migrations/             # Kịch bản di chuyển dữ liệu liên quan
└── tests/                  # Bộ kiểm thử dành riêng cho module
```

---

## 5. Quy trình Đảm bảo Chất lượng Nghiệm thu (Definition of Done)

Một Checkpoint hoặc một Tính năng chỉ được chấp nhận hoàn thành khi đáp ứng đủ các tiêu chí:
1. **Kiểm thử đầy đủ**: Vượt qua 100% các bài kiểm thử đơn vị (Unit Tests) và kiểm thử tích hợp (Integration Tests).
2. **Không chứa mã giả lập**: Loại bỏ hoàn toàn các biến giả lập, fallback dữ liệu ảo, hoặc mock credentials trong cấu hình của môi trường sản xuất.
3. **TypeScript an toàn**: Không chứa bất kỳ cảnh báo kiểu loại dữ liệu hoặc sử dụng kiểu `any` tự do.
4. **Kiểm tra nhật ký kiểm toán**: Mọi hành động làm thay đổi dữ liệu phải ghi nhận đầy đủ lịch sử hoạt động vào Audit Log.
5. **Kiểm thử ngắt điện**: Mô-đun khi bị tắt đột ngột từ trang quản trị không được gây ảnh hưởng hay làm sập các hoạt động cốt lõi khác của hệ thống.
