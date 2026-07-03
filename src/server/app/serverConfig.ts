import dotenv from "dotenv";
dotenv.config();

export interface ServerConfig {
  nodeEnv: string;
  geminiApiKey: string | undefined;
  firebaseProjectId: string | undefined;
  firebaseDatabaseId: string | undefined;
  firebaseStorageBucket: string | undefined;
  allowedEmailDomains: string[];
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
  allowedEmailDomains: parseAllowedDomains(process.env.ALLOWED_EMAIL_DOMAINS),
};

export function validateConfig() {
  const missingRequired: string[] = [];

  if (!serverConfig.nodeEnv) {
    missingRequired.push("NODE_ENV");
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
