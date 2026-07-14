import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { 
  ListTodo, CheckCircle, Clock, Plus, Trash2, UserPlus, Play, Check, 
  RotateCcw, Edit, Info, Calendar, Briefcase, AlertTriangle, AlertCircle, 
  X, ChevronRight, ChevronLeft, Filter, RefreshCw, User, ShieldAlert,
  ArrowRightLeft, Hash, Layers
} from "lucide-react";
import { TaskSummary, TaskStatus, TaskPriority } from "../../../shared/contracts/tasks/taskContracts";

// Hardcoded department mappings for visual clarity
const DEPARTMENTS: Record<string, string> = {
  "dept-a": "Phòng Công nghệ",
  "dept-b": "Phòng Bảo mật",
  "dept-c": "Phòng Kế hoạch",
  "dept-test": "Phòng Kiểm thử"
};

const STATUS_LABELS: Record<TaskStatus, { text: string; color: string; bg: string; border: string }> = {
  "backlog": { text: "Backlog", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  "todo": { text: "Cần làm", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  "in_progress": { text: "Đang làm", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" },
  "completed": { text: "Hoàn thành", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
  "cancelled": { text: "Đã hủy", color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200" }
};

const PRIORITY_LABELS: Record<TaskPriority, { text: string; color: string; bg: string }> = {
  "low": { text: "Thấp", color: "text-slate-600", bg: "bg-slate-100" },
  "medium": { text: "Trung bình", color: "text-amber-700", bg: "bg-amber-100" },
  "high": { text: "Cao", color: "text-red-700", bg: "bg-red-100" }
};

export function TasksQueryPlaceholder() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering & Pagination State
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);

  // Modules activation state
  const [isCommandEnabled, setIsCommandEnabled] = useState(true);

  // User details & Modals State
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [modalType, setModalType] = useState<"create" | "edit" | "assign" | "transition" | "archive" | "details" | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Active Role and Auth Metadata
  const [role, setRole] = useState("viewer");

  // Form Fields State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState<TaskPriority>("low");
  const [formDeptId, setFormDeptId] = useState("");
  const [formDueAt, setFormDueAt] = useState("");
  const [formAssigneeUid, setFormAssigneeUid] = useState("");
  const [formTransition, setFormTransition] = useState<"start" | "complete" | "reopen">("start");

  // Get active role on mount and interval
  const updateRoleAndModules = async () => {
    const activeRole = apiClient.getMockRole();
    setRole(activeRole);

    try {
      const res = await apiClient.request<{ success: boolean; data: any }>("/api/runtime-config");
      if (res && res.data && res.data.modules) {
        setIsCommandEnabled(res.data.modules["tasks-command"]?.state === "enabled");
      }
    } catch {
      // Ignore fallback
    }
  };

  useEffect(() => {
    updateRoleAndModules();
    const interval = setInterval(updateRoleAndModules, 3000);
    return () => clearInterval(interval);
  }, []);

  const buildQueryString = (cursor: string | null = null) => {
    const params = new URLSearchParams();
    params.append("limit", "10");
    if (cursor) params.append("cursor", cursor);
    if (statusFilter) params.append("status", statusFilter);
    if (priorityFilter) params.append("priority", priorityFilter);
    if (departmentFilter) params.append("departmentId", departmentFilter);
    return params.toString();
  };

  const fetchTasks = async (cursor: string | null = null, isResetHistory = false) => {
    setLoading(true);
    setError(null);
    try {
      const queryStr = buildQueryString(cursor);
      const res = await apiClient.request<{
        success: boolean;
        data: {
          items: TaskSummary[];
          pageInfo: {
            nextCursor: string | null;
            hasNextPage: boolean;
          };
        };
      }>(`/api/modules/tasks-query/tasks?${queryStr}`);
      
      if (res.success && res.data) {
        setTasks(res.data.items || []);
        setNextCursor(res.data.pageInfo?.nextCursor || null);
        setCurrentCursor(cursor);
        if (isResetHistory) {
          setCursorHistory([]);
        }
      } else {
        throw new Error("Lỗi phản hồi dữ liệu từ máy chủ.");
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách công việc. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when filters change
  useEffect(() => {
    fetchTasks(null, true);
  }, [statusFilter, priorityFilter, departmentFilter]);

  const handleNextPage = () => {
    if (nextCursor) {
      setCursorHistory(prev => [...prev, currentCursor || ""]);
      fetchTasks(nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory(prev => prev.slice(0, prev-1));
      fetchTasks(prevCursor || null);
    }
  };

  // Open modals with initialized form fields
  const openModal = (type: "create" | "edit" | "assign" | "transition" | "archive" | "details", task: TaskSummary | null = null) => {
    setSelectedTask(task);
    setModalType(type);
    setModalError(null);
    setModalLoading(false);

    if (type === "create") {
      setFormTitle("");
      setFormDescription("");
      setFormPriority("low");
      setFormDeptId("");
      setFormDueAt("");
    } else if (type === "edit" && task) {
      setFormTitle(task.title || "");
      setFormDescription(""); // Optional details from command details (usually not in query summary)
      setFormPriority(task.priority || "low");
      setFormDueAt(task.dueAt ? task.dueAt.slice(0, 16) : "");
    } else if (type === "assign" && task) {
      setFormAssigneeUid(task.assignee?.uid || "");
    } else if (type === "transition" && task) {
      if (task.status === "completed") {
        setFormTransition("reopen");
      } else if (task.status === "in_progress") {
        setFormTransition("complete");
      } else {
        setFormTransition("start");
      }
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTask(null);
    setModalError(null);
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask && modalType !== "create") return;
    
    setModalLoading(true);
    setModalError(null);

    try {
      let path = "";
      let method = "POST";
      let body: Record<string, any> = {};

      const expectedVersion = selectedTask?.version || 1;

      if (modalType === "create") {
        path = "/api/modules/tasks-command/tasks";
        method = "POST";
        body = {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          priority: formPriority,
          departmentId: formDeptId || null,
          dueAt: formDueAt ? new Date(formDueAt).toISOString() : null
        };
      } else if (modalType === "edit") {
        path = `/api/modules/tasks-command/tasks/${selectedTask!.id}`;
        method = "PATCH";
        body = {
          title: formTitle.trim(),
          priority: formPriority,
          dueAt: formDueAt ? new Date(formDueAt).toISOString() : null,
          expectedVersion
        };
      } else if (modalType === "assign") {
        path = `/api/modules/tasks-command/tasks/${selectedTask!.id}/assignee`;
        method = "PUT";
        body = {
          assigneeUid: formAssigneeUid.trim() || null,
          expectedVersion
        };
      } else if (modalType === "transition") {
        path = `/api/modules/tasks-command/tasks/${selectedTask!.id}/transitions`;
        method = "POST";
        body = {
          transition: formTransition,
          expectedVersion
        };
      } else if (modalType === "archive") {
        path = `/api/modules/tasks-command/tasks/${selectedTask!.id}`;
        method = "DELETE";
        body = {
          expectedVersion
        };
      }

      const res = await apiClient.request<{ success: boolean }>(path, {
        method,
        body: JSON.stringify(body)
      });

      if (res.success) {
        closeModal();
        // Reload tasks with delay to allow Firestore propagation
        setTimeout(() => fetchTasks(currentCursor), 1200);
      } else {
        throw new Error("Giao dịch thất bại.");
      }
    } catch (err: any) {
      let friendlyError = err.message || "Có lỗi xảy ra khi thực hiện lệnh.";
      if (friendlyError.includes("TASK_VERSION_CONFLICT") || friendlyError.includes("expectedVersion")) {
        friendlyError = "Xung đột OCC (Phiên bản): Bản ghi công việc đã bị người khác cập nhật trước đó. Vui lòng tải lại trang.";
      }
      setModalError(friendlyError);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading && tasks.length === 0) {
    return <LoadingState message="Đang truy vấn dữ liệu công việc an toàn..." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* ERROR CORNER */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded">
          <ErrorState
            title="Lỗi tải luồng dữ liệu"
            message={error}
            onRetry={() => fetchTasks(currentCursor, true)}
          />
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded leading-relaxed">
            <p className="font-semibold mb-1 text-amber-950">Mẹo xử lý nhanh:</p>
            Đảm bảo rằng mô-đun <strong>tasks-query</strong> đã được kích hoạt ở trạng thái <strong>ACTIVE</strong> trên Bảng Điều Khiển Hệ Thống chính. Nếu chưa, hãy chuyển sang tab Bảng Điều Khiển để khởi động mô-đun.
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white rounded border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded">
              <ListTodo size={20} />
            </span>
            <h1 className="text-base font-bold text-slate-800 font-sans tracking-tight">Hệ thống Quản lý Công việc</h1>
          </div>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Kiến trúc CQRS chia tách rõ ràng: Luồng đọc kết xuất qua <code>tasks-query</code> và luồng viết kiểm toán qua <code>tasks-command</code>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => fetchTasks(currentCursor)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded text-xs font-semibold text-slate-700 transition cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw size={13} />
            Tải lại
          </button>

          {isCommandEnabled ? (
            <button
              onClick={() => openModal("create")}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              Tạo công việc
            </button>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded text-amber-700 text-xs font-bold font-mono">
              <ShieldAlert size={12} />
              COMMANDS: DISABLED
            </div>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded border border-slate-200 shadow-xs p-3.5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono shrink-0">
          <Filter size={13} />
          <span>Bộ lọc</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 min-w-[280px]">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}
            className="bg-slate-50 text-slate-700 text-xs rounded border border-slate-200 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full"
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="backlog">Backlog</option>
            <option value="todo">Cần làm</option>
            <option value="in_progress">Đang làm</option>
            <option value="completed">Đã hoàn thành</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "")}
            className="bg-slate-50 text-slate-700 text-xs rounded border border-slate-200 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full"
          >
            <option value="">-- Tất cả độ ưu tiên --</option>
            <option value="low">Ưu tiên Thấp</option>
            <option value="medium">Ưu tiên Trung bình</option>
            <option value="high">Ưu tiên Cao</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 text-xs rounded border border-slate-200 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full"
          >
            <option value="">-- Tất cả phòng ban --</option>
            {Object.entries(DEPARTMENTS).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TASKS GRID */}
      <div className="space-y-2">
        {tasks.map(task => {
          const statusLbl = task.status ? STATUS_LABELS[task.status] : STATUS_LABELS["todo"];
          const priorityLbl = task.priority ? PRIORITY_LABELS[task.priority] : null;
          
          return (
            <div 
              key={task.id} 
              className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition border border-slate-200 rounded gap-4"
            >
              {/* Left Column: Title and details */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className={`p-2 rounded-full shrink-0 mt-0.5 ${task.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>
                  {task.status === "completed" ? <CheckCircle size={16} /> : <Clock size={16} />}
                </span>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 break-words line-clamp-1 cursor-pointer" onClick={() => openModal("details", task)}>
                      {task.title}
                    </h3>
                    
                    {priorityLbl && (
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${priorityLbl.bg} ${priorityLbl.color}`}>
                        {priorityLbl.text}
                      </span>
                    )}

                    <span className="text-[9px] text-slate-400 font-mono font-semibold">
                      v{task.version || 1}
                    </span>
                  </div>

                  {/* Metadata line */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 shrink-0">
                      <Hash size={10} />
                      {task.id.slice(0, 12)}
                    </span>

                    {task.departmentId && (
                      <span className="flex items-center gap-1 text-slate-500 shrink-0">
                        <Briefcase size={10} />
                        {DEPARTMENTS[task.departmentId] || task.departmentId}
                      </span>
                    )}

                    {task.dueAt && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar size={10} />
                        Hạn: {new Date(task.dueAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Creator / Assignee detail */}
                  <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      <User size={10} />
                      Người tạo: {task.creator?.displayName || "Hệ thống"}
                    </span>
                    <span className="flex items-center gap-1 bg-blue-50/50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100/50">
                      <UserPlus size={10} />
                      Phân công: {task.assignee?.displayName || "Chưa giao"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex flex-wrap items-center gap-2 justify-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${statusLbl.bg} ${statusLbl.color} ${statusLbl.border}`}>
                  {statusLbl.text}
                </span>

                {isCommandEnabled && (
                  <div className="flex items-center gap-1">
                    {/* Details button */}
                    <button
                      onClick={() => openModal("details", task)}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition cursor-pointer"
                      title="Chi tiết công việc"
                    >
                      <Info size={14} />
                    </button>

                    {/* Change Status / Transition button */}
                    <button
                      onClick={() => openModal("transition", task)}
                      className="p-1.5 hover:bg-amber-50 hover:text-amber-700 rounded text-slate-500 transition cursor-pointer"
                      title="Chuyển trạng thái"
                    >
                      <ArrowRightLeft size={14} />
                    </button>

                    {/* Assignee button */}
                    <button
                      onClick={() => openModal("assign", task)}
                      className="p-1.5 hover:bg-blue-50 hover:text-blue-700 rounded text-slate-500 transition cursor-pointer"
                      title="Giao việc"
                    >
                      <UserPlus size={14} />
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => openModal("edit", task)}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Edit size={14} />
                    </button>

                    {/* Delete / Archive button */}
                    <button
                      onClick={() => openModal("archive", task)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-slate-400 transition cursor-pointer"
                      title="Lưu trữ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="bg-white border border-slate-200 rounded p-12 text-center text-slate-400 space-y-2">
            <Layers size={36} className="mx-auto text-slate-300 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-700">Không tìm thấy công việc nào</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Không có công việc nào thỏa mãn bộ lọc hiện tại hoặc bạn không có quyền xem trong hệ thống.
            </p>
          </div>
        )}
      </div>

      {/* PAGINATION PANEL */}
      <div className="bg-white rounded border border-slate-200 shadow-xs p-3 flex justify-between items-center text-xs">
        <span className="text-slate-500 font-medium">
          Dữ liệu: <strong className="font-semibold text-slate-800">{tasks.length}</strong> công việc hiện hữu
        </span>

        <div className="flex gap-2">
          <button
            onClick={handlePrevPage}
            disabled={cursorHistory.length === 0}
            className={`flex items-center gap-1 px-3 py-1 border border-slate-200 rounded text-xs font-semibold cursor-pointer transition ${cursorHistory.length === 0 ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed" : "bg-white hover:bg-slate-50 text-slate-700"}`}
          >
            <ChevronLeft size={13} />
            Trang trước
          </button>
          <button
            onClick={handleNextPage}
            disabled={!nextCursor}
            className={`flex items-center gap-1 px-3 py-1 border border-slate-200 rounded text-xs font-semibold cursor-pointer transition ${!nextCursor ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed" : "bg-white hover:bg-slate-50 text-slate-700"}`}
          >
            Trang sau
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* MODALS RENDER */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-200 shadow-md max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ListTodo className="text-blue-600 font-bold" size={16} />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  {modalType === "create" && "Tạo công việc mới"}
                  {modalType === "edit" && "Chỉnh sửa công việc"}
                  {modalType === "assign" && "Phân công công việc"}
                  {modalType === "transition" && "Chuyển trạng thái công việc"}
                  {modalType === "archive" && "Lưu trữ (Xóa mềm) công việc"}
                  {modalType === "details" && "Thông tin chi tiết công việc"}
                </h3>
              </div>
              <button onClick={closeModal} className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCommandSubmit} className="p-4 space-y-4 flex-1 overflow-y-auto">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="shrink-0 mt-0.5 text-red-600 font-bold" size={12} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Create/Edit Modal fields */}
              {(modalType === "create" || modalType === "edit") && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tiêu đề *</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 text-xs rounded border border-slate-200 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Nhập tiêu đề công việc..."
                    />
                  </div>

                  {modalType === "create" && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mô tả chi tiết</label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 text-xs rounded border border-slate-200 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 h-20"
                        placeholder="Mô tả các yêu cầu, phạm vi công việc..."
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mức độ ưu tiên</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                        className="w-full bg-slate-50 text-slate-800 text-xs rounded border border-slate-200 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Thời hạn xử lý</label>
                      <input
                        type="datetime-local"
                        value={formDueAt}
                        onChange={(e) => setFormDueAt(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 text-xs rounded border border-slate-200 py-1 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {modalType === "create" && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Gán phòng ban phụ trách</label>
                      <select
                        value={formDeptId}
                        onChange={(e) => setFormDeptId(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 text-xs rounded border border-slate-200 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- Để trống / Toàn cục --</option>
                        {Object.entries(DEPARTMENTS).map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Assign Modal fields */}
              {modalType === "assign" && (
                <div className="space-y-3">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600">
                    Giao phó công việc hiện tại cho một tài khoản cụ thể. 
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mã định danh người nhận (UID)</label>
                    <input
                      type="text"
                      required
                      value={formAssigneeUid}
                      onChange={(e) => setFormAssigneeUid(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 text-xs rounded border border-slate-200 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      placeholder="Ví dụ: user-123, user-456..."
                    />
                  </div>
                </div>
              )}

              {/* Transition Modal fields */}
              {modalType === "transition" && (
                <div className="space-y-3">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600">
                    Trạng thái hiện tại: <strong className="font-semibold text-slate-800">{selectedTask?.status ? STATUS_LABELS[selectedTask.status].text : "Chờ"}</strong>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hành động chuyển trạng thái</label>
                    <select
                      value={formTransition}
                      onChange={(e) => setFormTransition(e.target.value as any)}
                      className="w-full bg-slate-50 text-slate-800 text-xs rounded border border-slate-200 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {selectedTask?.status !== "in_progress" && selectedTask?.status !== "completed" && (
                        <option value="start">Bắt đầu thực hiện (start &rarr; In progress)</option>
                      )}
                      {selectedTask?.status === "in_progress" && (
                        <option value="complete">Hoàn thành công việc (complete &rarr; Completed)</option>
                      )}
                      {selectedTask?.status === "completed" && (
                        <option value="reopen">Mở lại công việc (reopen &rarr; Todo)</option>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* Archive Modal fields */}
              {modalType === "archive" && (
                <div className="space-y-3 text-slate-700 text-xs leading-relaxed">
                  <div className="p-3 bg-red-50 border border-red-100 rounded text-red-800 flex gap-2">
                    <AlertTriangle className="shrink-0 mt-0.5 text-red-600" size={14} />
                    <span>
                      Hành động này sẽ thực hiện <strong>Lưu trữ (Soft-delete)</strong> công việc mang mã số <code>{selectedTask!.id}</code>. Công việc sẽ không xuất hiện trên danh sách truy xuất chung.
                    </span>
                  </div>
                  <p>Bạn có chắc chắn muốn lưu trữ công việc này không?</p>
                </div>
              )}

              {/* Details Modal fields */}
              {modalType === "details" && selectedTask && (
                <div className="space-y-3.5 text-xs text-slate-700">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-50 p-3.5 rounded border border-slate-100 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[9px] block">Mã công việc:</span>
                      <span className="text-slate-800 font-semibold break-all">{selectedTask.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[9px] block">Số phiên bản:</span>
                      <span className="text-slate-800 font-semibold">v{selectedTask.version || 1}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[9px] block">Thời gian tạo:</span>
                      <span className="text-slate-800">{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString() : "Chưa rõ"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[9px] block">Thời gian cập nhật:</span>
                      <span className="text-slate-800">{selectedTask.updatedAt ? new Date(selectedTask.updatedAt).toLocaleString() : "Chưa rõ"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase font-bold text-[9px] block mb-0.5">Tiêu đề:</span>
                    <p className="font-bold text-slate-900 leading-normal">{selectedTask.title}</p>
                  </div>

                  {selectedTask.departmentId && (
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[9px] block mb-0.5">Phòng ban:</span>
                      <p className="font-semibold text-slate-700">{DEPARTMENTS[selectedTask.departmentId] || selectedTask.departmentId}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[9px] block mb-0.5">Người tạo:</span>
                      <p className="font-medium text-slate-700">{selectedTask.creator?.displayName || "Không rõ"} <span className="text-slate-400 text-[10px]">({selectedTask.creator?.uid || "Anonymous"})</span></p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[9px] block mb-0.5">Phân công:</span>
                      <p className="font-medium text-slate-700">{selectedTask.assignee?.displayName || "Chưa giao"} <span className="text-slate-400 text-[10px]">({selectedTask.assignee?.uid || "None"})</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold cursor-pointer transition"
                >
                  {modalType === "details" ? "Đóng" : "Hủy"}
                </button>

                {modalType !== "details" && (
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className={`flex items-center gap-1.5 px-4 py-1.5 text-white rounded text-xs font-semibold transition cursor-pointer ${modalType === "archive" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {modalLoading && <RefreshCw size={12} className="animate-spin" />}
                    Xác nhận
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksQueryPlaceholder;
