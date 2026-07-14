import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  moduleId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModuleErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ModuleErrorBoundary] Error in module "${this.props.moduleId}":`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-amber-50/50 border border-amber-200 rounded-xl max-w-2xl mx-auto my-4 shadow-xs text-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                Lỗi cô lập mô-đun: <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-xs font-mono">{this.props.moduleId}</code>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Mô-đun này tạm thời gặp sự cố kết xuất đồ họa và đã được hệ thống cô lập an toàn để không làm gián đoạn toàn bộ ứng dụng App Shell.
              </p>
              {this.state.error && (
                <div className="p-2.5 bg-slate-100/80 border border-slate-200 rounded-md font-mono text-[10px] text-slate-600 overflow-x-auto">
                  <strong>Chi tiết lỗi:</strong> {this.state.error.name}: {this.state.error.message}
                </div>
              )}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 transition rounded-lg cursor-pointer"
                >
                  <RefreshCw size={12} className="animate-pulse" />
                  Tải lại Mô-đun
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  Tải lại toàn trang
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModuleErrorBoundary;
