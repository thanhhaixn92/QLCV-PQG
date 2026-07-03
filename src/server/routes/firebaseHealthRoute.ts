import { Response } from "express";
import { AppRequest } from "../auth/authTypes";
import { getFirebaseStatus } from "../infrastructure/firebase/firebaseAdmin";

export const firebaseHealthRoute = (req: AppRequest, res: Response) => {
  const firebaseStatus = getFirebaseStatus();
  res.json({
    status: firebaseStatus.status,
    adminInitialized: firebaseStatus.adminInitialized,
    projectConfigured: firebaseStatus.projectConfigured,
    databaseIdConfigured: firebaseStatus.databaseIdConfigured,
    authAvailable: firebaseStatus.authAvailable,
    requestId: req.requestId || null,
  });
};
