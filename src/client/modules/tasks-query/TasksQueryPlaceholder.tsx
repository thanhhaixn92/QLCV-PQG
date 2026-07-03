import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { ListTodo, CheckCircle, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

export function TasksQueryPlaceholder() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.request<{ success: boolean; tasks: Task[] }>("/api/modules/tasks-query/tasks");
      setTasks(res.tasks || []);
    } catch (err: any) {
      setError(err.message || "Lỗi tải dữ liệu mô-đun.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) {
    return <LoadingState message="Đang kết nối API bảo mật mô-đun..." />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <ErrorState
          title="Yêu cầu bị từ chối từ Server"
          message={error}
          onRetry={fetchTasks}
        />
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded">
          <p className="font-semibold mb-1 text-amber-950">Mẹo thao tác thử nghiệm:</p>
          Mô-đun <strong>tasks-query</strong> mặc định ở trạng thái <strong>disabled</strong> trên Server. Hãy dùng thanh **Bảng Điều Khiển Module** phía trên đổi trạng thái sang <strong>enabled</strong> rồi nhấn <strong>Thử lại</strong> để xem luồng dữ liệu thật.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded border border-slate-200 shadow-xs max-w-4xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
        <div className="p-2 bg-blue-50 text-blue-600 rounded">
          <ListTodo size={18} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Mô-đun mẫu: Truy vấn Công việc</h2>
          <p className="text-[11px] text-slate-500">Mô-đun đang hoạt động bình thường nhờ được kích hoạt từ máy chủ.</p>
        </div>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 transition border border-slate-100 rounded">
            <div className="flex items-center gap-3">
              {task.status === "completed" ? (
                <CheckCircle className="text-emerald-600 shrink-0" size={16} />
              ) : (
                <Clock className="text-amber-500 shrink-0" size={16} />
              )}
              <div>
                <h4 className="text-xs font-bold text-slate-800">{task.title}</h4>
                <p className="text-[10px] text-slate-400 font-mono">Mã: {task.id} • Người thực hiện: {task.assignee}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${task.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
              {task.status === "completed" ? "Đã xong" : "Chờ xử lý"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default TasksQueryPlaceholder;
