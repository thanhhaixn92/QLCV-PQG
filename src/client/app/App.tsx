import React, { useEffect, useState } from "react";
import { AppShell } from "../shell/AppShell";
import { AppRoutes } from "../routes/AppRoutes";
import { runtimeConfigClient } from "../services/runtimeConfigClient";
import { apiClient } from "../services/apiClient";
import { LoadingState } from "../components/LoadingState";
import { ToggleLeft, ToggleRight, Radio, RefreshCw, Cpu, Activity, History, AlertTriangle } from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  time: string;
  status: "SUCCESS" | "DENIED" | "FAILED";
  reqId: string;
}

export function App() {
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(apiClient.getMockRole());
  const [audits, setAudits] = useState<AuditLogItem[]>([]);

  const loadConfigAndAudits = async (isToggling: boolean = false) => {
    try {
      const config = await runtimeConfigClient.getRuntimeConfig();
      const modulesMap: Record<string, boolean> = {};
      for (const [id, value] of Object.entries(config.modules)) {
        modulesMap[id] = value.state === "enabled";
      }
      setActiveModules(modulesMap);
      setError(null);

      // Append standard dynamic mock audits
      const newAudit: AuditLogItem = {
        id: Math.random().toString(36).substring(7),
        action: isToggling 
          ? "Cập nhật trạng thái mô-đun (POST /api/admin/modules/:id/state)"
          : "Nạp cấu hình động (GET /api/runtime-config)",
        time: "Vừa xong",
        status: "SUCCESS",
        reqId: "req-" + Math.random().toString(36).substring(4)
      };
      setAudits(prev => [newAudit, ...prev].slice(0, 5));
    } catch (error: unknown) {
      setError("Không thể tải cấu hình từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: string) => {
    apiClient.setMockRole(newRole);
    setRole(newRole);
    // Add audit for changing roles
    const auditItem: AuditLogItem = {
      id: Math.random().toString(36).substring(7),
      action: `Thay đổi vai trò giả lập sang: ${newRole.toUpperCase()}`,
      time: "Vừa xong",
      status: "SUCCESS",
      reqId: "req-" + Math.random().toString(36).substring(4)
    };
    setAudits(prev => [auditItem, ...prev].slice(0, 5));
    loadConfigAndAudits(false);
  };

  const toggleModuleState = async (moduleId: string, currentState: boolean) => {
    try {
      setLoading(true);
      const targetState = currentState ? "disabled" : "enabled";
      await apiClient.request(`/api/admin/modules/${moduleId}/state`, {
        method: "PUT",
        body: JSON.stringify({ state: targetState })
      });
      await loadConfigAndAudits(true);
    } catch (error: unknown) {
      // Log failed audit
      const failedAudit: AuditLogItem = {
        id: Math.random().toString(36).substring(7),
        action: `Thất bại đổi trạng thái module: ${moduleId}`,
        time: "Vừa xong",
        status: "DENIED",
        reqId: "req-" + Math.random().toString(36).substring(4)
      };
      setAudits(prev => [failedAudit, ...prev].slice(0, 5));
      const message = error instanceof Error ? error.message : "Không thể thay đổi trạng thái module";
      alert(`Lỗi thực thi từ server: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigAndAudits();
  }, []);

  if (loading && Object.keys(activeModules).length === 0) {
    return <LoadingState message="Đang kết xuất hệ thống lõi..." />;
  }

  const dashboardElement = (
    <div className="space-y-5">
      {/* HEADER BANNER */}
      <div className="bg-[#1E293B] text-white p-5 rounded border border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-[10px] font-bold text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded border border-blue-900/50 uppercase tracking-wider">
            Modular Monolith
          </span>
          <h1 className="text-base font-bold font-sans tracking-tight">Hệ Thống Quản Lý QLCV_PQG Next</h1>
        </div>
        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
          Kiến trúc nguyên khối mô-đun vận hành phân tán. Trạng thái hoạt động, quyền truy xuất dữ liệu và cấu hình AI đều được quyết định tập trung tại máy chủ, bảo vệ nghiêm ngặt ranh giới bảo mật.
        </p>
      </div>

      {/* SYSTEM HEALTH INDICATORS */}
      <section className="bg-white border border-slate-200 rounded shadow-xs p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chỉ số hoạt động thời gian thực</h3>
          <span className="text-[9px] text-slate-400 font-mono">Checked: {new Date().toLocaleTimeString()} UTC</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 border border-slate-100 rounded bg-slate-50">
            <div className="text-[9px] font-bold text-slate-500 mb-0.5 uppercase">BACKEND API</div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-bold text-emerald-600">200 OK</span>
            </div>
          </div>
          <div className="p-3 border border-slate-100 rounded bg-slate-50">
            <div className="text-[9px] font-bold text-slate-500 mb-0.5 uppercase">GEMINI AI GATEWAY</div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-bold text-slate-400">STANDBY</span>
            </div>
          </div>
          <div className="p-3 border border-slate-100 rounded bg-slate-50">
            <div className="text-[9px] font-bold text-slate-500 mb-0.5 uppercase">FIRESTORE LAYER</div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-bold text-blue-600 italic">MOCKED</span>
            </div>
          </div>
          <div className="p-3 border border-slate-100 rounded bg-slate-50">
            <div className="text-[9px] font-bold text-slate-500 mb-0.5 uppercase">AUTH PROVIDER</div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-bold text-emerald-600 uppercase">Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* CONTROL PANEL */}
          <div className="bg-white border border-slate-200 rounded shadow-xs p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="text-blue-600 animate-pulse" size={16} />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Điều khiển Module</h3>
              </div>
              <button
                onClick={() => loadConfigAndAudits(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 transition cursor-pointer"
                title="Tải lại cấu hình"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-3 border border-slate-100 bg-slate-50 rounded gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800 font-mono">tasks-query</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${activeModules["tasks-query"] ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                      {activeModules["tasks-query"] ? "ACTIVE" : "DISABLED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-md leading-relaxed">
                    Module tổng hợp, lọc và truy vấn dữ liệu công việc. Khi bị vô hiệu hóa, mọi truy cập trực tiếp hoặc thông qua API sẽ trả lỗi từ máy chủ.
                  </p>
                </div>

                <button
                  onClick={() => toggleModuleState("tasks-query", !!activeModules["tasks-query"])}
                  className={`flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded border transition cursor-pointer shrink-0 ${
                    role !== "admin"
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      : activeModules["tasks-query"]
                      ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                      : "bg-blue-600 border-blue-700 text-white hover:bg-blue-700"
                  }`}
                  disabled={role !== "admin"}
                >
                  {activeModules["tasks-query"] ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {activeModules["tasks-query"] ? "Tắt mô-đun" : "Bật mô-đun"}
                </button>
              </div>

              {role !== "admin" && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded text-amber-800 text-[11px] leading-relaxed">
                  <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={12} />
                  <span>
                    Yêu cầu vai trò <strong>Admin</strong> để cấu hình trực tiếp. Bạn hiện có vai trò <strong>{role.toUpperCase()}</strong>. Đổi vai trò tại góc trái chân trang điều hướng để thử nghiệm.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* AI AGENT PORTAL */}
          <div className="bg-white border border-slate-200 rounded shadow-xs p-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
              <Cpu className="text-purple-600 animate-pulse" size={16} />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Trợ lý AI Agent (Bản dựng khung)</h3>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 text-slate-800 rounded space-y-1.5">
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Môi trường bảo mật khép kín</p>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Các cổng giao tiếp với mô hình Gemini chạy khép kín phía máy chủ qua <code>AgentGateway</code> và <code>ToolRegistry</code>. Mọi hành vi gọi trực tiếp database đều bị triệt tiêu, bảo vệ ranh giới dữ liệu tuyệt đối.
              </p>
            </div>
          </div>
        </div>

        {/* AUDIT LOGS */}
        <div className="bg-white border border-slate-200 rounded shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
              <History className="text-emerald-600" size={16} />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Nhật ký hoạt động (Audit Logs)</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Nhật ký kiểm toán có cấu trúc ghi nhận liên tục các hành động kèm theo Correlation ID.
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {audits.map(audit => (
                <div key={audit.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded text-[11px] space-y-1 font-mono">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{audit.time}</span>
                    <span className={audit.status === "SUCCESS" ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                      {audit.status}
                    </span>
                  </div>
                  <p className="font-sans font-medium text-slate-800 leading-snug">{audit.action}</p>
                  <p className="text-[9px] text-slate-400 truncate">ReqID: {audit.reqId}</p>
                </div>
              ))}

              {audits.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-6 italic">Chưa có bản ghi hoạt động.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
            <span>Correlation ID Monitor</span>
            <Activity size={12} className="text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      activeModules={activeModules}
      userRole={role}
      onSetRole={handleRoleChange}
    >
      <AppRoutes
        activeModules={activeModules}
        dashboardElement={dashboardElement}
      />
    </AppShell>
  );
}
export default App;
