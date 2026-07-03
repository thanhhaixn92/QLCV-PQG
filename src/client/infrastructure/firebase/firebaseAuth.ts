import { 
  signInWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from "firebase/auth";
import { firebaseAuth, hasClientConfig } from "./firebaseClient";

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

// Khởi tạo mock user từ localStorage nếu có
const storedUser = localStorage.getItem("qlcv_mock_user");
if (storedUser) {
  try {
    currentMockUser = JSON.parse(storedUser);
  } catch {
    currentMockUser = null;
  }
}

export const loginWithEmailAndPassword = async (email: string, password: string): Promise<any> => {
  if (hasClientConfig && firebaseAuth) {
    return await signInWithEmailAndPassword(firebaseAuth, email, password);
  } else {
    // Sinh vai trò giả lập dựa trên email đầu vào để thuận tiện test
    let role = "viewer";
    if (email.includes("admin")) role = "admin";
    else if (email.includes("manager")) role = "manager";
    else if (email.includes("editor")) role = "editor";
    else if (email.includes("operator")) role = "operator";

    currentMockUser = {
      uid: `mock-uid-${role}`,
      email,
      displayName: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      emailVerified: true,
      isMock: true,
      role,
    };
    localStorage.setItem("qlcv_mock_user", JSON.stringify(currentMockUser));
    
    // Phát sự kiện cập nhật
    mockListeners.forEach(cb => cb(currentMockUser));
    return { user: currentMockUser };
  }
};

export const signOutUser = async (): Promise<void> => {
  if (hasClientConfig && firebaseAuth) {
    await fbSignOut(firebaseAuth);
  } else {
    currentMockUser = null;
    localStorage.removeItem("qlcv_mock_user");
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
  } else {
    mockListeners.add(callback);
    // Gửi sự kiện ban đầu ngay lập tức
    callback(currentMockUser);
    return () => {
      mockListeners.delete(callback);
    };
  }
};

export const getClientAuthToken = async (): Promise<string | null> => {
  if (hasClientConfig && firebaseAuth && firebaseAuth.currentUser) {
    return await firebaseAuth.currentUser.getIdToken(true);
  } else if (currentMockUser) {
    return `mock-${currentMockUser.role}`;
  }
  return null;
};
