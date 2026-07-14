import dotenv from "dotenv";
dotenv.config();

export interface ServerConfig {
  nodeEnv: string;
  geminiApiKey: string | undefined;
  firebaseProjectId: string | undefined;
  firebaseDatabaseId: string | undefined;
  firebaseStorageBucket: string | undefined;
  firebaseServiceAccountJson: string | undefined;
  firebaseServiceAccountBase64: string | undefined;
  googleApplicationCredentials: string | undefined;
  allowedEmailDomains: string[];
  allowMockAuth: boolean;
  devRoleMappings: string | undefined;
  tasksTimestampMode: string | undefined;
}

const parseAllowedDomains = (val: string | undefined): string[] => {
  if (!val) return [];
  return val.split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
};

export const serverConfig: ServerConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  geminiApiKey: process.env.GEMINI_API_KEY,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseDatabaseId: process.env.FIREBASE_DATABASE_ID,
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  firebaseServiceAccountBase64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  allowedEmailDomains: parseAllowedDomains(process.env.ALLOWED_EMAIL_DOMAINS),
  allowMockAuth: process.env.ALLOW_MOCK_AUTH === "true",
  devRoleMappings: process.env.DEV_ROLE_MAPPINGS,
  tasksTimestampMode: process.env.TASKS_TIMESTAMP_MODE,
};

export function validateConfig() {
  const missingRequired: string[] = [];

  if (!serverConfig.nodeEnv) {
    missingRequired.push("NODE_ENV");
  }

  // Production environment checks to prevent missing Firebase Auth or enabled mock auth
  if (serverConfig.nodeEnv === "production" && process.env.NODE_ENV !== "test") {
    if (!serverConfig.firebaseProjectId) {
      throw new Error("CRITICAL_CONFIGURATION_ERROR: FIREBASE_PROJECT_ID is strictly required in production mode to ensure Firebase Auth integrity.");
    }
    if (serverConfig.allowMockAuth) {
      throw new Error("SECURITY_VIOLATION_ERROR: ALLOW_MOCK_AUTH must be disabled in production mode.");
    }
  }

  if (missingRequired.length > 0) {
    throw new Error(`Missing required configuration: ${missingRequired.join(", ")}`);
  }

  if (!serverConfig.geminiApiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined. AI functionality will be degraded.");
  }
  if (!serverConfig.firebaseProjectId) {
    console.warn("WARNING: FIREBASE_PROJECT_ID is not defined. Core Firebase functionality will be simulated.");
  }
}
