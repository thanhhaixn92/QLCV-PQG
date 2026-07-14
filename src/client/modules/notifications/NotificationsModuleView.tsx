import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Send, 
  Check, 
  Inbox, 
  Calendar, 
  User,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { apiClient } from "../../services/apiClient";

interface InAppNotification {
  id: string;
  recipientUid: string;
  title: string;
  body: string;
  type: string;
  status: "unread" | "read";
  relatedTaskId?: string;
  createdAt: string;
}

interface SimulatedEmail {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
}

export function NotificationsModuleView() {
  const [activeTab, setActiveTab] = useState<"inapp" | "emails" | "test">("inapp");
  
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Email test form state
  const [testRecipient, setTestRecipient] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [testBody, setTestBody] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const notifRes = await apiClient.request<{ success: boolean; data: InAppNotification[] }>("/api/notifications");
      if (notifRes && notifRes.success) {
        setNotifications(notifRes.data);
      }

      const emailRes = await apiClient.request<{ success: boolean; data: SimulatedEmail[] }>("/api/notifications/emails");
      if (emailRes && emailRes.success) {
        setEmails(emailRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách thông báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiClient.request<{ success: boolean }>(`/api/notifications/mark-read`, {
        method: "POST",
        body: JSON.stringify({ ids: [id] })
      });
      if (res && res.success) {
        setSuccess("Đã đánh dấu thông báo là đã đọc.");
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật trạng thái thông báo.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => n.status === "unread").map(n => n.id);
    if (unreadIds.length === 0) {
      setSuccess("Tất cả thông báo đều đã được đọc.");
      setTimeout(() => setSuccess(null), 3000);
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.request<{ success: boolean }>(`/api/notifications/mark-read`, {
        method: "POST",
        body: JSON.stringify({ ids: unreadIds })
      });
      if (res && res.success) {
        setSuccess("Đã đánh dấu tất cả thông báo là đã đọc.");
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật trạng thái thông báo.");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerScan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.request<{ success: boolean; data: { scanned: number; notificationsCreated: number } }>("/api/notifications/trigger-scan", {
        method: "POST"
      });
      if (res && res.success) {
        setSuccess(`Hoàn tất quét hệ thống! Đã kiểm tra các công việc. Đã gửi ${res.data.notificationsCreated} cảnh báo mới.`);
        loadData();
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Quét tác vụ quá hạn thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient || !testSubject || !testBody) {
      setError("Vui lòng điền đầy đủ thông tin gửi email.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.request<{ success: boolean }>("/api/notifications/send-test-email", {
        method: "POST",
        body: JSON.stringify({
          recipient: testRecipient.trim(),
          subject: testSubject.trim(),
          body: testBody.trim()
        })
      });
      if (res && res.success) {
        setSuccess(`Đã gửi email thử nghiệm đến: ${testRecipient}`);
        setTestRecipient("");
        setTestSubject("");
        setTestBody("");
        loadData();
        setActiveTab("emails");
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Gửi email thử nghiệm thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm max-w-5xl mx-auto overflow-hidden">
      {/* MODULE HEADER */}
      <div className="p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between border-b border-slate-700 gap-4">
        <div>
          <div className="flex items-center gap-3.5 mb-1">
            <div className="p-2 bg-blue-500 rounded text-white shadow-xs">
              <Bell size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans tracking-tight">Mô-đun Thông báo & Cảnh báo</h2>
              <p className="text-xs text-slate-400">Giám sát công việc quá hạn, nhắc nhở thông minh và email cảnh báo</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleTriggerScan}
            disabled={loading}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white text-xs font-bold px-4 py-2 rounded shadow-xs cursor-pointer transition"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Quét việc quá hạn
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
            title="Tải lại thông tin"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-2.5 text-red-800 text-xs">
          <AlertTriangle className="shrink-0 text-red-600" size={14} />
          <div className="font-sans font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-start gap-2.5 text-emerald-800 text-xs">
          <CheckCircle2 className="shrink-0 text-emerald-600" size={14} />
          <div className="font-sans font-medium">{success}</div>
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => setActiveTab("inapp")}
          className={`px-5 py-3 text-xs font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "inapp"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Bell size={14} />
          Trong ứng dụng ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab("emails")}
          className={`px-5 py-3 text-xs font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "emails"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Mail size={14} />
          Lịch sử Email ({emails.length})
        </button>
        <button
          onClick={() => setActiveTab("test")}
          className={`px-5 py-3 text-xs font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "test"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Send size={14} />
          Gửi Email Thử Nghiệm
        </button>
      </div>

      {/* CONTENT PANELS */}
      <div className="p-5">
        {/* 1. IN APP NOTIFICATIONS */}
        {activeTab === "inapp" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Thông báo nhận được</h3>
              <button
                onClick={handleMarkAllRead}
                disabled={loading || notifications.filter(n => n.status === "unread").length === 0}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Check size={14} />
                Đọc tất cả
              </button>
            </div>

            <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border rounded transition flex items-start gap-3.5 relative ${
                    notif.status === "unread"
                      ? "bg-blue-50/50 border-blue-100"
                      : "bg-white border-slate-100 opacity-80"
                  }`}
                >
                  {/* Status Indicator */}
                  {notif.status === "unread" && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-600" title="Chưa đọc"></div>
                  )}

                  <div className={`p-2 rounded shrink-0 ${
                    notif.type === "overdue" 
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : notif.type === "near_due"
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : "bg-blue-50 text-blue-600 border border-blue-100"
                  }`}>
                    {notif.type === "overdue" ? (
                      <ShieldAlert size={16} />
                    ) : notif.type === "near_due" ? (
                      <Clock size={16} />
                    ) : (
                      <Bell size={16} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800">{notif.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{formatDate(notif.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">{notif.body}</p>
                    {notif.relatedTaskId && (
                      <div className="mt-2 text-[10px] text-slate-400 font-mono">
                        ID công việc liên kết: <span className="font-bold">{notif.relatedTaskId}</span>
                      </div>
                    )}
                  </div>

                  {notif.status === "unread" && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition px-2 py-1 rounded hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer"
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="text-center py-16 text-slate-400 italic space-y-2">
                  <Inbox size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs">Chưa có thông báo nào nhận được.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. SIMULATED EMAIL HISTORY */}
        {activeTab === "emails" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Thư mục Thư đã gửi (Mô phỏng)</h3>
            
            <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
              {emails.map((email) => (
                <div key={email.id} className="p-4 border border-slate-200 bg-slate-50/50 rounded-lg hover:border-slate-300 transition space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User size={12} className="text-slate-400" />
                        Người nhận: <span className="font-bold text-slate-700 font-mono">{email.recipient}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 font-sans">{email.subject}</div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(email.sentAt)}
                    </span>
                  </div>
                  <pre className="text-[11px] text-slate-600 font-mono bg-white p-3 rounded border border-slate-100 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {email.body}
                  </pre>
                </div>
              ))}

              {emails.length === 0 && (
                <div className="text-center py-16 text-slate-400 italic space-y-2">
                  <Mail size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs">Chưa có email nào được gửi trong hệ thống.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. TEST SEND EMAIL FORM */}
        {activeTab === "test" && (
          <form onSubmit={handleSendTestEmail} className="space-y-4 max-w-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Soạn thảo email mô phỏng</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">Địa chỉ email nhận</label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="manager@qlcv.local"
                  className="w-full text-xs border border-slate-300 rounded p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">Tiêu đề email</label>
                <input
                  type="text"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  placeholder="[Cảnh báo] Việc quá hạn..."
                  className="w-full text-xs border border-slate-300 rounded p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">Nội dung thư điện tử</label>
                <textarea
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  placeholder="Nội dung thư..."
                  rows={6}
                  className="w-full text-xs border border-slate-300 rounded p-2.5 bg-white text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded shadow-xs cursor-pointer transition"
                >
                  <Send size={13} />
                  Gửi thư điện tử (Mô phỏng)
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default NotificationsModuleView;
