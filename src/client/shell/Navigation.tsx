import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, ListTodo, Shield, Settings, Sliders } from "lucide-react";

interface NavigationProps {
  activeModules: Record<string, boolean>;
  userRole: string;
  onSetRole: (role: string) => void;
}

export function Navigation({ activeModules, userRole, onSetRole }: NavigationProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 flex-shrink-0 bg-[#1E293B] flex flex-col text-white min-h-screen justify-between shrink-0">
      <div>
        <div className="p-5 flex items-center gap-3 border-b border-slate-700">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg">Q</div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-sm leading-tight">QLCV_PQG Next</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">v3.0 Monolith</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Core Systems</div>
          <Link
            to="/"
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
              isActive("/") ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutGrid size={16} />
            Bảng điều khiển
          </Link>

          <p className="pt-4 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Mô-đun kích hoạt</p>
          {activeModules["tasks-query"] ? (
            <Link
              to="/tasks-query"
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive("/tasks-query") ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <ListTodo size={16} />
              Truy vấn Công việc
            </Link>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 text-slate-500 cursor-not-allowed group">
              <span className="text-sm">Truy vấn Công việc</span>
              <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">DISABLED</span>
            </div>
          )}
        </nav>
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
            <Sliders size={12} />
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Vai trò Giả lập (Local Dev)
            </label>
          </div>
          <select
            value={userRole}
            onChange={(e) => onSetRole(e.target.value)}
            className="w-full bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 py-1 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="admin">Admin (Toàn quyền)</option>
            <option value="manager">Manager</option>
            <option value="editor">Editor</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer (Xem)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 mb-1 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-slate-300">Server: Development</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">ReqID: 8f2a-d9c1-4b72</div>
      </div>
    </aside>
  );
}
export default Navigation;
