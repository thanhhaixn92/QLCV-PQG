import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  TrendingUp, 
  CheckSquare, 
  AlertTriangle, 
  BarChart3, 
  Users, 
  Building2, 
  TrendingDown,
  Loader2,
  PieChart,
  Award,
  ArrowUpRight
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { tokenService } from "../../infrastructure/firebase/tokenService";

interface SummaryData {
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  todo: number;
  backlog: number;
  cancelled: number;
  completionRate: number;
}

interface DeptStat {
  id: string;
  name: string;
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

interface AssigneeStat {
  uid: string;
  name: string;
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

interface StatsPayload {
  summary: SummaryData;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  departments: DeptStat[];
  assignees: AssigneeStat[];
}

export function ReportingModuleView() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.request<{ success: boolean; data: StatsPayload }>("/api/reports/stats");
      if (res && res.success) {
        setStats(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải báo cáo thống kê.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      setError(null);
      const authHeaders = await tokenService.getAuthorizationHeaders();
      const res = await fetch("/api/reports/export/excel", {
        headers: {
          ...authHeaders,
        }
      });
      if (!res.ok) {
        throw new Error("Tải dữ liệu báo cáo từ máy chủ thất bại.");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QLCV_BaoCaoHieuSuat_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess("Xuất dữ liệu thống kê Excel (.CSV) thành công!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Xuất dữ liệu Excel thất bại.");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      setError(null);
      const authHeaders = await tokenService.getAuthorizationHeaders();
      const res = await fetch("/api/reports/export/pdf", {
        headers: {
          ...authHeaders,
        }
      });
      if (!res.ok) {
        throw new Error("Không thể khởi tạo bản in PDF từ máy chủ.");
      }
      
      const htmlText = await res.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlText);
        printWindow.document.close();
        
        // Let it render completely and call print
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        throw new Error("Popup đã bị trình duyệt chặn. Vui lòng bật popup để in báo cáo.");
      }

      setSuccess("Bản in PDF chuyên nghiệp đã được chuẩn bị.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Tạo bản in PDF thất bại.");
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3 bg-white border border-slate-200 rounded shadow-xs max-w-5xl mx-auto">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Đang tổng hợp dữ liệu thống kê thời gian thực...</span>
      </div>
    );
  }

