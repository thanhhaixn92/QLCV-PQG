import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message: string;
}

export function EmptyState({ title = "Trống", message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 border border-gray-100 rounded-2xl max-w-md mx-auto my-4">
      <div className="p-4 bg-gray-100 rounded-full text-gray-400 mb-4">
        <Inbox size={28} />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}
export default EmptyState;
