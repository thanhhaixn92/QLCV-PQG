import React from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Đã xảy ra lỗi", message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 border border-red-100 rounded-2xl max-w-lg mx-auto my-6">
      <div className="p-4 bg-red-100 rounded-full text-red-600 mb-4">
        <AlertOctagon size={32} />
      </div>
      <h3 className="text-lg font-semibold text-gray-950 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition rounded-xl shadow-sm"
        >
          <RotateCcw size={16} />
          Thử lại
        </button>
      )}
    </div>
  );
}
export default ErrorState;
