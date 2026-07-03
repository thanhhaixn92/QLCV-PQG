# Tasks Data Inventory (QLCV_PQG Next)

Tài liệu này kiểm kê và phân loại các trường dữ liệu của đối tượng công việc (Tasks) từ hệ thống cũ, làm cơ sở xây dựng Adapter cho mô-đun `tasks-query` độc lập và an toàn.

## 1. Trạng thái Collection Nguồn
*   **Tên Collection Dự kiến (Inferred):** `tasks`
*   **Kiểm chứng:** Chưa được xác thực 100% từ cơ sở dữ liệu thật của dự án sản xuất.
*   **Giải pháp an toàn (G4):** Không hardcode tên collection. Bắt buộc cấu hình qua biến môi trường `TASKS_COLLECTION`. Nếu thiếu cấu hình này trong môi trường Production, hệ thống sẽ rơi vào trạng thái lỗi `DEPENDENCY_UNAVAILABLE` thay vì tự ý kết nối bừa bãi.

---

## 2. Phân loại Trường Dữ liệu (Field Classification)

### A. Nhóm Xác nhận (Confirmed)
Các trường bắt buộc phải có để hiển thị cơ bản, khớp trực tiếp với API Contract:
*   `id` (string): Mã định danh duy nhất của công việc.
*   `title` (string): Tiêu đề công việc.

### B. Nhóm Suy luận (Inferred)
Các trường suy luận dựa trên cấu trúc nghiệp vụ của hệ thống quản lý công việc và yêu cầu phân trang/lọc:
*   `status` (string): Trạng thái công việc. Giá trị nghiệp vụ cũ có thể là `"completed"`, `"pending"`, `"todo"`, `"in_progress"`. Sẽ được ánh xạ về `TaskStatus` tiêu chuẩn (`"todo" | "in_progress" | "completed" | "backlog"`).
*   `priority` (string/null): Độ ưu tiên (`"low" | "medium" | "high" | null`).
*   `assigneeUid` (string/null): UID người nhận việc.
*   `assigneeName` (string/null): Tên hiển thị của người nhận việc (dùng để điền thông tin `assignee.displayName`).
*   `creatorUid` (string/null): UID người tạo công việc.
*   `creatorName` (string/null): Tên hiển thị của người tạo công việc (dùng để điền thông tin `creator.displayName`).
*   `departmentId` (string/null): Mã đơn vị/phòng ban sở hữu công việc.
*   `dueAt` (Timestamp/string/null): Hạn chót công việc.
*   `createdAt` (Timestamp/string/null): Thời điểm tạo.
*   `updatedAt` (Timestamp/string/null): Thời điểm cập nhật cuối cùng.

### C. Nhóm Chưa rõ (Unknown)
*   Cấu trúc phân cấp cụ thể của sub-tasks (nếu có).
*   Các trường liên quan tới tệp đính kèm (`attachments`) và bình luận (`comments`).

### D. Nhóm Kế thừa / Khuyên bỏ (Legacy / Deprecated)
*   `assignee` (string) dạng plain-text: Phiên bản cũ chỉ lưu tên assignee kiểu chuỗi đơn giản (`assignee: "Principal Architect"`). Nên chuyển sang cấu trúc object `assignee: { uid, displayName }`.
*   `isCompleted` (boolean): Tránh sử dụng boolean đơn lẻ cho trạng thái; thay bằng trường `status` đa trạng thái.

---

## 3. Rào cản Kỹ thuật và Giả định Chặn (Blocking Assumptions)
1.  **Chế độ mặc định trong CI/Test:** Do chưa có kết nối Firestore thật trong quá trình kiểm thử CI, toàn bộ các ca kiểm thử và chế độ chạy phát triển local khi chưa có cấu hình sẽ sử dụng `FixtureTaskQueryRepository` (source = `fixture`).
2.  **Kích hoạt Firestore:** Chỉ kích hoạt `FirestoreTaskQueryRepository` khi có đầy đủ:
    *   Firebase Admin khởi tạo thành công (`ready` hoặc `initialized`).
    *   Biến môi trường `TASKS_COLLECTION` được khai báo rõ ràng.
