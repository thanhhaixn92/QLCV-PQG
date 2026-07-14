import React, { useEffect, useState, useRef } from "react";
import { apiClient } from "../../services/apiClient";
import { tokenService } from "../../infrastructure/firebase/tokenService";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { 
  Folder, File, FileText, Upload, Plus, Trash2, Download, Search, 
  History, ArrowLeft, RefreshCw, X, Check, Save, Link2, Eye, EyeOff, FileCode
} from "lucide-react";

interface DocumentMetadata {
  id: string;
  name: string;
  extension: string;
  size: number;
  folderId: string | null;
  creator: { uid: string; displayName: string };
  departmentId: string | null;
  taskId: string | null;
  version: number;
  versions: {
    version: number;
    name: string;
    size: number;
    uploadedAt: string;
    uploadedBy: { uid: string; displayName: string };
  }[];
  createdAt: string;
  updatedAt: string;
}

interface FolderMetadata {
  id: string;
  name: string;
  parentFolderId: string | null;
  creatorUid: string;
  createdAt: string;
}

interface TaskSummary {
  id: string;
  title: string;
}

export function DocumentsModuleView() {
  const [folders, setFolders] = useState<FolderMetadata[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals / Inputs
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  
  // Editor State
  const [editorTitle, setEditorTitle] = useState("untitled.md");
  const [editorContent, setEditorContent] = useState("# Tiêu đề Bản Thảo\n\nViết nội dung bản thảo hoặc ghi chú biên tập của bạn tại đây...");
  const [editorPreview, setEditorPreview] = useState(false);

  // File Uploading States
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail Modal / Version History
  const [selectedDoc, setSelectedDoc] = useState<DocumentMetadata | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const versionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, [selectedFolderId, selectedTaskId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Folders
      const foldersRes = await apiClient.request<{ success: boolean; data: FolderMetadata[] }>(
        "/api/modules/documents/folders/list"
      );
      if (foldersRes.success) {
        setFolders(foldersRes.data);
      }

      // Fetch Documents
      let docUrl = "/api/modules/documents/list";
      const params: string[] = [];
      if (selectedFolderId) params.push(`folderId=${selectedFolderId}`);
      if (selectedTaskId) params.push(`taskId=${selectedTaskId}`);
      if (params.length > 0) docUrl += "?" + params.join("&");

      const docsRes = await apiClient.request<{ success: boolean; data: DocumentMetadata[] }>(docUrl);
      if (docsRes.success) {
        setDocuments(docsRes.data);
      }

      // Try Fetching Tasks if tasks module is enabled/available
      try {
        const tasksRes = await apiClient.request<{ success: boolean; data: { tasks: TaskSummary[] } }>(
          "/api/modules/tasks-query/tasks?limit=100"
        );
        if (tasksRes.success && tasksRes.data?.tasks) {
          setTasks(tasksRes.data.tasks);
        }
      } catch (e) {
        // Soft fail if tasks module is disabled
        console.warn("Tasks module currently disabled or unavailable:", e);
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu tài liệu.");
    } finally {
      setLoading(false);
    }
  };

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await apiClient.request<{ success: boolean; data: FolderMetadata }>("/api/modules/documents/folders", {
        method: "POST",
        body: JSON.stringify({ name: newFolderName, parentFolderId: null })
      });
      if (res.success) {
        setFolders([...folders, res.data]);
        setNewFolderName("");
        setShowFolderModal(false);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi khi tạo thư mục.");
    }
  };

  // Helper file size formatter
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icons based on extension
  const getFileIcon = (ext: string) => {
    const e = ext.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg"].includes(e)) return "🖼️";
    if (["pdf"].includes(e)) return "📕";
    if (["doc", "docx"].includes(e)) return "📘";
    if (["xls", "xlsx", "csv"].includes(e)) return "📗";
    if (["ppt", "pptx"].includes(e)) return "📙";
    if (["zip", "rar", "7z", "tar"].includes(e)) return "🗜️";
    if (["md", "txt"].includes(e)) return "📝";
    return "📄";
  };

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  // Upload File
  const uploadFile = async (file: File, docIdToUpdate?: string) => {
    // Client-side validations
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const blockedExts = [".exe", ".bat", ".sh", ".js", ".vbs", ".cmd", ".com", ".scr", ".msi"];
    if (blockedExts.includes(ext)) {
      alert("Loại tệp tin này bị hệ thống chặn vì lý do bảo mật.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert("Kích thước tệp vượt quá giới hạn 20MB.");
      return;
    }

    setUploadProgress("Đang tải tệp lên...");
    try {
      const authHeaders = await tokenService.getAuthorizationHeaders();
      const formData = new FormData();
      formData.append("file", file);
      if (selectedFolderId) formData.append("folderId", selectedFolderId);
      if (selectedTaskId) formData.append("taskId", selectedTaskId);

      const url = docIdToUpdate 
        ? `/api/modules/documents/${docIdToUpdate}/version` 
        : "/api/modules/documents/upload";

      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...authHeaders
        },
        body: formData
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Tải lên thất bại.");
      }

      setUploadProgress(null);
      fetchInitialData();
      if (docIdToUpdate && selectedDoc) {
        setSelectedDoc(json.data);
      }
    } catch (err: any) {
      setUploadProgress(null);
      alert(err.message || "Lỗi trong quá trình tải tệp lên.");
    }
  };

  // Download File
  const downloadDoc = async (docId: string, version?: number) => {
    try {
      const authHeaders = await tokenService.getAuthorizationHeaders();
      let url = `/api/modules/documents/download/${docId}`;
      if (version) url += `?version=${version}`;

      const res = await fetch(url, {
        headers: {
          ...authHeaders
        }
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Tải xuống thất bại.");
      }

      const disposition = res.headers.get("content-disposition");
      let filename = "download";
      if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.message || "Lỗi khi tải xuống.");
    }
  };

  // Delete Doc
  const deleteDoc = async (docId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này và toàn bộ các phiên bản cũ?")) return;

    try {
      const res = await apiClient.request<{ success: boolean; message: string }>(
        `/api/modules/documents/${docId}`,
        { method: "DELETE" }
      );
      if (res.success) {
        setDocuments(documents.filter((d) => d.id !== docId));
        setSelectedDoc(null);
        setShowVersionModal(false);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi khi xóa tài liệu.");
    }
  };

  // Editor Save
  const handleEditorSave = async () => {
    if (!editorTitle.trim()) {
      alert("Vui lòng điền tên tập tin biên tập.");
      return;
    }

    try {
      const contentBlob = new Blob([editorContent], { type: "text/markdown" });
      const mdFile = new File([contentBlob], editorTitle.trim(), { type: "text/markdown" });
      await uploadFile(mdFile);
      setShowEditor(false);
    } catch (err: any) {
      alert(err.message || "Lỗi khi lưu và tải lên bản thảo.");
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      {/* Top action bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            📂 Thư viện Tài liệu & Biên tập
          </h1>
          <p className="text-xs text-slate-500">
            Quản lý tài liệu phòng ban, phiên bản, bảo mật tuyệt đối qua API Proxy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Save className="w-4 h-4" />
            {showEditor ? "Đóng trình biên tập" : "Viết & Biên tập mới"}
          </button>
          <button
            onClick={fetchInitialData}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-500"
            title="Tải lại thư viện"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thư mục</span>
            <button
              onClick={() => setShowFolderModal(true)}
              className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
              title="Tạo thư mục mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition ${
                selectedFolderId === null ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Tất cả tài liệu</span>
            </button>

            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition ${
                  selectedFolderId === f.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Folder className="w-4 h-4 fill-slate-100 text-slate-400" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>

          {/* Task Association list if query tasks is enabled */}
          {tasks.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Liên kết theo công việc</label>
              <select
                value={selectedTaskId || ""}
                onChange={(e) => setSelectedTaskId(e.target.value || null)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="">-- Tất cả công việc --</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Workspace area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 min-h-0">
          {error && <ErrorState message={error} />}

          {/* Rich Content Editor */}
          {showEditor && (
            <div className="bg-white border border-indigo-100 rounded-xl shadow-sm p-5 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-indigo-800">Trình biên tập Markdown Bản Thảo</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditorPreview(!editorPreview)}
                    className="text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200 transition flex items-center gap-1.5"
                  >
                    {editorPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {editorPreview ? "Trở lại soạn thảo" : "Xem thử bản xem trước"}
                  </button>
                  <button onClick={() => setShowEditor(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Tên tập tin lưu trữ (phải có phần mở rộng .md)</label>
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Thư mục tải lên hiện tại</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedFolderId ? (folders.find(f => f.id === selectedFolderId)?.name || "Thư mục đã chọn") : "Thư viện chính"}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-sm text-slate-500 outline-none"
                  />
                </div>
              </div>

              {editorPreview ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[250px] prose prose-slate max-w-none text-sm">
                  {editorContent.split("\n").map((line, idx) => {
                    if (line.startsWith("# ")) {
                      return <h1 key={idx} className="text-xl font-bold text-slate-950 mt-3 mb-1">{line.substring(2)}</h1>;
                    }
                    if (line.startsWith("## ")) {
                      return <h2 key={idx} className="text-lg font-bold text-slate-900 mt-2.5 mb-1">{line.substring(3)}</h2>;
                    }
                    if (line.startsWith("- ") || line.startsWith("* ")) {
                      return <li key={idx} className="ml-4 list-disc text-slate-700">{line.substring(2)}</li>;
                    }
                    return <p key={idx} className="text-slate-700 mb-1.5 min-h-[1.2rem]">{line}</p>;
                  })}
                </div>
              ) : (
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="w-full h-64 border border-slate-200 rounded-lg p-3 font-mono text-sm focus:outline-none focus:border-indigo-300"
                />
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleEditorSave}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg transition text-sm font-medium flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Lưu & Tải lên thư viện
                </button>
              </div>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition ${
              dragActive ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Kéo thả tài liệu để tải lên ngay</h3>
              <p className="text-xs text-slate-400 mt-1">
                Chấp nhận mọi tệp tin phổ thông (PDF, Office, Images, Text, ZIP...) tối đa 20MB.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition"
              >
                Chọn tệp từ máy tính
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-300"
            />
          </div>

          {/* Document list */}
          {loading ? (
            <LoadingState />
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
              <p className="text-slate-400 text-sm">Không tìm thấy tài liệu nào trong bộ lọc này.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Tên tài liệu</th>
                      <th className="px-6 py-3">Kích thước</th>
                      <th className="px-6 py-3">Phiên bản</th>
                      <th className="px-6 py-3">Người đăng</th>
                      <th className="px-6 py-3">Ngày cập nhật</th>
                      <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{getFileIcon(doc.extension)}</span>
                            <div>
                              <span className="font-semibold text-slate-900 block truncate max-w-xs">{doc.name}</span>
                              {doc.taskId && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full mt-0.5">
                                  <Link2 className="w-2.5 h-2.5" />
                                  Liên kết công việc
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">{formatBytes(doc.size)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              setShowVersionModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-2 py-1 rounded"
                          >
                            <History className="w-3 h-3" />
                            v{doc.version}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">{doc.creator.displayName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                          {new Date(doc.updatedAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-1">
                          <button
                            onClick={() => downloadDoc(doc.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition inline-flex items-center"
                            title="Tải xuống tài liệu"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteDoc(doc.id)}
                            className="p-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition inline-flex items-center"
                            title="Xóa tài liệu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Show Version History & Upload New Version Modal */}
      {showVersionModal && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-950">Lịch sử phiên bản tài liệu</h3>
                <p className="text-xs text-slate-500 truncate max-w-md">{selectedDoc.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowVersionModal(false);
                  setSelectedDoc(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Các phiên bản trước đó</span>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {selectedDoc.versions.map((ver) => (
                    <div key={ver.version} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-semibold bg-slate-100 text-slate-700 w-7 h-7 flex items-center justify-center rounded-full">
                          v{ver.version}
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">{ver.name}</span>
                          <span className="text-[10px] text-slate-400 block">
                            Bởi {ver.uploadedBy.displayName} • {new Date(ver.uploadedAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 mr-2">{formatBytes(ver.size)}</span>
                        <button
                          onClick={() => downloadDoc(selectedDoc.id, ver.version)}
                          className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 transition border border-slate-200"
                          title="Tải xuống phiên bản này"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-lg text-center">
                <span className="text-xs font-semibold text-slate-600 block mb-2">Tải lên phiên bản mới (Cập nhật ghi đè)</span>
                <button
                  onClick={() => versionInputRef.current?.click()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  Chọn phiên bản mới thay thế
                </button>
                <input
                  type="file"
                  ref={versionInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      uploadFile(e.target.files[0], selectedDoc.id);
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setShowVersionModal(false);
                  setSelectedDoc(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateFolder} className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-950">Tạo thư mục tài liệu mới</h3>
              <button type="button" onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên thư mục</label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ví dụ: Công văn, Hợp đồng..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:bg-white"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition text-xs font-semibold"
              >
                Tạo mới
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
