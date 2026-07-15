import React from "react";
import { ShieldAlert, LogOut, Key, UserCheck, RefreshCw } from "lucide-react";

interface OwnerAccessDeniedPageProps {
  ownerUid: string;
  currentUid: string;
  allowMockAuth?: boolean;
  onSetRole?: (role: string) => void;
  onLogout?: () => void;
}

export function OwnerAccessDeniedPage({
  ownerUid,
  currentUid,
  allowMockAuth = false,
  onSetRole,
  onLogout
}: OwnerAccessDeniedPageProps) {
  const mockRoles = ["admin", "manager", "editor", "operator", "viewer"];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6 font-sans antialiased text-[#0F172A]">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-8 shadow-md relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-red-50 text-red-600 rounded-full mb-5 border border-red-100 shadow-xs animate-pulse">
            <ShieldAlert size={40} />
          </div>
          
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
            TRUY CẬP BỊ TỪ CHỐI
          </h1>
          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono mb-4">
            Owner Access Denied
          </span>
          
          <p className="text-sm text-slate-500 mb-6 leading-relaxed max-w-sm">
            Hệ thống đang vận hành ở chế độ bảo mật nghiêm ngặt <strong>Đơn Chủ Sở Hữu (Single-Owner)</strong>. Chỉ tài khoản duy nhất khớp với UID đăng ký mới được quyền truy cập dữ liệu nghiệp vụ.
          </p>
          
          {/* Diagnostic Details Box */}
          <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 space-y-3 font-mono text-left">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <UserCheck size={12} className="text-blue-500" />
                UID Chủ sở hữu yêu cầu
              </div>
              <div className="text-xs font-bold text-blue-600 select-all truncate bg-white px-2.5 py-1.5 rounded border border-slate-200 shadow-2xs">
                {ownerUid}
              </div>
            </div>
            
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Key size={12} className="text-red-500" />
                UID tài khoản hiện tại của bạn
              </div>
              <div className="text-xs font-bold text-red-600 select-all truncate bg-white px-2.5 py-1.5 rounded border border-slate-200 shadow-2xs">
                {currentUid || "Chưa xác thực / Anonymous"}
              </div>
            </div>
          </div>
          
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-6 leading-relaxed text-left flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>
              Hành vi truy cập bất hợp pháp này đã được ghi nhận vào nhật ký kiểm toán (Audit Log) của hệ thống cùng với mã Request ID.
            </span>
          </p>

          {/* Development / Sandbox Helper */}
          {allowMockAuth && onSetRole && (
            <div className="w-full border-t border-dashed border-slate-200 pt-5 mt-2 mb-6 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin text-slate-400" />
                SANDBOX: Đổi vai trò giả lập (Chạy Thử Nghiệm)
              </span>
              <div className="flex gap-2">
                <select
                  onChange={(e) => onSetRole(e.target.value)}
                  className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-medium focus:border-blue-500 transition-colors cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>-- Chọn vai trò giả lập --</option>
                  {mockRoles.map((role) => (
                    <option key={role} value={role}>
                      {role.toUpperCase()} (mock-uid-{role})
                    </option>
                  ))}
                  {/* Option specifically designed to match the appOwnerUid if provided */}
                  {ownerUid && !ownerUid.startsWith("mock-uid-") && (
                    <option value={`owner-custom:${ownerUid}`}>
                      OWNER (Sử dụng UID đích)
                    </option>
                  )}
                </select>
              </div>
            </div>
          )}
          
          {onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition rounded-xl shadow-xs cursor-pointer w-full"
            >
              <LogOut size={14} />
              Quay lại Đăng nhập / Reset vai trò
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OwnerAccessDeniedPage;
