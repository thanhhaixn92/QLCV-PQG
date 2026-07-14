import React, { useState, useEffect } from "react";
import { 
  Users, 
  Building2, 
  ShieldAlert, 
  Plus, 
  Save, 
  RefreshCw, 
  ShieldCheck, 
  Check, 
  AlertCircle,
  FolderLock,
  Tag,
  UserCheck
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { UserProfile, Department } from "../../../shared/contracts/identityContracts";

export function IdentityPlaceholder() {
  const [activeTab, setActiveTab] = useState<"users" | "departments" | "claims">("users");
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states cho phòng ban mới
  const [newDeptId, setNewDeptId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");

  // Form states cho biên tập người dùng
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Gọi đồng thời lấy danh sách phòng ban và người dùng
      const deptRes = await apiClient.request<{ success: boolean; data: Department[] }>("/api/modules/identity/departments");
      if (deptRes && deptRes.success) {
        setDepartments(deptRes.data);
      }

      // Chỉ lấy người dùng nếu tài khoản hiện tại có quyền (Admin)
      try {
        const userRes = await apiClient.request<{ success: boolean; data: UserProfile[] }>("/api/modules/identity/users");
        if (userRes && userRes.success) {
          setUsers(userRes.data);
        }
      } catch (err: any) {
        // Có thể bị chặn do không đủ quyền (không phải admin), chúng ta hiển thị danh sách trống/fallback
        setUsers([]);
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu danh tính.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptId || !newDeptName) {
      setError("Vui lòng nhập đầy đủ Mã và Tên phòng ban.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.request<{ success: boolean; data: Department }>("/api/modules/identity/departments", {
        method: "POST",
        body: JSON.stringify({
          id: newDeptId.trim().toLowerCase(),
          name: newDeptName.trim(),
          description: newDeptDesc.trim()
        })
      });

      if (res && res.success) {
        setSuccess(`Đã tạo thành công phòng ban: ${res.data.name}`);
        setNewDeptId("");
        setNewDeptName("");
        setNewDeptDesc("");
        loadData();
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Tạo phòng ban thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditDeptIds(user.departmentIds || []);
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
      const res = await apiClient.request<{ success: boolean; data: UserProfile }>(`/api/modules/identity/users/${editingUser.uid}`, {
        method: "PUT",
        body: JSON.stringify({
          role: editRole,
          departmentIds: editDeptIds,
          displayName: editingUser.displayName
        })
      });

      if (res && res.success) {
        setSuccess(`Đã cập nhật phân quyền cho người dùng: ${editingUser.displayName || editingUser.email}`);
        setEditingUser(null);
        loadData();
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Cập nhật phân quyền thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm max-w-5xl mx-auto overflow-hidden">
      {/* MODULE HEADER */}
      <div className="p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between border-b border-slate-700 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <FolderLock className="text-blue-400" size={20} />
            <h2 className="font-bold text-sm uppercase tracking-wider font-sans">
              Quản trị Danh tính và Phân quyền (Identity & RBAC)
            </h2>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed max-w-2xl">
            Tổ chức cơ cấu phòng ban, gán vai trò hệ thống, và đồng bộ hóa an toàn các Custom Claims trực tiếp lên hệ thống Firebase Authentication thời gian thực.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded cursor-pointer transition"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Tải lại dữ liệu
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-800">
          <AlertCircle size={14} className="shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
          <Check size={14} className="shrink-0" />
          <p className="font-medium">{success}</p>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-r border-slate-200 cursor-pointer transition ${
            activeTab === "users" ? "bg-white text-blue-600 border-b-2 border-b-blue-600" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users size={14} />
          Người dùng & Vai trò
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-r border-slate-200 cursor-pointer transition ${
            activeTab === "departments" ? "bg-white text-blue-600 border-b-2 border-b-blue-600" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Building2 size={14} />
          Cơ cấu Phòng ban
        </button>
        <button
          onClick={() => setActiveTab("claims")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold cursor-pointer transition ${
            activeTab === "claims" ? "bg-white text-blue-600 border-b-2 border-b-blue-600" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShieldAlert size={14} />
          Custom Claims & Bảo mật
        </button>
      </div>

      <div className="p-5">
        {/* TAB 1: USERS */}
        {activeTab === "users" && (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Hồ sơ người dùng hệ thống</h3>
                <p className="text-[11px] text-slate-500">Chỉ có Quản trị viên mới có thẩm quyền điều phối, gán vai trò và cấu trúc phòng ban cho người dùng.</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-100 px-2.5 py-1 rounded">
                Tổng cộng: {users.length} tài khoản
              </span>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 bg-slate-50 rounded">
                <Users className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-xs text-slate-500 italic">Không có người dùng nào được tải hoặc tài khoản hiện tại không có quyền truy vấn dữ liệu này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* USER LIST */}
                <div className="space-y-3">
                  {users.map(u => (
                    <div 
                      key={u.uid}
                      className={`p-3 border rounded transition cursor-pointer flex justify-between items-start ${
                        editingUser?.uid === u.uid 
                          ? "border-blue-500 bg-blue-50/40 shadow-xs" 
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                      onClick={() => handleStartEditUser(u)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="font-bold text-xs text-slate-800 truncate">{u.displayName || "Chưa đặt tên"}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded ${
                            u.role === "admin" 
                              ? "bg-red-50 text-red-700 border border-red-100" 
                              : u.role === "manager"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mb-2">{u.email}</p>
                        
                        <div className="flex flex-wrap gap-1">
                          {u.departmentIds && u.departmentIds.length > 0 ? (
                            u.departmentIds.map(dId => {
                              const deptObj = departments.find(d => d.id === dId);
                              return (
                                <span key={dId} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded">
                                  <Tag size={8} />
                                  {deptObj ? deptObj.name : dId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[9px] text-slate-400 italic">Chưa thuộc phòng ban nào</span>
                          )}
                        </div>
                      </div>
                      <button className="text-[10px] text-blue-600 font-bold hover:underline shrink-0">Sửa</button>
                    </div>
                  ))}
                </div>

                {/* EDITING CONTAINER */}
                <div>
                  {editingUser ? (
                    <div className="p-4 border border-blue-200 bg-blue-50/10 rounded space-y-4 sticky top-4">
                      <div className="border-b border-blue-100 pb-2 flex items-center gap-2">
                        <UserCheck className="text-blue-600" size={16} />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-blue-800">Cấu hình phân quyền</h4>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Tài khoản chỉnh sửa</label>
                        <p className="text-xs font-bold text-slate-700">{editingUser.displayName || "Không có tên"}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{editingUser.email}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Vai trò hệ thống (RBAC)</label>
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                          className="w-full text-xs font-medium p-2 border border-slate-200 rounded bg-white"
                        >
                          <option value="admin">Quản trị viên (Admin)</option>
                          <option value="manager">Trưởng phòng / Giám sát (Manager)</option>
                          <option value="editor">Biên tập viên (Editor)</option>
                          <option value="operator">Nhân viên xử lý (Operator)</option>
                          <option value="viewer">Người quan sát (Viewer)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Phòng ban liên kết (Đa lựa chọn)</label>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto p-2 border border-slate-200 rounded bg-white">
                          {departments.map(d => (
                            <label key={d.id} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:bg-slate-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={editDeptIds.includes(d.id)}
                                onChange={() => handleToggleEditDept(d.id)}
                                className="rounded text-blue-600"
                              />
                              <div>
                                <span className="font-bold text-slate-800">{d.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono block">{d.id}</span>
                              </div>
                            </label>
                          ))}
                          {departments.length === 0 && (
                            <span className="text-[11px] text-slate-400 italic">Vui lòng tạo phòng ban trước.</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSaveUserPermissions}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded cursor-pointer transition"
                        >
                          <Save size={13} />
                          Lưu phân quyền
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded cursor-pointer transition"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-slate-200 rounded text-center text-slate-400 italic space-y-2">
                      <ShieldCheck size={28} className="mx-auto text-slate-300" />
                      <p className="text-[11px]">Chọn một người dùng từ danh sách bên trái để tiến hành cấu hình vai trò, gán bộ phận và ghi đè Custom Claims.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEPARTMENTS */}
        {activeTab === "departments" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LEFT FORM: CREATE DEPARTMENT */}
            <div className="md:col-span-1 border border-slate-200 p-4 rounded bg-slate-50 h-fit space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Tạo Phòng ban mới</h4>
              </div>

              <form onSubmit={handleCreateDepartment} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Mã Phòng ban (Mã lực lượng)</label>
                  <input
                    type="text"
                    value={newDeptId}
                    onChange={e => setNewDeptId(e.target.value)}
                    placeholder="Ví dụ: dept-cntt, dept-kehoach"
                    className="w-full text-xs p-2 border border-slate-200 rounded bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Tên Phòng ban</label>
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    placeholder="Ví dụ: Phòng Kế hoạch và Đầu tư"
                    className="w-full text-xs p-2 border border-slate-200 rounded bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Mô tả chi tiết</label>
                  <textarea
                    value={newDeptDesc}
                    onChange={e => setNewDeptDesc(e.target.value)}
                    placeholder="Nhiệm vụ, vai trò chức năng..."
                    rows={3}
                    className="w-full text-xs p-2 border border-slate-200 rounded bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded cursor-pointer transition"
                >
                  <Plus size={13} />
                  Thêm phòng ban
                </button>
              </form>
            </div>

            {/* RIGHT TABLE: DEPARTMENTS LIST */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Danh sách các phòng ban tổ chức</h3>
              
              {departments.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded bg-slate-50">
                  <Building2 size={32} className="mx-auto text-slate-300 mb-1" />
                  <p className="text-xs text-slate-500 italic">Chưa có phòng ban nào được đăng ký trong hệ thống.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full border-collapse text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-mono text-[9px] font-bold tracking-wider">
                      <tr>
                        <th className="p-3">Mã phòng ban</th>
                        <th className="p-3">Tên phòng ban</th>
                        <th className="p-3">Mô tả chức năng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {departments.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-blue-600">{d.id}</td>
                          <td className="p-3 font-bold text-slate-800">{d.name}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate" title={d.description}>{d.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM CLAIMS */}
        {activeTab === "claims" && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded text-xs text-blue-900 leading-relaxed space-y-2">
              <h4 className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                <ShieldCheck size={16} />
                Cơ chế Firebase Custom Claims là gì?
              </h4>
              <p>
                Để đảm bảo tính nhất quán và hiệu năng tối đa khi xác thực các tuyến đường API và bảo vệ dữ liệu, hệ thống QLCV-PQG Next lưu trữ các thông tin vai trò cơ bản (<code>role</code>) và phòng ban liên kết (<code>departmentIds</code>) trực tiếp vào mã định danh bảo mật <strong>Custom Claims</strong> của người dùng trên Firebase Auth.
              </p>
              <p>
                Khi quản trị viên thay đổi phân quyền của một người dùng, máy chủ sẽ kích hoạt lệnh đồng bộ hóa để cập nhật các claims này. Khi Token được làm mới tại máy khách, vai trò và phân quyền mới sẽ được tự động áp dụng tức thời mà không cần gọi lại cơ sở dữ liệu.
              </p>
            </div>

            <div className="border border-slate-200 rounded p-4 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Quy tắc RBAC (Role-Based Access Control)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 border border-slate-100 bg-slate-50 rounded space-y-1.5">
                  <span className="font-bold text-red-700">ADMIN (Quản trị viên)</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Có toàn quyền quản lý mô-đun, cấu trúc phòng ban, tạo/phân công/lưu trữ các công việc và giám sát nhật ký kiểm toán hệ thống.</p>
                </div>
                <div className="p-3 border border-slate-100 bg-slate-50 rounded space-y-1.5">
                  <span className="font-bold text-purple-700">MANAGER (Trưởng phòng/Giám sát)</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Đọc và biên tập công việc, tự do phân công và chuyển trạng thái công việc thuộc về hoặc liên đới tới phòng ban phụ trách.</p>
                </div>
                <div className="p-3 border border-slate-100 bg-slate-50 rounded space-y-1.5">
                  <span className="font-bold text-blue-700">EDITOR (Biên tập viên)</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Được quyền tạo mới, chỉnh sửa chi tiết và hỗ trợ phân công công việc nhưng không có thẩm quyền đóng/lưu trữ.</p>
                </div>
                <div className="p-3 border border-slate-100 bg-slate-50 rounded space-y-1.5">
                  <span className="font-bold text-emerald-700">OPERATOR (Nhân viên xử lý)</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Có quyền cập nhật tiến trình, chuyển đổi trạng thái công việc được phân công trực tiếp và phản hồi kết quả.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IdentityPlaceholder;
