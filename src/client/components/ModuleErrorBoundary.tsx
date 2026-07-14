import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  moduleId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  correlationId: string | null;
}

export class ModuleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      correlationId: null
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    const correlationId = `ERR-MOD-${randomHex}`;
    return { hasError: true, error, correlationId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const correlationId = this.state.correlationId || "ERR-MOD-UNKNOWN";
    
    // Gửi lỗi vào structured logging của trình duyệt / server log
    const structuredPayload = {
      event: "MODULE_RENDER_ERROR",
      moduleId: this.props.moduleId,
      correlationId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    };
    
    console.error(
      `[ModuleErrorBoundary] Structured Error Details:`,
      JSON.stringify(structuredPayload, null, 2)
    );
  }

  public componentDidUpdate(prevProps: Props) {
    // Reset tự động khi moduleId hoặc vị trí chuyển trang thay đổi
    if (prevProps.moduleId !== this.props.moduleId) {
      this.setState({ hasError: false, error: null, correlationId: null });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, correlationId: null });
  };

  public render() {
    if (this.state.hasError) {
      const isProduction = 
        (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.PROD) ||
        (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production");
      const correlationId = this.state.correlationId || "ERR-MOD-UNKNOWN";

      return (
        <div 
          role="alert" 
          aria-live="assertive" 
          className="p-6 bg-amber-50/50 border border-amber-200 rounded-xl max-w-2xl mx-auto my-4 shadow-xs text-slate-800"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                Lỗi cô lập mô-đun: <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-xs font-mono">{this.props.moduleId}</code>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Mô-đun này tạm thời gặp sự cố kết xuất đồ họa và đã được hệ thống cô lập an toàn để không làm ảnh hưởng đến toàn bộ ứng dụng App Shell.
              </p>
              
              <div className="py-1">
                <span className="text-[11px] font-semibold text-slate-500 font-sans">
                  Mã sự cố (Correlation ID): <code className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono font-bold text-[10px]">{correlationId}</code>
                </span>
              </div>

              {this.state.error && !isProduction && (
                <div className="p-2.5 bg-slate-100/80 border border-slate-200 rounded-md font-mono text-[10px] text-slate-600 overflow-x-auto">
                  <strong>Chi tiết lỗi (Chỉ hiển thị ở chế độ phát triển):</strong> 
                  <br />
                  {this.state.error.name}: {this.state.error.message}
                  {this.state.error.stack && (
                    <pre className="mt-1.5 whitespace-pre-wrap text-[9px] text-slate-500 leading-normal max-h-32 overflow-y-auto">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
              
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 transition rounded-lg cursor-pointer"
                >
                  <RefreshCw size={12} />
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
