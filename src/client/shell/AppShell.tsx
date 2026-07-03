import React from "react";
import { Navigation } from "./Navigation";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ShieldCheck, Database, Cloud } from "lucide-react";

interface AppShellProps {
  activeModules: Record<string, boolean>;
  userRole: string;
  onSetRole: (role: string) => void;
  children: React.ReactNode;
}

export function AppShell({ activeModules, userRole, onSetRole, children }: AppShellProps) {
  return (
    <div className="flex bg-[#F1F5F9] min-h-screen font-sans antialiased text-[#0F172A]">
      <Navigation
        activeModules={activeModules}
        userRole={userRole}
        onSetRole={onSetRole}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">QLCV_PQG Next Platform</h2>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
            <p className="text-[11px] text-slate-500 font-medium hidden md:block">Hệ thống cốt lõi quản trị mô-đun phân tán</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded">
              <Cloud size={10} className="shrink-0" />
              SANDBOX
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded">
              <Database size={10} className="shrink-0" />
              SQLITE/MOCK DB
            </span>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">Vai trò: {userRole.toUpperCase()}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] font-medium text-slate-500 shrink-0">
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 
              Architecture: Modular Monolith
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> 
              Agent Tool Registry: Skeleton Only
            </span>
          </div>
          <div className="flex gap-4">
            <span>NODE_ENV: development</span>
            <span>FIRESTORE: disconnected</span>
            <span className="text-slate-900 font-bold">Correlation Monitor</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
export default AppShell;
