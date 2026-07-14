import React, { useState, useEffect } from "react";
import { 
  Users, 
  Radio, 
  Cpu, 
  Shield, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Building2, 
  Tag, 
  Sparkles,
  Save,
  Loader2,
  X,
  UserCheck
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { runtimeConfigClient } from "../../services/runtimeConfigClient";
import { clientModuleRegistry } from "../../infrastructure/modules/clientModuleRegistry";

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  departmentIds?: string[];
  isMock?: boolean;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface AiMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  totalCharacters: number;
  lastActive: string;
}

export function AdminModuleView() {
  const [activeTab, setActiveTab] = useState<"users" | "modules" | "ai">("users");
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [aiMetrics, setAiMetrics] = useState<AiMetrics | null>(null);
  const [activeModules, setActiveModules] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editing state for users
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);
  const [editDisplayName, setEditDisplayName] = useState<string>("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load Users & Departments
      const userRes = await apiClient.request<{ success: boolean; data: { users: UserProfile[]; departments: Department[] } }>("/api/admin-panel/users");
      if (userRes && userRes.success) {
        setUsers(userRes.data.users);
        setDepartments(userRes.data.departments);
      }

      // Load AI metrics
      const aiRes = await apiClient.request<{ success: boolean; data: AiMetrics }>("/api/admin-panel/ai-usage");
      if (aiRes && aiRes.success) {
        setAiMetrics(aiRes.data);
      }

      // Load runtime modules state
      const config = await runtimeConfigClient.getRuntimeConfig();
      if (config && config.modules) {
        const mods: Record<string, string> = {};
        for (const [id, value] of Object.entries(config.modules)) {
          mods[id] = value.state;
        }
        setActiveModules(mods);
      }
    } catch (err: any) {
      setError(err.message || "Tải dữ liệu cấu hình quản trị viên thất bại. Đảm bảo bạn đang đăng nhập với vai trò ADMIN.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditDeptIds(user.departmentIds || []);
    setEditDisplayName(user.displayName || "");
  };

  const handleToggleEditDept = (deptId: string) => {
    if (editDeptIds.includes(deptId)) {
      setEditDeptIds(editDeptIds.filter(id => id !== deptId));
    } else {
      setEditDeptIds([...editDeptIds, deptId]);
    }
  };

  const handleSaveUserPermissions = async () => {
    if (!editingUser) return;

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.request<{ success: boolean; data: UserProfile }>(`/api/admin-panel/users/${editingUser.uid}/role`, {
        method: "PUT",
        body: JSON.stringify({
          role: editRole,
          departmentIds: editDeptIds,
          displayName: editDisplayName.trim() || undefined
        })
      });

      if (res && res.success) {
        setSuccess(`Đã cập nhật vai trò & phòng ban thành công cho: ${res.data.displayName || res.data.email}`);
        setEditingUser(null);
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Cập nhật người dùng thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModuleState = async (moduleId: string, currentState: string) => {
    try {
      setLoading(true);
      setError(null);
      const targetState = currentState === "enabled" ? "disabled" : "enabled";
      await apiClient.request(`/api/admin/modules/${moduleId}/state`, {
        method: "PUT",
        body: JSON.stringify({ state: targetState })
      });
      setSuccess(`Đã thay đổi trạng thái mô-đun '${moduleId}' sang ${targetState.toUpperCase()}`);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Không thể thay đổi trạng thái mô-đun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm max-w-5xl mx-auto overflow-hidden">
      {/* HEADER BAR */}
      <div className="p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between border-b border-slate-700 gap-4">
        <div>
          <div className="flex items-center gap-3.5 mb-1">
            <div className="p-2 bg-blue-500 rounded text-white shadow-xs">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans tracking-tight">Bảng Điều Khiển Quản Trị Hệ Thống</h2>
              <p className="text-xs text-slate-400">Phân quyền, cấu hình mô-đun trực tiếp và kiểm soát lượng tiêu thụ AI</p>
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition self-start md:self-auto border border-slate-700 cursor-pointer"
          title="Tải lại dữ liệu"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ERROR / SUCCESS FEEDBACK */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-2.5 text-red-800 text-xs">
          <AlertTriangle className="shrink-0 text-red-600" size={14} />
          <div className="font-sans font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-start gap-2.5 text-emerald-800 text-xs">
          <CheckCircle2 className="shrink-0 text-emerald-600" size={14} />
          <div className="font-sans font-medium">{success}</div>
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-5 py-3 text-xs font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "users"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={14} />
          Thành viên & Quyền hạn ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("modules")}
          className={`px-5 py-3 text-xs font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "modules"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Radio size={14} />
          Bật/Tắt Mô-đun Động ({Object.keys(activeModules).length})
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-5 py-3 text-xs font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "ai"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Cpu size={14} />
          Giám sát Lưu lượng AI
        </button>
      </div>

      {/* TAB CONTENTS */}
      <div className="p-5">
        {/* 1. USERS & ROLES */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Danh sách tài khoản vận hành</h3>
            
            <div className="overflow-x-auto border border-slate-100 rounded">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono bg-slate-50">
                    <th className="py-2.5 px-3">Họ và tên / Email</th>
                    <th className="py-2.5 px-3">Vai trò quyền</th>
                    <th className="py-2.5 px-3">Phòng ban quản lý</th>
                    <th className="py-2.5 px-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {users.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{user.displayName || "Chưa thiết lập tên"}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                          user.role === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-100"
                            : user.role === "manager"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : user.role === "editor"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {user.departmentIds && user.departmentIds.length > 0 ? (
                            user.departmentIds.map(dId => {
                              const dName = departments.find(d => d.id === dId)?.name || dId;
                              return (
                                <span key={dId} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded border border-slate-200">
                                  {dName}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Chưa chỉ định</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => handleStartEditUser(user)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded shadow-xs cursor-pointer transition"
                        >
                          Phân quyền
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. DYNAMIC MODULES KILL-SWITCH */}
        {activeTab === "modules" && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="shrink-0 text-amber-600 mt-0.5" size={14} />
              <span>
                <strong>Kiểm soát ngắt khẩn cấp (Kill Switch)</strong>: Việc vô hiệu hóa bất kỳ mô-đun nào sẽ ngay lập tức chặn quyền truy cập API tại máy chủ, ẩn khỏi bảng chọn điều hướng và từ chối các AI Tools liên đới thời gian thực.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {Object.entries(activeModules).map(([id, state]) => {
                const clientMod = clientModuleRegistry.getAllModules().find(m => m.manifest.id === id);
                const displayName = clientMod?.manifest.displayName || id;
                const description = clientMod?.manifest.description || "Mô-đun vận hành hệ thống.";

                return (
                  <div key={id} className="p-4 border border-slate-200 rounded hover:border-slate-300 transition bg-slate-50/50 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-800 font-mono">{id}</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                          state === "enabled"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {state === "enabled" ? "ACTIVE" : "DISABLED"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-700">{displayName}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal font-sans">{description}</p>
                    </div>

                    <button
                      onClick={() => handleToggleModuleState(id, state as string)}
                      className={`w-full py-1.5 text-[11px] font-bold rounded border transition cursor-pointer text-center ${
                        state === "enabled"
                          ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                          : "bg-blue-600 border-blue-700 text-white hover:bg-blue-700"
                      }`}
                    >
                      {state === "enabled" ? "Vô hiệu hóa Module" : "Kích hoạt Module"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. AI METRICS AND MONITOR */}
        {activeTab === "ai" && aiMetrics && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Giám sát tài nguyên trợ lý AI (Gemini)</h3>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 bg-slate-50/50 rounded flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Yêu cầu AI (Total Requests)</span>
                  <p className="text-xl font-bold text-slate-800 mt-1">{aiMetrics.totalRequests}</p>
                </div>
                <div className="text-[10px] text-slate-500 mt-3 border-t border-slate-100 pt-2 flex justify-between">
                  <span>Thành công: {aiMetrics.successCount}</span>
                  <span className="text-red-500">Thất bại: {aiMetrics.errorCount}</span>
                </div>
              </div>

              <div className="p-4 border border-slate-200 bg-slate-50/50 rounded flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Tổng dung lượng xử lý</span>
                  <p className="text-xl font-bold text-slate-800 mt-1">{(aiMetrics.totalCharacters / 1000).toFixed(1)}k <span className="text-xs font-medium text-slate-400">kí tự</span></p>
                </div>
                <span className="text-[10px] text-slate-500 mt-3 border-t border-slate-100 pt-2">Trung bình ~{(aiMetrics.totalRequests > 0 ? aiMetrics.totalCharacters / aiMetrics.totalRequests : 0).toFixed(0)} kí tự/lần</span>
              </div>

              <div className="p-4 border border-slate-200 bg-slate-50/50 rounded flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Hoạt động cuối (UTC)</span>
                  <p className="text-xs font-bold text-slate-600 font-mono mt-2 truncate" title={aiMetrics.lastActive}>{aiMetrics.lastActive ? new Date(aiMetrics.lastActive).toLocaleString() : "Chưa ghi nhận"}</p>
                </div>
                <div className="text-[10px] text-emerald-600 mt-3 border-t border-slate-100 pt-2 flex items-center gap-1">
                  <Sparkles size={11} className="text-emerald-500 animate-pulse" /> Trợ lý AI đang chờ lệnh
                </div>
              </div>
            </div>

            {/* AI Health bar */}
            <div className="p-4 border border-slate-200 rounded space-y-2">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-slate-600">Tỉ lệ phản hồi thành công của AI (Gateway SLA)</span>
                <span className="text-slate-800 font-bold font-mono">
                  {aiMetrics.totalRequests > 0 ? Math.round((aiMetrics.successCount / aiMetrics.totalRequests) * 100) : 100}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${aiMetrics.totalRequests > 0 ? (aiMetrics.successCount / aiMetrics.totalRequests) * 100 : 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* USER EDIT PERMISSIONS DIALOG / DRAWER */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-200 shadow-md max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserCheck className="text-blue-600" size={16} />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 font-mono">Cập nhật quyền hạn thành viên</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Account Detail */}
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded text-xs font-mono">
                <span className="text-[10px] text-slate-400 font-bold">Email tài khoản:</span>
                <div className="text-slate-700 font-bold">{editingUser.email}</div>
              </div>

              {/* Display Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">Họ và tên hiển thị</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full text-xs border border-slate-300 rounded p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">Chọn vai trò quyền (RBAC)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-sans"
                >
                  <option value="viewer">Viewer (Chỉ xem dữ liệu)</option>
                  <option value="operator">Operator (Thao tác viên)</option>
                  <option value="editor">Editor (Biên tập viên)</option>
                  <option value="manager">Manager (Quản lý dự án)</option>
                  <option value="admin">Admin (Toàn quyền hệ thống)</option>
                </select>
              </div>

              {/* Departments Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">Liên kết vào các phòng ban / bộ phận</label>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 border border-slate-100 p-2 rounded">
                  {departments.map((dept) => {
                    const isChecked = editDeptIds.includes(dept.id);
                    return (
                      <label key={dept.id} className="flex items-center gap-2 text-xs text-slate-600 font-sans cursor-pointer select-none py-1 hover:bg-slate-50 rounded px-1 transition">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEditDept(dept.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="font-medium text-slate-700">{dept.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">({dept.id})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-bold cursor-pointer transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveUserPermissions}
                disabled={loading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs transition"
              >
                <Save size={13} />
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminModuleView;
