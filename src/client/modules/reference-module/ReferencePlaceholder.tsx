import React, { useEffect, useState } from "react";
import { Cpu, RefreshCw, Layers, ShieldCheck, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../services/apiClient";

export function ReferencePlaceholder() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request<any>("/api/modules/reference/info");
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Không thể nạp dữ liệu từ API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        {/* Header section */}
        <div className="p-6 sm:p-8 border-b border-slate-700 bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 border border-blue-500/20">
              <Cpu size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Mô-đun Tham chiếu Chuẩn</h1>
              <p className="text-xs text-slate-400 mt-1">Khuôn mẫu thiết kế giao diện và dịch vụ mở rộng (Reference Module)</p>
            </div>
          </div>
          <button
            onClick={fetchInfo}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-600 hover:border-slate-500 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg space-y-1.5">
              <div className="flex items-center gap-2 text-blue-400">
                <Layers size={16} />
                <h3 className="text-xs font-bold uppercase tracking-wider">Kiến trúc Cô lập</h3>
              </div>
              <p className="text-xs text-slate-300">Hoàn toàn độc lập khỏi lõi, đăng ký động thông qua hệ thống Manifest Catalog.</p>
            </div>

            <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck size={16} />
                <h3 className="text-xs font-bold uppercase tracking-wider">Xác thực Chặt chẽ</h3>
              </div>
              <p className="text-xs text-slate-300">Tích hợp sẵn rào cản Middleware kiểm tra trạng thái mô-đun và kiểm soát định danh.</p>
            </div>

            <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400">
                <CheckCircle2 size={16} />
                <h3 className="text-xs font-bold uppercase tracking-wider">Đạt Chuẩn Lập trình</h3>
              </div>
              <p className="text-xs text-slate-300">Đầy đủ các kiểm định tĩnh, kiểm tra phụ thuộc vòng và quản lý phiên bản.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-slate-400">
              <span>TRẠNG THÁI KIỂM TRA ĐỒNG BỘ MÁY CHỦ</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">API CHỐT</span>
            </div>

            {loading ? (
              <div className="text-slate-400 py-4 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Đang gửi yêu cầu xác thực API...
              </div>
            ) : error ? (
              <div className="text-rose-400 py-4">
                ❌ Lỗi kết nối: {error}
              </div>
            ) : (
              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Thông điệp phản hồi:</span>
                  <span className="text-emerald-400 text-right font-semibold">{data?.message}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã yêu cầu (ReqID):</span>
                  <span className="text-blue-400">{data?.requestId || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời gian phản hồi:</span>
                  <span className="text-slate-400">{data?.timestamp}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default ReferencePlaceholder;
