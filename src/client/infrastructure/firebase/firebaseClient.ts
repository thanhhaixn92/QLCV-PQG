import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const hasClientConfig = !!import.meta.env.VITE_FIREBASE_API_KEY;

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

export { app as firebaseApp, auth as firebaseAuth, hasClientConfig };
