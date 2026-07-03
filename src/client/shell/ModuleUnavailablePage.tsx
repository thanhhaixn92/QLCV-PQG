import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface ModuleUnavailablePageProps {
  moduleId?: string;
  reason?: string;
  onGoBack?: () => void;
}

export function ModuleUnavailablePage({
  moduleId = "tasks-query",
  reason = "Mô-đun này hiện đang bị vô hiệu hóa bởi máy chủ hoặc tài khoản của bạn chưa được phân quyền truy cập.",
  onGoBack
}: ModuleUnavailablePageProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 border border-gray-200 rounded-2xl max-w-xl mx-auto my-12 shadow-xs">
      <div className="p-4 bg-amber-50 text-amber-600 rounded-full mb-4">
        <ShieldAlert size={36} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Mô-đun Không Khả Dụng</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md leading-relaxed">
        {reason} (Mã mô-đun: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-xs">{moduleId}</code>)
      </p>
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition rounded-xl"
        >
          <ArrowLeft size={16} />
          Quay lại Trang Chủ
        </button>
      )}
    </div>
  );
}
export default ModuleUnavailablePage;
