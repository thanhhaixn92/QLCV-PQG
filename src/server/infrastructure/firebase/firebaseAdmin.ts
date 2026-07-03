import { getApps, initializeApp, App, cert, applicationDefault, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { serverConfig } from "../../app/serverConfig";

export type FirebaseAdminStatus =
  | "not-configured"
  | "configured"
  | "initialized"
  | "ready"
  | "error"
  | "mocked";

let adminStatus: FirebaseAdminStatus = "not-configured";
let initErrorMsg: string | null = null;
let isMockedMode = false;
let isProbed = false;

// Mock verifier for isolated unit/integration tests without secrets
let mockTokenVerifier: ((token: string) => Promise<any>) | null = null;

export function setMockTokenVerifier(verifier: ((token: string) => Promise<any>) | null) {
  mockTokenVerifier = verifier;
}

export function initFirebaseAdmin(): App | null {
  const {
    firebaseProjectId,
    firebaseServiceAccountJson,
    firebaseServiceAccountBase64,
    googleApplicationCredentials,
    allowMockAuth,
  } = serverConfig;

  const hasAnyConfig = !!(
    firebaseProjectId ||
    firebaseServiceAccountJson ||
    firebaseServiceAccountBase64 ||
    googleApplicationCredentials ||
    allowMockAuth
  );

  if (!hasAnyConfig) {
    adminStatus = "not-configured";
    isMockedMode = false;
    isProbed = false;
    return null;
  }

  const activeApps = getApps();
  // If already initialized, return the existing app
  if (activeApps && activeApps.length > 0) {
    if (isMockedMode) {
      adminStatus = "mocked";
    } else if (isProbed) {
      adminStatus = "ready";
    } else {
      adminStatus = "initialized";
    }
    return activeApps[0];
  }

  try {
    // 1. Try FIREBASE_SERVICE_ACCOUNT_JSON if provided
    if (firebaseServiceAccountJson) {
      const serviceAccount = JSON.parse(firebaseServiceAccountJson);
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: firebaseProjectId || serviceAccount.project_id,
      });
      adminStatus = "initialized";
      isMockedMode = false;
      isProbed = false;
      return app;
    }

    // 2. Try FIREBASE_SERVICE_ACCOUNT_BASE64 if provided
    if (firebaseServiceAccountBase64) {
      const decoded = Buffer.from(firebaseServiceAccountBase64, "base64").toString("utf-8");
      const serviceAccount = JSON.parse(decoded);
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: firebaseProjectId || serviceAccount.project_id,
      });
      adminStatus = "initialized";
      isMockedMode = false;
      isProbed = false;
      return app;
    }

    // 3. Try GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials
    if (googleApplicationCredentials || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
      const app = initializeApp({
        credential: applicationDefault(),
        projectId: firebaseProjectId,
      });
      adminStatus = "initialized";
      isMockedMode = false;
      isProbed = false;
      return app;
    }

    // 4. Try development mock only when ALLOW_MOCK_AUTH = true
    if (allowMockAuth) {
      adminStatus = "mocked";
      isMockedMode = true;
      isProbed = true;
      return null;
    }

    // If we have firebaseProjectId, we are "configured" but missing credentials to initialize
    if (firebaseProjectId) {
      adminStatus = "configured";
      return null;
    }

    adminStatus = "not-configured";
    return null;
  } catch (error: any) {
    adminStatus = "error";
    initErrorMsg = error?.message || String(error);
    console.error("Firebase Admin initialization error:", error);
    return null;
  }
}

export async function probeAuthService(): Promise<boolean> {
  const activeApps = getApps();
  if (activeApps.length === 0) return false;
  try {
    const authInstance = getAuth(activeApps[0]);
    if (process.env.NODE_ENV === "test" || mockTokenVerifier) {
      isProbed = true;
      adminStatus = "ready";
      return true;
    }
    if (authInstance && authInstance.app) {
      isProbed = true;
      adminStatus = "ready";
      return true;
    }
    return false;
  } catch (error) {
    console.warn("Auth probe failed:", error);
    return false;
  }
}

export interface FirebaseConnectionStatus {
  status: FirebaseAdminStatus;
  projectId?: string;
  databaseId?: string;
  adminInitialized: boolean;
  projectConfigured: boolean;
  databaseIdConfigured: boolean;
  authAvailable: boolean;
  message: string;
}

export const getFirebaseStatus = (): FirebaseConnectionStatus => {
  // Ensure we have attempted initialization
  initFirebaseAdmin();

  const activeApps = getApps();
  const isInit = activeApps && activeApps.length > 0;
  const hasProject = !!serverConfig.firebaseProjectId;
  const hasDb = !!serverConfig.firebaseDatabaseId;

  let msg = "Chưa cấu hình Firebase Admin.";
  if (adminStatus === "mocked") {
    msg = "Đang hoạt động ở chế độ giả lập xác thực (ALLOW_MOCK_AUTH=true).";
  } else if (adminStatus === "ready") {
    msg = "Firebase Admin đã sẵn sàng và Auth service khả dụng.";
  } else if (adminStatus === "initialized") {
    msg = "Firebase Admin đã khởi tạo thành công (chưa xác minh Auth service).";
  } else if (adminStatus === "configured") {
    msg = "Đã nhận được Project ID cấu hình, nhưng chưa được khởi tạo Admin SDK (thiếu credentials).";
  } else if (adminStatus === "error") {
    msg = "Lỗi khởi tạo Firebase Admin SDK.";
  }

  const rawProjectId = serverConfig.firebaseProjectId;
  let maskedProjectId = undefined;
  if (rawProjectId) {
    maskedProjectId = rawProjectId.length > 8 
      ? rawProjectId.substring(0, 4) + "..." + rawProjectId.substring(rawProjectId.length - 4)
      : "...";
  }

  return {
    status: adminStatus,
    projectId: maskedProjectId,
    databaseId: serverConfig.firebaseDatabaseId ? "Configured" : undefined,
    adminInitialized: isInit,
    projectConfigured: hasProject,
    databaseIdConfigured: hasDb,
    authAvailable: isInit || isMockedMode,
    message: msg,
  };
};

export async function verifyIdToken(token: string): Promise<any> {
  if (mockTokenVerifier) {
    return await mockTokenVerifier(token);
  }

  const app = initFirebaseAdmin();
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized and mock verifier is not set.");
  }

  return await getAuth(app).verifyIdToken(token);
}

// Helper for testing resets
export const resetFirebaseAdminStatus = async () => {
  const activeApps = getApps();
  for (const app of activeApps) {
    try {
      await deleteApp(app);
    } catch (err) {
      console.warn("Lỗi khi xóa Firebase app trong reset:", err);
    }
  }
  adminStatus = "not-configured";
  initErrorMsg = null;
  isMockedMode = false;
  isProbed = false;
};
