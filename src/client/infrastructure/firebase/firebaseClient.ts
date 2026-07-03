import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

const env = (typeof import.meta !== "undefined" && import.meta.env) || (process.env as any) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

const hasClientConfig = !!env.VITE_FIREBASE_API_KEY;
const isMockAuthAllowed = env.DEV === true || env.VITE_ALLOW_MOCK_AUTH === "true";

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
