import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, Shield, Settings, Sliders, X } from "lucide-react";
import { clientModuleRegistry } from "../infrastructure/modules/clientModuleRegistry";

interface NavigationProps {
  activeModules: Record<string, boolean>;
  userRole: string;
  onSetRole: (role: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Navigation({ activeModules, userRole, onSetRole, isOpen = false, onClose }: NavigationProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const clientModules = clientModuleRegistry.getAllModules();


  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-[#1E293B] flex flex-col text-white h-screen justify-between z-50 shrink-0 transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="p-5 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg">Q</div>
              <div className="flex flex-col">
                <span className="font-bold tracking-tight text-sm leading-tight">QLCV_PQG Next</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">v3.0 Monolith</span>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-800 rounded md:hidden text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Core Systems</div>
            <Link
              to="/"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive("/") ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <LayoutGrid size={16} />
              Bảng điều khiển
            </Link>

            <p className="pt-4 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Mô-đun kích hoạt</p>
            {clientModules.map((mod) => {
              const { id } = mod.manifest;
              const { menuItem } = mod;
              if (!menuItem) return null;

              const isEnabled = activeModules[id] === true;
              const IconComp = menuItem.icon;

              if (isEnabled) {
                return (
                  <Link
                    key={id}
                    to={menuItem.path}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      isActive(menuItem.path) ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <IconComp size={16} />
                    {menuItem.label}
                  </Link>
                );
              } else {
                return (
                  <div key={id} className="flex items-center justify-between px-3 py-2 text-slate-500 cursor-not-allowed group">
                    <span className="text-sm">{menuItem.label}</span>
                    <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">DISABLED</span>
                  </div>
                );
              }
            })}
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
    </>
  );
}
export default Navigation;
