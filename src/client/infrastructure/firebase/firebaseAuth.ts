import { 
  signInWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from "firebase/auth";
import { firebaseAuth, hasClientConfig, isMockAuthAllowed } from "./firebaseClient";

export interface ClientUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  isMock: boolean;
  role: string;
}

// Trình lắng nghe trạng thái giả lập
type AuthCallback = (user: ClientUser | null) => void;
const mockListeners: Set<AuthCallback> = new Set();
let currentMockUser: ClientUser | null = null;

// Khởi tạo mock user từ localStorage chỉ khi mock auth được phép
if (isMockAuthAllowed) {
  if (typeof localStorage !== "undefined") {
    let storedUser = localStorage.getItem("qlcv_mock_user");
    if (!storedUser) {
      const defaultUser: ClientUser = {
        uid: "mock-uid-admin",
        email: "admin@qlcv.local",
        displayName: "Mock Admin",
        emailVerified: true,
        isMock: true,
        role: "admin",
      };
      localStorage.setItem("qlcv_mock_user", JSON.stringify(defaultUser));
      currentMockUser = defaultUser;
    } else {
      try {
        currentMockUser = JSON.parse(storedUser);
      } catch {
        currentMockUser = null;
      }
    }
  }

  // Lắng nghe sự kiện storage để đồng bộ hóa vai trò lập tức
  if (typeof window !== "undefined") {
    window.addEventListener("storage", () => {
      const stored = localStorage.getItem("qlcv_mock_user");
      if (stored) {
        try {
          currentMockUser = JSON.parse(stored);
          mockListeners.forEach(cb => cb(currentMockUser));
        } catch {
          // ignore
        }
      } else {
        currentMockUser = null;
        mockListeners.forEach(cb => cb(null));
      }
    });
  }
} else {
  // Đảm bảo không còn dữ liệu mock trong localStorage nếu mock không được phép
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("qlcv_mock_user");
  }
}

export const loginWithEmailAndPassword = async (email: string, password: string): Promise<any> => {
  if (hasClientConfig && firebaseAuth) {
    return await signInWithEmailAndPassword(firebaseAuth, email, password);
  } else if (isMockAuthAllowed) {
    // Không suy ra role từ chuỗi email nữa, mặc định là viewer
    const role = "viewer";

    currentMockUser = {
      uid: `mock-uid-${role}`,
      email,
      displayName: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      emailVerified: true,
      isMock: true,
      role,
    };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("qlcv_mock_user", JSON.stringify(currentMockUser));
    }
    
    // Phát sự kiện cập nhật
    mockListeners.forEach(cb => cb(currentMockUser));
    return { user: currentMockUser };
  } else {
    throw new Error("AUTH_NOT_CONFIGURED: Firebase chưa cấu hình và Mock Auth không được phép hoạt động.");
  }
};

export const signOutUser = async (): Promise<void> => {
  if (hasClientConfig && firebaseAuth) {
    await fbSignOut(firebaseAuth);
  } else {
    currentMockUser = null;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("qlcv_mock_user");
    }
    mockListeners.forEach(cb => cb(null));
  }
};

export const onAuthChanged = (callback: AuthCallback): (() => void) => {
  if (hasClientConfig && firebaseAuth) {
    return onAuthStateChanged(firebaseAuth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const idTokenResult = await fbUser.getIdTokenResult();
          const role = (idTokenResult.claims.role as string) || "viewer";
          
          const clientUser: ClientUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            emailVerified: fbUser.emailVerified,
            isMock: false,
            role,
          };
          callback(clientUser);
        } catch (err) {
          console.error("Error retrieving idTokenResult inside onAuthStateChanged:", err);
          callback({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            emailVerified: fbUser.emailVerified,
            isMock: false,
            role: "viewer",
          });
        }
      } else {
        callback(null);
      }
    });
  } else if (isMockAuthAllowed) {
    mockListeners.add(callback);
    // Gửi sự kiện ban đầu ngay lập tức
    callback(currentMockUser);
    return () => {
      mockListeners.delete(callback);
    };
  } else {
    // Khi Firebase chưa cấu hình và mock không bật: hiển thị trạng thái AUTH_NOT_CONFIGURED
    callback({
      uid: "auth-not-configured",
      email: null,
      displayName: "Auth Not Configured",
      emailVerified: false,
      isMock: false,
      role: "AUTH_NOT_CONFIGURED",
    });
    return () => {};
  }
};

export const getClientAuthToken = async (): Promise<string | null> => {
  if (hasClientConfig && firebaseAuth && firebaseAuth.currentUser) {
    return await firebaseAuth.currentUser.getIdToken(true);
  } else if (isMockAuthAllowed) {
    if (currentMockUser) {
      return `mock-${currentMockUser.role}`;
    }
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("qlcv_mock_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.role) {
            return `mock-${parsed.role}`;
          }
        } catch {
          // ignore
        }
      }
    }
    return "mock-admin";
  }
  return null;
};
