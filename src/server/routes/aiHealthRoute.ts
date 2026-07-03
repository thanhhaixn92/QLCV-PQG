import { Request, Response } from "express";
import { serverConfig } from "../app/serverConfig";

export const aiHealthRoute = (req: Request, res: Response) => {
  const hasKey = !!serverConfig.geminiApiKey;
  res.json({
    status: hasKey ? "available" : "unavailable",
    service: "qlcv-pqg-next-ai",
    configured: hasKey,
    model: "gemini-3.5-flash",
    timestamp: new Date().toISOString()
  });
};
