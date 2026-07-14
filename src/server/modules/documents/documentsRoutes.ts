import { Router, Response, NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AppRequest } from "../../auth/authTypes";
import { authenticateRequest } from "../../auth/authenticateRequest";
import { checkPermission } from "../../auth/authorization";
import { requireModuleEnabled } from "../moduleStateService";
import { getFirebaseStatus, getConfiguredFirestore } from "../../infrastructure/firebase/firebaseAdmin";
import { auditService } from "../../audit/auditService";
import { AppError } from "../../../shared/errors/appError";
import { logger } from "../../infrastructure/logging/logger";

const STORAGE_DIR = path.join(process.cwd(), "data", "physical_storage");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Multer configurations
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    // Normalization and deduplication
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .substring(0, 50);
    const uniqueId = crypto.randomUUID().substring(0, 8);
    cb(null, `${baseName}_${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const originalName = file.originalname.toLowerCase();
    const ext = path.extname(originalName);
    const blockedExts = [".exe", ".bat", ".sh", ".js", ".vbs", ".cmd", ".com", ".scr", ".msi"];
    if (blockedExts.includes(ext)) {
      cb(new Error("Loại tệp tin có thể gây nguy hại bị hệ thống chặn."));
    } else {
      cb(null, true);
    }
  }
});

// In-memory fallbacks if Firestore is not available
interface DocumentMetadata {
  id: string;
  name: string;
  extension: string;
  size: number;
  physicalPath: string;
  folderId: string | null;
  creator: { uid: string; displayName: string };
  departmentId: string | null;
  taskId: string | null;
  version: number;
  versions: {
    version: number;
    name: string;
    physicalPath: string;
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

const inMemoryDocuments: DocumentMetadata[] = [];
const inMemoryFolders: FolderMetadata[] = [];

// Helper check
function isFirestoreReady(): boolean {
  const status = getFirebaseStatus();
  return status.status === "ready" || status.status === "initialized";
}

// Helper RLS check
function checkDocumentAccess(doc: DocumentMetadata, user: any): boolean {
  if (user.role === "admin" || user.role === "manager") {
    return true;
  }
  if (doc.creator.uid === user.uid) {
    return true;
  }
  if (doc.departmentId && user.departmentIds && user.departmentIds.includes(doc.departmentId)) {
    return true;
  }
  return false;
}

export function registerDocumentsRoutes(router: Router) {
  const documentsRouter = Router();

  documentsRouter.use(requireModuleEnabled("documents"));
  documentsRouter.use(authenticateRequest);

  // GET /api/modules/documents/folders/list
  documentsRouter.get(
    "/folders/list",
    checkPermission("documents.read"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        if (isFirestoreReady()) {
          const db = getConfiguredFirestore();
          const snapshot = await db.collection("folders").get();
          const folders: FolderMetadata[] = [];
          snapshot.forEach((doc) => {
            folders.push(doc.data() as FolderMetadata);
          });
          return res.json({ success: true, data: folders, requestId: req.requestId });
        } else {
          return res.json({ success: true, data: inMemoryFolders, requestId: req.requestId });
        }
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/modules/documents/folders
  documentsRouter.post(
    "/folders",
    checkPermission("documents.create"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const { name, parentFolderId } = req.body;
        if (!name || !name.trim()) {
          throw new AppError("VALIDATION_FAILED", "Tên thư mục không được để trống.");
        }

        const newFolder: FolderMetadata = {
          id: `folder-${crypto.randomUUID().substring(0, 12)}`,
          name: name.trim(),
          parentFolderId: parentFolderId || null,
          creatorUid: req.user!.uid,
          createdAt: new Date().toISOString()
        };

        if (isFirestoreReady()) {
          const db = getConfiguredFirestore();
          await db.collection("folders").doc(newFolder.id).set(newFolder);
        } else {
          inMemoryFolders.push(newFolder);
        }

        auditService.logEvent({
          actor: { type: "user", id: req.user!.uid },
          action: "document.folder.created",
          moduleId: "documents",
          targetType: "folder",
          targetId: newFolder.id,
          requestId: req.requestId!,
          result: "success"
        });

        res.json({ success: true, data: newFolder, requestId: req.requestId });
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/modules/documents/list
  documentsRouter.get(
    "/list",
    checkPermission("documents.read"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const folderId = req.query.folderId ? String(req.query.folderId) : null;
        const taskId = req.query.taskId ? String(req.query.taskId) : null;
        const search = req.query.search ? String(req.query.search).toLowerCase() : "";

        let docs: DocumentMetadata[] = [];

        if (isFirestoreReady()) {
          const db = getConfiguredFirestore();
          let query: any = db.collection("documents");
          const snapshot = await query.get();
          snapshot.forEach((doc: any) => {
            docs.push(doc.data() as DocumentMetadata);
          });
        } else {
          docs = [...inMemoryDocuments];
        }

        // Apply RLS checking
        const filtered = docs.filter((doc) => {
          if (!checkDocumentAccess(doc, req.user)) {
            return false;
          }
          if (folderId && doc.folderId !== folderId) {
            return false;
          }
          if (taskId && doc.taskId !== taskId) {
            return false;
          }
          if (search && !doc.name.toLowerCase().includes(search)) {
            return false;
          }
          return true;
        });

        res.json({ success: true, data: filtered, requestId: req.requestId });
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/modules/documents/upload
  documentsRouter.post(
    "/upload",
    checkPermission("documents.create"),
    upload.single("file"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          throw new AppError("VALIDATION_FAILED", "Yêu cầu cung cấp tệp tải lên hợp lệ.");
        }

        const { folderId, departmentId, taskId } = req.body;
        const file = req.file;

        const docId = `doc-${crypto.randomUUID().substring(0, 12)}`;
        const ext = path.extname(file.originalname).substring(1);

        const newDoc: DocumentMetadata = {
          id: docId,
          name: file.originalname,
          extension: ext,
          size: file.size,
          physicalPath: file.filename,
          folderId: folderId || null,
          creator: {
            uid: req.user!.uid,
            displayName: req.user!.displayName || req.user!.email || "Nguời dùng"
          },
          departmentId: departmentId || null,
          taskId: taskId || null,
          version: 1,
          versions: [
            {
              version: 1,
              name: file.originalname,
              physicalPath: file.filename,
              size: file.size,
              uploadedAt: new Date().toISOString(),
              uploadedBy: {
                uid: req.user!.uid,
                displayName: req.user!.displayName || req.user!.email || "Nguời dùng"
              }
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (isFirestoreReady()) {
          const db = getConfiguredFirestore();
          await db.collection("documents").doc(docId).set(newDoc);
        } else {
          inMemoryDocuments.push(newDoc);
        }

        auditService.logEvent({
          actor: { type: "user", id: req.user!.uid },
          action: "document.created",
          moduleId: "documents",
          targetType: "document",
          targetId: docId,
          requestId: req.requestId!,
          result: "success"
        });

        res.json({ success: true, data: newDoc, requestId: req.requestId });
      } catch (error: any) {
        // Cleanup file if upload failed
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        next(error instanceof Error ? new AppError("VALIDATION_FAILED", error.message) : error);
      }
    }
  );

  // POST /api/modules/documents/:id/version
  documentsRouter.post(
    "/:id/version",
    checkPermission("documents.update"),
    upload.single("file"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const docId = req.params.id;
        if (!req.file) {
          throw new AppError("VALIDATION_FAILED", "Yêu cầu cung cấp tệp tải lên cho phiên bản mới.");
        }

        let doc: DocumentMetadata | null = null;

        if (isFirestoreReady()) {
          const db = getConfiguredFirestore();
          const snap = await db.collection("documents").doc(docId).get();
          if (snap.exists) {
            doc = snap.data() as DocumentMetadata;
          }
        } else {
          const found = inMemoryDocuments.find((d) => d.id === docId);
          if (found) doc = found;
        }

        if (!doc) {
          throw new AppError("VALIDATION_FAILED", "Tài liệu không tồn tại.");
        }

        if (!checkDocumentAccess(doc, req.user)) {
          throw new AppError("PERMISSION_DENIED", "Bạn không có quyền cập nhật tài liệu này.");
        }

        const file = req.file;
        const nextVer = doc.version + 1;

        const updatedDoc: DocumentMetadata = {
          ...doc,
          name: file.originalname,
          extension: path.extname(file.originalname).substring(1),
          size: file.size,
          physicalPath: file.filename,
          version: nextVer,
          versions: [
            ...doc.versions,
            {
              version: nextVer,
              name: file.originalname,
              physicalPath: file.filename,
              size: file.size,
              uploadedAt: new Date().toISOString(),
              uploadedBy: {
                uid: req.user!.uid,
                displayName: req.user!.displayName || req.user!.email || "Người dùng"
              }
            }
          ],
          updatedAt: new Date().toISOString()
        };

        if (isFirestoreReady()) {
          const db = getConfiguredFirestore();
          await db.collection("documents").doc(docId).set(updatedDoc);
        } else {
          const idx = inMemoryDocuments.findIndex((d) => d.id === docId);
          inMemoryDocuments[idx] = updatedDoc;
        }

        auditService.logEvent({
          actor: { type: "user", id: req.user!.uid },
          action: "document.version.added",
          moduleId: "documents",
          targetType: "document",
          targetId: docId,
          requestId: req.requestId!,
          result: "success"
        });

        res.json({ success: true, data: updatedDoc, requestId: req.requestId });
      } catch (error: any) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        next(error instanceof Error ? new AppError("VALIDATION_FAILED", error.message) : error);
      }
    }
  );

  // GET /api/modules/documents/download/:id
  documentsRouter.get(
    "/download/:id",
    checkPermission("documents.read"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const docId = req.params.id;
        const verParam = req.query.version ? parseInt(String(req.query.version), 10) : null;

        let doc: DocumentMetadata | null = null;

        if (isFirestoreReady()) {
          const db = getConfiguredFirestore();
          const snap = await db.collection("documents").doc(docId).get();
          if (snap.exists) {
            doc = snap.data() as DocumentMetadata;
          }
        } else {
          const found = inMemoryDocuments.find((d) => d.id === docId);
          if (found) doc = found;
        }

        if (!doc) {
          throw new AppError("VALIDATION_FAILED", "Tài liệu không tồn tại.");
        }

        if (!checkDocumentAccess(doc, req.user)) {
          throw new AppError("PERMISSION_DENIED", "Bạn không có quyền tải tài liệu này.");
        }

        let physicalPath = doc.physicalPath;
        let originalName = doc.name;

        if (verParam) {
          const verObj = doc.versions.find((v) => v.version === verParam);
          if (!verObj) {
            throw new AppError("VALIDATION_FAILED", `Không tìm thấy phiên bản ${verParam} của tài liệu.`);
          }
          physicalPath = verObj.physicalPath;
          originalName = verObj.name;
        }

        const filePath = path.join(STORAGE_DIR, physicalPath);
        if (!fs.existsSync(filePath)) {
          throw new AppError("VALIDATION_FAILED", "Không tìm thấy tệp tin vật lý trên máy chủ.");
        }

        auditService.logEvent({
          actor: { type: "user", id: req.user!.uid },
          action: "document.downloaded",
          moduleId: "documents",
          targetType: "document",
          targetId: docId,
          requestId: req.requestId!,
          result: "success"
        });

        res.download(filePath, originalName);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/modules/documents/:id
  documentsRouter.delete(
    "/:id",
    checkPermission("documents.delete"),
    async (req: AppRequest, res: Response, next: NextFunction) => {
      try {
        const docId = req.params.id;
        let doc: DocumentMetadata | null = null;

        if (isFirestoreReady()) {
          const db = getConfiguredFirestore();
          const snap = await db.collection("documents").doc(docId).get();
          if (snap.exists) {
            doc = snap.data() as DocumentMetadata;
          }
        } else {
          const found = inMemoryDocuments.find((d) => d.id === docId);
          if (found) doc = found;
        }

        if (!doc) {
          throw new AppError("VALIDATION_FAILED", "Tài liệu không tồn tại.");
        }

        if (!checkDocumentAccess(doc, req.user)) {
          throw new AppError("PERMISSION_DENIED", "Bạn không có quyền xóa tài liệu này.");
        }

        // Delete metadata
        if (isFirestoreReady()) {
          const db = getConfiguredFirestore();
          await db.collection("documents").doc(docId).delete();
        } else {
          const idx = inMemoryDocuments.findIndex((d) => d.id === docId);
          inMemoryDocuments.splice(idx, 1);
        }

        // Try to delete physical files
        for (const ver of doc.versions) {
          const filePath = path.join(STORAGE_DIR, ver.physicalPath);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.warn(`Failed to delete physical file: ${filePath}`);
            }
          }
        }

        auditService.logEvent({
          actor: { type: "user", id: req.user!.uid },
          action: "document.deleted",
          moduleId: "documents",
          targetType: "document",
          targetId: docId,
          requestId: req.requestId!,
          result: "success"
        });

        res.json({ success: true, message: "Xóa tài liệu thành công.", requestId: req.requestId });
      } catch (error) {
        next(error);
      }
    }
  );

  router.use("/api/modules/documents", documentsRouter);
}
export default registerDocumentsRoutes;
