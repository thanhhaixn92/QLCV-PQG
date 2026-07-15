import { Response } from "express";
import { AppRequest } from "../auth/authTypes";
import { getFirebaseStatus } from "../infrastructure/firebase/firebaseAdmin";
import { serverConfig } from "../app/serverConfig";

export const firebaseHealthRoute = (req: AppRequest, res: Response) => {
  const firebaseStatus = getFirebaseStatus();
  
  const isReady = firebaseStatus.status === "ready" || firebaseStatus.status === "initialized" || firebaseStatus.status === "mocked";
  
  if (serverConfig.appMode === "single-owner" && !isReady) {
    return res.status(503).json({
      status: "fail",
      error: "Firebase Auth/Admin is not ready",
      firebaseStatus: firebaseStatus.status,
      requestId: req.requestId || null
    });
  }

  res.json({
    status: firebaseStatus.status,
    adminInitialized: firebaseStatus.adminInitialized,
    projectConfigured: firebaseStatus.projectConfigured,
    databaseIdConfigured: firebaseStatus.databaseIdConfigured,
    authAvailable: firebaseStatus.authAvailable,
    requestId: req.requestId || null,
  });
};