  const s = stats?.summary;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* HEADER SECTION */}
      <div className="bg-white border border-slate-200 rounded p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3.5 mb-1">
            <div className="p-2 bg-blue-500 rounded text-white shadow-xs">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans tracking-tight">Thống kê & Báo cáo Hiệu suất</h2>
              <p className="text-xs text-slate-400">Tổng hợp hiệu năng công việc theo phòng ban, thành viên và độ ưu tiên</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || !stats}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold px-4 py-2 rounded shadow-xs cursor-pointer transition"
          >
            {exportingExcel ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
            Xuất Excel (.csv)
          </button>
          
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || !stats}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold px-4 py-2 rounded shadow-xs cursor-pointer transition"
          >
            {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Xuất PDF / In ấn
          </button>

          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer border border-slate-200"
            title="Tải lại thống kê"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded flex items-start gap-2.5 text-red-800 text-xs">
          <AlertTriangle className="shrink-0 text-red-600" size={14} />
          <div className="font-sans font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded flex items-start gap-2.5 text-emerald-800 text-xs">
          <CheckSquare className="shrink-0 text-emerald-600" size={14} />
          <div className="font-sans font-medium">{success}</div>
        </div>
      )}

      {s && (
        <>
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded shadow-xs p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Tổng số công việc</span>
                <p className="text-2xl font-bold font-sans text-slate-800 tracking-tight mt-1">{s.total}</p>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-3 flex items-center gap-1 border-t border-slate-50 pt-2">
                <ArrowUpRight size={12} className="text-blue-500" /> Đã phân cấp hệ thống
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded shadow-xs p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Hoàn thành</span>
                <p className="text-2xl font-bold font-sans text-emerald-600 tracking-tight mt-1">{s.completed}</p>
              </div>
              <div className="text-[10px] text-emerald-600 font-mono mt-3 flex items-center gap-1 border-t border-slate-50 pt-2">
                <Award size={12} className="text-emerald-500" /> Tỷ lệ: {s.completionRate}%
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded shadow-xs p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Đang thực hiện / Chưa làm</span>
                <p className="text-2xl font-bold font-sans text-blue-600 tracking-tight mt-1">{s.inProgress + s.todo + s.backlog}</p>
              </div>
              <div className="text-[10px] text-blue-500 font-mono mt-3 flex items-center gap-1 border-t border-slate-50 pt-2">
                <TrendingUp size={12} /> Đang hoạt động
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded shadow-xs p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Việc quá hạn</span>
                <p className="text-2xl font-bold font-sans text-red-600 tracking-tight mt-1">{s.overdue}</p>
              </div>
              <div className={`text-[10px] font-mono mt-3 flex items-center gap-1 border-t border-slate-50 pt-2 ${s.overdue > 0 ? "text-red-500 font-bold" : "text-emerald-600"}`}>
                {s.overdue > 0 ? <AlertTriangle size={12} /> : <CheckSquare size={12} />}
                {s.overdue > 0 ? "Yêu cầu xử lý gấp" : "Hệ thống an toàn"}
              </div>
            </div>
          </div>

          {/* CHARTS / VISUAL DISTRIBUTION BAR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white border border-slate-200 rounded shadow-xs p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <PieChart size={15} className="text-blue-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Phân bố trạng thái công việc</h3>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Hoàn thành", count: s.completed, color: "bg-emerald-500", rawLabel: "completed" },
                  { label: "Đang thực hiện", count: s.inProgress, color: "bg-blue-500", rawLabel: "in_progress" },
                  { label: "Cần làm", count: s.todo, color: "bg-amber-500", rawLabel: "todo" },
                  { label: "Tồn đọng (Backlog)", count: s.backlog, color: "bg-slate-400", rawLabel: "backlog" },
                  { label: "Hủy bỏ", count: s.cancelled, color: "bg-red-400", rawLabel: "cancelled" }
                ].map((item) => {
                  const percent = s.total > 0 ? Math.round((item.count / s.total) * 100) : 0;
                  return (
                    <div key={item.rawLabel} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="text-slate-800 font-mono font-bold">{item.count} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="bg-white border border-slate-200 rounded shadow-xs p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <AlertTriangle size={15} className="text-amber-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Phân bố mức độ ưu tiên</h3>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Cao (High)", count: stats.priorityCounts.high, color: "bg-red-500", rawLabel: "high" },
                  { label: "Trung bình (Medium)", count: stats.priorityCounts.medium, color: "bg-amber-500", rawLabel: "medium" },
                  { label: "Thấp (Low)", count: stats.priorityCounts.low, color: "bg-blue-500", rawLabel: "low" },
                  { label: "Không thiết lập (None)", count: stats.priorityCounts.none, color: "bg-slate-400", rawLabel: "none" }
                ].map((item) => {
                  const percent = s.total > 0 ? Math.round((item.count / s.total) * 100) : 0;
                  return (
                    <div key={item.rawLabel} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="text-slate-800 font-mono font-bold">{item.count} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DEPARTMENT-WISE PERFORMANCE */}
          <div className="bg-white border border-slate-200 rounded shadow-xs p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 size={15} className="text-blue-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Hiệu suất theo Phòng ban / Bộ phận</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    <th className="py-2.5 px-3">Tên bộ phận</th>
                    <th className="py-2.5 px-3 text-center">Tổng công việc</th>
                    <th className="py-2.5 px-3 text-center">Hoàn thành</th>
                    <th className="py-2.5 px-3 text-center">Quá hạn</th>
                    <th className="py-2.5 px-3 text-right">Tỷ lệ hoàn thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {stats.departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-3 font-medium text-slate-700">{dept.name}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">{dept.total}</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-600">{dept.completed}</td>
                      <td className={`py-3 px-3 text-center font-mono ${dept.overdue > 0 ? "text-red-500 font-bold" : "text-slate-400"}`}>{dept.overdue}</td>
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${dept.completionRate}%` }}></div>
                          </div>
                          <span className="font-bold text-slate-800">{dept.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {stats.departments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic font-sans">
                        Không tìm thấy thông tin công việc theo phòng ban.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MEMBER-WISE PERFORMANCE */}
          <div className="bg-white border border-slate-200 rounded shadow-xs p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Users size={15} className="text-purple-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Hiệu suất và tải làm việc của Nhân sự</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3 text-center">Tải công việc</th>
                    <th className="py-2.5 px-3 text-center">Đã làm xong</th>
                    <th className="py-2.5 px-3 text-center">Quá hạn</th>
                    <th className="py-2.5 px-3 text-right">Tỷ lệ hoàn thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {stats.assignees.map((as) => (
                    <tr key={as.uid} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-3 font-medium text-slate-700">{as.name}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">{as.total}</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-600">{as.completed}</td>
                      <td className={`py-3 px-3 text-center font-mono ${as.overdue > 0 ? "text-red-500 font-bold" : "text-slate-400"}`}>{as.overdue}</td>
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${as.completionRate}%` }}></div>
                          </div>
                          <span className="font-bold text-slate-800">{as.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {stats.assignees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic font-sans">
                        Không tìm thấy thông tin công việc theo người thực hiện.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportingModuleView;
