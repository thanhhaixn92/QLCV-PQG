import { Request, Response } from "express";
import { getFirebaseStatus } from "../infrastructure/firebase/firebaseAdmin";

export const firebaseHealthRoute = (req: Request, res: Response) => {
  const firebaseStatus = getFirebaseStatus();
  res.json({
    ...firebaseStatus,
    timestamp: new Date().toISOString()
  });
};
