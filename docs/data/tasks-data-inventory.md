# Tasks Data Inventory (QLCV_PQG Next)

Tài liệu này kiểm kê và phân loại các trường dữ liệu của đối tượng công việc (Tasks), đồng thời ghi nhận kết quả xác minh tích hợp thành công với Firestore thực tế trong Milestone G5.

## 1. Trạng thái Collection Nguồn & Kết Quả Xác Minh (G5 Verified)
*   **Tên Collection Nguồn:** `tasks` (Cấu hình qua `TASKS_COLLECTION`).
*   **Trạng thái Xác minh:** **ĐÃ XÁC MINH THÀNH CÔNG (G5 Verified)**.
*   **Môi trường thực tế:**
    *   Firestore Database ID: `(default)` (Cấu hình qua `FIREBASE_DATABASE_ID`).
    *   Timestamp Mode: `firestore` (Cấu hình qua `TASKS_TIMESTAMP_MODE`).
    *   Dữ liệu mẫu (Seed Document): Mã định danh `Yo0XhjSwLwsPeSO8JdBe` được tạo bằng `scripts/seedTask.ts` với khóa chống trùng lặp `seedKey: "initial-test-task"`.
*   **Giải pháp kết nối an toàn:** 
    *   Hệ thống hỗ trợ lựa chọn nguồn dữ liệu tường minh thông qua biến `TASKS_QUERY_SOURCE` (`firestore` hoặc `fixture`).
    *   Mặc định trong môi trường production luôn tự động chọn `firestore` (nếu thiếu cấu hình sẽ ném lỗi `DEPENDENCY_UNAVAILABLE` thay vì fallback âm thầm).
    *   Trong môi trường test, hệ thống cô lập triệt để và sử dụng `fixture` để bảo vệ an toàn cho Firestore thật.

---

## 2. Phân loại Trường Dữ liệu (Field Classification)

### A. Nhóm Xác nhận (Confirmed)
Các trường bắt buộc phải có để hiển thị cơ bản, khớp trực tiếp với API Contract:
*   `id` (string): Mã định danh duy nhất của công việc.
*   `title` (string): Tiêu đề công việc.
*   `status` (string): Trạng thái công việc (`"todo" | "in_progress" | "completed" | "backlog"`).
*   `priority` (string/null): Độ ưu tiên (`"low" | "medium" | "high" | null`).

### B. Nhóm Hỗ trợ Cấu Trúc Đa Dạng (Flexible Document Schema)
Trình biên dịch (Mapper) được thiết kế tương thích ngược hoàn hảo cả cấu trúc phẳng (flat) từ hệ thống cũ lẫn cấu trúc lồng nhau (nested) hiện đại:
*   **Cấu trúc lồng nhau (Nested):**
    *   `assignee.uid`, `assignee.displayName`
    *   `creator.uid`, `creator.displayName`
*   **Cấu trúc phẳng (Flat - Legacy):**
    *   `assigneeUid`, `assigneeName` -> Tự động ánh xạ về `assignee.uid`, `assignee.displayName`.
    *   `creatorUid`, `creatorName` -> Tự động ánh xạ về `creator.uid`, `creator.displayName`.
*   **Hạn chót & Thời gian:**
    *   `dueAt`, `createdAt`, `updatedAt` tự động chuyển đổi an toàn từ Firestore `Timestamp` hoặc chuỗi `ISO string` thành định dạng chuỗi chuẩn ISO 8601 UTC.

### C. Nhóm Phục vụ Đồng bộ / Vận hành Nội bộ
*   `seedKey` (string): Dùng để nhận diện bản ghi mẫu và tránh tạo trùng lắp dữ liệu khi seed. Trường này được mapper cô lập hoàn toàn và **bảo đảm không bao giờ bị trả ra qua các API công khai**.

---

## 3. Chính sách Bảo mật & Ràng buộc RBAC
Hệ thống kiểm soát truy cập trực tiếp từ máy chủ (Server-side RBAC/RLS) thông qua phân quyền của Firebase Auth token:
1.  **Quyền Quản trị (`admin` / `tasks.manage`):** Cho phép truy cập toàn bộ danh sách công việc mà không bị giới hạn phòng ban hay chủ sở hữu.
2.  **Quyền Phòng ban (`tasks.department`):** Giới hạn chỉ hiển thị các công việc thuộc phòng ban được ủy quyền trong thuộc tính `departmentIds`. Truy cập phòng ban trái phép sẽ bị chặn ngay lập tức và trả về lỗi `PERMISSION_DENIED`.
3.  **Quyền Người dùng cá nhân (`tasks.read`):** Chỉ hiển thị các công việc do chính người dùng đó tạo (`creator.uid`) hoặc được giao (`assignee.uid`). Mọi hành vi cố tình truy vấn UID khác qua query parameters sẽ bị máy chủ chặn bằng lỗi `PERMISSION_DENIED`.

---

## 4. Kiểm soát An toàn Thông tin Lỗi (Technical Leak Protection)
*   Khi xảy ra lỗi thiếu composite index trong Firestore (Error Code 9 - `FAILED_PRECONDITION`), máy chủ sẽ ghi nhận URL tạo chỉ mục vào nhật ký audit nội bộ (chỉ dành cho Sysadmin điều hành), đồng thời ẩn thông tin nhạy cảm này trước client bằng cách biến đổi lỗi thành thông điệp chung: *"Truy vấn công việc hiện chưa được hệ thống hỗ trợ đầy đủ."* dưới mã lỗi `DEPENDENCY_UNAVAILABLE`.

