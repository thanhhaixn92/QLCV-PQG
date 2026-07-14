import { Router, Response, NextFunction } from "express";
import { requireModuleEnabled } from "../../moduleStateService";
import { authenticateRequest } from "../../../auth/authenticateRequest";
import { getTaskQueryRepository } from "../../tasks-query/data/taskQueryRepository";
import { AppRequest } from "../../../auth/authTypes";
import { AppError } from "../../../../shared/errors/appError";
import { logger } from "../../../infrastructure/logging/logger";

export function registerReportingRoutes(router: Router) {
  const reportingRouter = Router();

  reportingRouter.use(requireModuleEnabled("reporting"));
  reportingRouter.use(authenticateRequest);

  // Helper to fetch all tasks accessible under administrative/manager scope
  async function getAllTasksForReporting() {
    const taskRepo = getTaskQueryRepository();
    // Fetch a large page representing current dataset
    const result = await taskRepo.list({ limit: 1000 }, {
      actorUid: "system",
      actorRole: "admin",
      permissions: ["tasks.read", "tasks.manage"]
    });
    return result.items;
  }

  // Helper to map department ID to human readable names
  const DEPT_NAMES: Record<string, string> = {
    "dept-a": "Phòng Kế hoạch & Tài chính",
    "dept-b": "Phòng An ninh mạng & Bảo mật",
    "dept-c": "Phòng Công nghệ Thông tin",
    "dept-cntt": "Trung tâm Hạ tầng CNTT"
  };

  function getDeptName(id: string | null): string {
    if (!id) return "Chưa phân bổ";
    return DEPT_NAMES[id] || id.toUpperCase();
  }

  // 1. Lấy dữ liệu thống kê tổng hợp hiệu suất công việc
  reportingRouter.get("/stats", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const tasks = await getAllTasksForReporting();
      const now = new Date();

      // Thống kê theo trạng thái
      const statusCounts = {
        backlog: 0,
        todo: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      };

      // Thống kê độ ưu tiên
      const priorityCounts = {
        high: 0,
        medium: 0,
        low: 0,
        none: 0
      };

      // Khởi tạo các nhóm thống kê bộ phận và cá nhân
      const deptStats: Record<string, { total: number; completed: number; overdue: number }> = {};
      const assigneeStats: Record<string, { name: string; total: number; completed: number; overdue: number }> = {};

      let totalTasks = 0;
      let completedTasks = 0;
      let overdueTasks = 0;

      for (const t of tasks) {
        totalTasks++;
        
        // 1. Trạng thái
        if (t.status in statusCounts) {
          statusCounts[t.status]++;
        }
        if (t.status === "completed") {
          completedTasks++;
        }

        // 2. Độ ưu tiên
        if (t.priority) {
          if (t.priority in priorityCounts) {
            priorityCounts[t.priority]++;
          }
        } else {
          priorityCounts.none++;
        }

        // 3. Quá hạn (Overdue)
        const isOverdue = t.dueAt && new Date(t.dueAt) < now && t.status !== "completed" && t.status !== "cancelled";
        if (isOverdue) {
          overdueTasks++;
        }

        // 4. Bộ phận
        const deptId = t.departmentId || "unassigned";
        if (!deptStats[deptId]) {
          deptStats[deptId] = { total: 0, completed: 0, overdue: 0 };
        }
        deptStats[deptId].total++;
        if (t.status === "completed") deptStats[deptId].completed++;
        if (isOverdue) deptStats[deptId].overdue++;

        // 5. Người thực hiện
        const assigneeUid = t.assignee?.uid || "unassigned";
        const assigneeName = t.assignee?.displayName || "Chưa phân công";
        if (!assigneeStats[assigneeUid]) {
          assigneeStats[assigneeUid] = { name: assigneeName, total: 0, completed: 0, overdue: 0 };
        }
        assigneeStats[assigneeUid].total++;
        if (t.status === "completed") assigneeStats[assigneeUid].completed++;
        if (isOverdue) assigneeStats[assigneeUid].overdue++;
      }

      // Format dữ liệu bộ phận
      const departmentData = Object.entries(deptStats).map(([id, stat]) => ({
        id,
        name: getDeptName(id === "unassigned" ? null : id),
        total: stat.total,
        completed: stat.completed,
        overdue: stat.overdue,
        completionRate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
      }));

      // Format dữ liệu cá nhân
      const assigneeData = Object.entries(assigneeStats).map(([uid, stat]) => ({
        uid,
        name: stat.name,
        total: stat.total,
        completed: stat.completed,
        overdue: stat.overdue,
        completionRate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
      })).sort((a, b) => b.total - a.total);

      res.json({
        success: true,
        data: {
          summary: {
            total: totalTasks,
            completed: completedTasks,
            overdue: overdueTasks,
            inProgress: statusCounts.in_progress,
            todo: statusCounts.todo,
            backlog: statusCounts.backlog,
            cancelled: statusCounts.cancelled,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          },
          statusCounts,
          priorityCounts,
          departments: departmentData,
          assignees: assigneeData
        },
        requestId: req.requestId
      });
    } catch (err) {
      next(err);
    }
  });

  // 2. Xuất báo cáo sang định dạng Excel (CSV hỗ trợ UTF-8 BOM)
  reportingRouter.get("/export/excel", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const tasks = await getAllTasksForReporting();

      // Định nghĩa tiêu đề cột Excel
      const headers = [
        "Mã Công Việc",
        "Tiêu Đề",
        "Trạng Thái",
        "Độ Ưu Tiên",
        "Bộ Phận",
        "Người Thực Hiện",
        "Người Tạo",
        "Hạn Hoàn Thành",
        "Ngày Tạo"
      ];

      // Chuyển đổi dữ liệu sang dòng CSV
      const rows = tasks.map((t) => {
        const dueStr = t.dueAt ? new Date(t.dueAt).toLocaleString("vi-VN") : "Không có";
        const createdStr = t.createdAt ? new Date(t.createdAt).toLocaleString("vi-VN") : "Không có";
        
        return [
          t.id,
          t.title.replace(/"/g, '""'), // Escape double quotes
          t.status.toUpperCase(),
          (t.priority || "LOW").toUpperCase(),
          getDeptName(t.departmentId),
          t.assignee?.displayName || "Chưa phân công",
          t.creator?.displayName || "Hệ thống",
          dueStr,
          createdStr
        ].map(val => `"${val}"`).join(",");
      });

      // Tạo nội dung CSV kèm Byte Order Mark (BOM) để Microsoft Excel đọc đúng ký tự Tiếng Việt (UTF-8)
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=QLCV_BaoCaoCongViec_${Date.now()}.csv`);
      res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  });

  // 3. Xuất báo cáo sang định dạng PDF (Bản in HTML chuyên nghiệp có thể xuất PDF từ trình duyệt)
  reportingRouter.get("/export/pdf", async (req: AppRequest, res: Response, next: NextFunction) => {
    try {
      const tasks = await getAllTasksForReporting();
      const now = new Date();

      // Tính toán nhanh số liệu
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === "completed").length;
      const overdue = tasks.filter(t => t.dueAt && new Date(t.dueAt) < now && t.status !== "completed" && t.status !== "cancelled").length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const rowsHtml = tasks.map((t, index) => {
        const isOverdue = t.dueAt && new Date(t.dueAt) < now && t.status !== "completed" && t.status !== "cancelled";
        const statusColors: Record<string, string> = {
          completed: "color: #16a34a; font-weight: bold;",
          in_progress: "color: #2563eb;",
          todo: "color: #4b5563;",
          backlog: "color: #9ca3af;",
          cancelled: "color: #dc2626;"
        };

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; text-align: center;">${index + 1}</td>
            <td style="padding: 10px; font-family: monospace;">${t.id}</td>
            <td style="padding: 10px;">${t.title}</td>
            <td style="padding: 10px; ${statusColors[t.status] || ""}">${t.status.toUpperCase()}</td>
            <td style="padding: 10px; font-weight: ${t.priority === "high" ? "bold" : "normal"};">${(t.priority || "low").toUpperCase()}</td>
            <td style="padding: 10px;">${t.assignee?.displayName || "Chưa phân công"}</td>
            <td style="padding: 10px; ${isOverdue ? "color: red; font-weight: bold;" : ""}">${t.dueAt ? new Date(t.dueAt).toLocaleDateString("vi-VN") : "Không có"}</td>
          </tr>
        `;
      }).join("");

      // Trang HTML hoàn chỉnh dạng báo cáo văn phòng mẫu mực
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Báo cáo hiệu suất công việc QLCV_PQG</title>
          <style>
            body { font-family: "DejaVu Sans", "Segoe UI", sans-serif; color: #1e293b; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 20px; font-weight: bold; uppercase; margin-bottom: 5px; color: #1e3a8a; }
            .subtitle { font-size: 12px; color: #64748b; font-style: italic; }
            .grid { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px; }
            .card { border: 1px solid #cbd5e1; border-radius: 4px; padding: 15px; flex: 1; text-align: center; background-color: #f8fafc; }
            .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 5px; font-weight: bold; }
            .card-value { font-size: 18px; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background-color: #0f172a; color: white; padding: 12px; text-align: left; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; }
            .signature { width: 200px; text-align: center; }
            @media print {
              .print-btn { display: none; }
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;" class="print-btn">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #2563eb; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
              🖨️ In / Lưu PDF từ trình duyệt
            </button>
          </div>

          <div class="header">
            <div class="title">BÁO CÁO THỐNG KÊ HIỆU SUẤT CÔNG VIỆC</div>
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 5px;">HỆ THỐNG QUẢN LÝ QUY TRÌNH QLCV_PQG NEXT</div>
            <div class="subtitle">Xuất ngày: ${now.toLocaleString("vi-VN")} | Correlation ID: ${req.requestId || "N/A"}</div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Tổng công việc</div>
              <div class="card-value">${total}</div>
            </div>
            <div class="card">
              <div class="card-title">Đã hoàn thành</div>
              <div class="card-value" style="color: #16a34a;">${completed}</div>
            </div>
            <div class="card">
              <div class="card-title">Quá hạn cảnh báo</div>
              <div class="card-value" style="color: #dc2626;">${overdue}</div>
            </div>
            <div class="card">
              <div class="card-title">Tỷ lệ hoàn thành</div>
              <div class="card-value" style="color: #2563eb;">${rate}%</div>
            </div>
          </div>

          <h3 style="font-size: 13px; margin-bottom: 10px; color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">
            DANH SÁCH CHI TIẾT CÔNG VIỆC TRÊN HỆ THỐNG
          </h3>

          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">STT</th>
                <th style="width: 10%;">Mã CV</th>
                <th style="width: 35%;">Tiêu Đề Công Việc</th>
                <th style="width: 15%;">Trạng Thái</th>
                <th style="width: 10%;">Độ Ưu Tiên</th>
                <th style="width: 15%;">Người Chịu Trách Nhiệm</th>
                <th style="width: 10%;">Hạn Chót</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <div class="signature">
              <p style="margin-bottom: 60px;"><strong>NGƯỜI LẬP BIỂU</strong></p>
              <p style="text-decoration: underline; font-weight: bold;">${req.user?.displayName || "Hệ thống"}</p>
            </div>
            <div class="signature">
              <p style="margin-bottom: 60px;"><strong>BAN GIÁM ĐỐC PHÊ DUYỆT</strong></p>
              <p style="text-decoration: underline; font-weight: bold;">ĐÃ DUYỆT ĐIỆN TỬ</p>
            </div>
          </div>
        </body>
        </html>
      `;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(htmlContent);
    } catch (err) {
      next(err);
    }
  });

  router.use("/reports", reportingRouter);
}

export default registerReportingRoutes;
