import React, { useState } from "react";
import { Navigation } from "./Navigation";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ShieldCheck, Database, Cloud, Menu } from "lucide-react";

interface AppShellProps {
  activeModules: Record<string, boolean>;
  userRole: string;
  onSetRole: (role: string) => void;
  children: React.ReactNode;
}

export function AppShell({ activeModules, userRole, onSetRole, children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex bg-[#F1F5F9] min-h-screen font-sans antialiased text-[#0F172A]">
      <Navigation
        activeModules={activeModules}
        userRole={userRole}
        onSetRole={onSetRole}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger menu button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 hover:bg-slate-100 rounded md:hidden text-slate-600 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans truncate max-w-[130px] sm:max-w-none">
              QLCV_PQG Next Platform
            </h2>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
            <p className="text-[11px] text-slate-500 font-medium hidden md:block">Hệ thống cốt lõi quản trị mô-đun phân tán</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded hidden sm:inline-flex">
              <Cloud size={10} className="shrink-0" />
              SANDBOX
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded hidden lg:inline-flex">
              <Database size={10} className="shrink-0" />
              SQLITE/MOCK DB
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2 border-l border-slate-200 pl-2 sm:pl-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                <span className="hidden sm:inline">Vai trò: </span>{userRole.toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-2.5 sm:py-0 h-auto sm:h-10 flex flex-col sm:flex-row items-center justify-between text-[10px] font-medium text-slate-500 shrink-0 gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 w-full sm:w-auto text-center sm:text-left items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 
              Architecture: Modular Monolith
            </span>
            <span className="flex items-center gap-1.5 hidden sm:flex">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> 
              Agent Tool Registry: Skeleton Only
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <span>NODE_ENV: development</span>
            <span className="hidden sm:inline">FIRESTORE: disconnected</span>
            <span className="text-slate-900 font-bold">Correlation Monitor</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
export default AppShell;
