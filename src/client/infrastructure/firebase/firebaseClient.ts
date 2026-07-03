import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

const env = (import.meta.env as unknown as Record<string, string | boolean | undefined>) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

export const checkMockAuthAllowed = (dev: boolean | undefined, allowMockAuth: string | undefined): boolean => {
  return dev === true && allowMockAuth === "true";
};

const hasClientConfig = !!env.VITE_FIREBASE_API_KEY;
const isMockAuthAllowed = checkMockAuthAllowed(
  env.DEV as boolean | undefined,
  env.VITE_ALLOW_MOCK_AUTH as string | undefined
);

let app = null;
let auth: Auth | null = null;

if (hasClientConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    console.log("Firebase Web SDK initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase Web SDK:", error);
  }
} else {
  console.warn("Firebase Web SDK not configured (VITE_FIREBASE_API_KEY missing).");
}

export { app as firebaseApp, auth as firebaseAuth, hasClientConfig, isMockAuthAllowed };
