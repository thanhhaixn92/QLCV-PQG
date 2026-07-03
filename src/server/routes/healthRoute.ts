import { Request, Response } from "express";

export const healthRoute = (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "qlcv-pqg-next",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
};
