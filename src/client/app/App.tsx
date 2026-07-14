import React, { useEffect, useState } from "react";
import { AppShell } from "../shell/AppShell";
import { AppRoutes } from "../routes/AppRoutes";
import { runtimeConfigClient } from "../services/runtimeConfigClient";
import { apiClient } from "../services/apiClient";
import { LoadingState } from "../components/LoadingState";
import { 
  ToggleLeft, ToggleRight, Radio, RefreshCw, Cpu, Activity, History, 
  AlertTriangle, X, Copy, ShieldAlert, Lock, ShieldCheck, CheckCircle2,
  Server, User, Terminal
} from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  time: string;
  status: "SUCCESS" | "DENIED" | "FAILED";
  reqId: string;
  actor?: string;
  reason?: string;
  metadata?: any;
  timestamp?: string;
}

export function App() {
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(apiClient.getMockRole());
  const [audits, setAudits] = useState<AuditLogItem[]>([]);
  const [isMockAllowedOnServer, setIsMockAllowedOnServer] = useState(true);
  
  // Interactive audit details modal
  const [selectedAudit, setSelectedAudit] = useState<AuditLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadConfigAndAudits = async (isToggling: boolean = false) => {
    try {
      const config = await runtimeConfigClient.getRuntimeConfig();
      const mockAllowed = config.allowMockAuth === true;
      setIsMockAllowedOnServer(mockAllowed);

      const modulesMap: Record<string, boolean> = {};
      for (const [id, value] of Object.entries(config.modules)) {
        modulesMap[id] = value.state === "enabled";
      }
      setActiveModules(modulesMap);
      setError(null);

      // Fetch real audits if role has permission and mock auth is allowed on server
      const currentRole = apiClient.getMockRole();
      if (currentRole === "admin" && mockAllowed) {
        try {
          const res = await apiClient.request<{ data: any[] }>("/api/admin/audits");
          if (res && res.data) {
            const mapped: AuditLogItem[] = res.data.map((log: any) => ({
              id: log.id,
              action: log.action,
              time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Vừa xong",
              status: log.result === "success" ? "SUCCESS" : log.result === "denied" ? "DENIED" : "FAILED",
              reqId: log.requestId,
              actor: `${log.actor?.type || "user"}:${log.actor?.id || "system"}`,
              reason: log.reason,
              metadata: log.metadata,
              timestamp: log.timestamp
            }));
            setAudits(mapped);
          }
        } catch (err) {
          console.error("Failed to load real server audits:", err);
        }
      } else {
        // Fallback or non-admin mode: construct a contextual notice audit and limit items to local actions
        const localAudit: AuditLogItem = {
          id: `mock-${Math.random().toString(36).substring(7)}`,
          action: isToggling 
            ? "Cập nhật trạng thái mô-đun (POST /api/admin/modules/:id/state)"
            : "Nạp cấu hình động (GET /api/runtime-config)",
          time: "Vừa xong",
          status: "SUCCESS",
          reqId: "req-" + Math.random().toString(36).substring(4),
          actor: `mock:${currentRole}`
        };
        setAudits(prev => {
          const filtered = prev.filter(a => a.id.startsWith("mock-"));
          return [localAudit, ...filtered].slice(0, 8);
        });
      }
    } catch (error: unknown) {
      setError("Không thể tải cấu hình từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: string) => {
    apiClient.setMockRole(newRole);
    setRole(newRole);
    
    // Log role transition locally
    const auditItem: AuditLogItem = {
      id: `mock-${Math.random().toString(36).substring(7)}`,
      action: `Thay đổi vai trò giả lập sang: ${newRole.toUpperCase()}`,
      time: "Vừa xong",
      status: "SUCCESS",
      reqId: "req-" + Math.random().toString(36).substring(4),
      actor: `mock:${newRole}`
    };
    setAudits(prev => [auditItem, ...prev].slice(0, 8));
    loadConfigAndAudits(false);
  };

  const toggleModuleState = async (moduleId: string, currentState: boolean) => {
    if (!isMockAllowedOnServer) {
      alert("Lỗi thực thi từ server: Môi trường này yêu cầu xác thực bằng tài khoản thực, không chấp nhận tài khoản giả lập.");
      return;
    }
    try {
      setLoading(true);
      const targetState = currentState ? "disabled" : "enabled";
      await apiClient.request(`/api/admin/modules/${moduleId}/state`, {
        method: "PUT",
        body: JSON.stringify({ state: targetState })
      });
      await loadConfigAndAudits(true);
    } catch (error: unknown) {
      // Log failed audit locally
      const failedAudit: AuditLogItem = {
        id: `mock-${Math.random().toString(36).substring(7)}`,
        action: `Thất bại đổi trạng thái module: ${moduleId}`,
        time: "Vừa xong",
        status: "DENIED",
        reqId: "req-" + Math.random().toString(36).substring(4),
        actor: `mock:${role}`,
        reason: error instanceof Error ? error.message : "Quyền truy cập bị từ chối."
      };
      setAudits(prev => [failedAudit, ...prev].slice(0, 8));
      const message = error instanceof Error ? error.message : "Không thể thay đổi trạng thái module";
      alert(`Lỗi thực thi từ server: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    loadConfigAndAudits();
    const interval = setInterval(() => {
      loadConfigAndAudits();
    }, 4000);
    return () => clearInterval(interval);
  }, [role]);

  if (loading && Object.keys(activeModules).length === 0) {
    return <LoadingState message="Đang kết xuất hệ thống lõi..." />;
  }

  const dashboardElement = (
    <div className="space-y-5">
      {/* HEADER BANNER */}
      <div className="bg-[#1E293B] text-white p-5 rounded border border-slate-700 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[10px] font-bold text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded border border-blue-900/50 uppercase tracking-wider font-mono">
              Modular Monolith
            </span>
            <h1 className="text-base font-bold font-sans tracking-tight">Hệ Thống Quản Lý QLCV_PQG Next</h1>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Kiến trúc nguyên khối mô-đun vận hành phân tách. Trạng thái hoạt động, quyền truy xuất dữ liệu và cấu hình AI đều được quyết định tập trung tại máy chủ, bảo vệ nghiêm ngặt ranh giới bảo mật.
          </p>
        </div>
      </div>

      {/* SYSTEM HEALTH INDICATORS */}
      <section className="bg-white border border-slate-200 rounded shadow-xs p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Chỉ số hoạt động thời gian thực</h3>
          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
            <RefreshCw size={10} className="animate-spin text-slate-400" />
            Tự động cập nhật: {new Date().toLocaleTimeString()}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 border border-slate-100 rounded bg-slate-50 flex flex-col justify-between">
            <div className="text-[9px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider font-mono">BACKEND API</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Server size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-emerald-600">200 OK</span>
            </div>
          </div>
          <div className="p-3 border border-slate-100 rounded bg-slate-50 flex flex-col justify-between">
            <div className="text-[9px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider font-mono">GEMINI AI GATEWAY</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Cpu size={14} className="text-slate-400" />
              <span className="text-xs font-mono font-bold text-slate-500">STANDBY</span>
            </div>
          </div>
          <div className="p-3 border border-slate-100 rounded bg-slate-50 flex flex-col justify-between">
            <div className="text-[9px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider font-mono">FIRESTORE LAYER</div>
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldCheck size={14} className="text-blue-500" />
              <span className="text-xs font-mono font-bold text-blue-600">CONNECTED</span>
            </div>
          </div>
          <div className="p-3 border border-slate-100 rounded bg-slate-50 flex flex-col justify-between">
            <div className="text-[9px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider font-mono">ACTIVE ROLE</div>
            <div className="flex items-center gap-1.5 mt-1">
              <User size={14} className="text-purple-500" />
              <span className="text-xs font-mono font-bold text-purple-600 uppercase">{role}</span>
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
                className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition cursor-pointer"
                title="Tải lại cấu hình"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {/* tasks-query module */}
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
                  className={`flex items-center justify-center gap-1 w-full md:w-auto px-4 py-2 md:px-3 md:py-1.5 text-[11px] font-bold rounded border transition cursor-pointer shrink-0 ${
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

              {/* tasks-command module */}
              <div className="flex flex-col md:flex-row md:items-center justify-between p-3 border border-slate-100 bg-slate-50 rounded gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800 font-mono">tasks-command</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${activeModules["tasks-command"] ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                      {activeModules["tasks-command"] ? "ACTIVE" : "DISABLED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-md leading-relaxed">
                    Module xử lý luồng ghi công việc (Command path). Chịu trách nhiệm tạo mới, cập nhật, phân công, chuyển trạng thái và lưu trữ công việc (OCC, Audit logs).
                  </p>
                </div>

                <button
                  onClick={() => toggleModuleState("tasks-command", !!activeModules["tasks-command"])}
                  className={`flex items-center justify-center gap-1 w-full md:w-auto px-4 py-2 md:px-3 md:py-1.5 text-[11px] font-bold rounded border transition cursor-pointer shrink-0 ${
                    role !== "admin"
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      : activeModules["tasks-command"]
                      ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                      : "bg-blue-600 border-blue-700 text-white hover:bg-blue-700"
                  }`}
                  disabled={role !== "admin"}
                >
                  {activeModules["tasks-command"] ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {activeModules["tasks-command"] ? "Tắt mô-đun" : "Bật mô-đun"}
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
        <div className="bg-white border border-slate-200 rounded shadow-xs p-4 flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
              <History className="text-emerald-600" size={16} />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Nhật ký hệ thống (Audit Logs)</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              {role === "admin" 
                ? "Nhật ký kiểm toán thời gian thực từ máy chủ. Bấm vào một bản ghi để kiểm tra metadata chi tiết."
                : "Nhật ký hoạt động cục bộ. Đổi vai trò sang ADMIN để xem và kiểm tra dữ liệu thật từ máy chủ."}
            </p>

            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {audits.map(audit => (
                <div 
                  key={audit.id} 
                  onClick={() => setSelectedAudit(audit)}
                  className="p-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100/70 hover:border-slate-200 rounded text-[11px] space-y-1 font-mono cursor-pointer transition"
                  title="Bấm để xem chi tiết"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">{audit.time}</span>
                    <span className={audit.status === "SUCCESS" ? "text-emerald-600 font-bold" : audit.status === "DENIED" ? "text-amber-600 font-bold" : "text-red-600 font-bold"}>
                      {audit.status}
                    </span>
                  </div>
                  <p className="font-sans font-semibold text-slate-800 leading-snug line-clamp-2">{audit.action}</p>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                    <span className="truncate max-w-[120px]">Actor: {audit.actor || "unknown"}</span>
                    <span>ReqID: {audit.reqId.slice(0, 10)}...</span>
                  </div>
                </div>
              ))}

              {audits.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic space-y-1.5">
                  <Terminal size={24} className="mx-auto text-slate-300" />
                  <p className="text-[11px]">Chưa có bản ghi hoạt động nào.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
            <span>Correlation ID Monitor</span>
            <Activity size={12} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* DETAILED AUDIT MODAL */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-200 shadow-md max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="text-emerald-600" size={16} />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 font-mono">Chi tiết kiểm toán (Audit)</h3>
              </div>
              <button onClick={() => setSelectedAudit(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[480px]">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Hành động</span>
                <p className="font-bold text-xs text-slate-800 mt-0.5 leading-snug">{selectedAudit.action}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Thời gian</span>
                  <p className="text-xs text-slate-700 mt-0.5 font-semibold">
                    {selectedAudit.timestamp ? new Date(selectedAudit.timestamp).toLocaleString() : selectedAudit.time}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Kết quả</span>
                  <div className="mt-0.5">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${
                      selectedAudit.status === "SUCCESS" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : selectedAudit.status === "DENIED"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-red-50 text-red-700 border-red-100"
                    }`}>
                      {selectedAudit.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Người thực hiện</span>
                  <p className="text-xs font-mono font-bold text-slate-600 mt-0.5 truncate">
                    {selectedAudit.actor || "system"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Correlation ID</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs font-mono text-slate-500 select-all truncate max-w-[120px]" title={selectedAudit.reqId}>
                      {selectedAudit.reqId}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedAudit.reqId)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      title="Sao chép ID"
                    >
                      {copiedId === selectedAudit.reqId ? (
                        <span className="text-[9px] text-emerald-600 font-bold font-sans">Copied</span>
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {selectedAudit.reason && (
                <div className="p-2.5 bg-red-50 border border-red-100 rounded text-xs text-red-800 leading-relaxed font-sans">
                  <span className="font-bold text-[9px] uppercase text-red-900 tracking-wider font-mono block mb-0.5">Lý do lỗi</span>
                  {selectedAudit.reason}
                </div>
              )}

              {selectedAudit.metadata && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Dữ liệu bối cảnh (Metadata)</span>
                  <pre className="p-3 bg-slate-50 border border-slate-100 rounded text-[10px] font-mono text-slate-600 overflow-x-auto max-h-[140px] leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(selectedAudit.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAudit(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold cursor-pointer transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
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
