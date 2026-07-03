import { Response, NextFunction } from "express";
import { AppRequest } from "./authTypes";
import { serverConfig } from "../app/serverConfig";
import { AppError } from "../../shared/errors/appError";
import crypto from "crypto";

export const requestInitializer = (req: AppRequest, res: Response, next: NextFunction) => {
  const reqId = (req.header("x-request-id") as string) || crypto.randomUUID();
  req.requestId = reqId;
  res.setHeader("x-request-id", reqId);
  next();
};

export const authenticateRequest = async (req: AppRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header("authorization");
    
    if (!authHeader) {
      throw new AppError("AUTH_REQUIRED", "Yêu cầu đăng nhập để truy cập tài nguyên này.", req.requestId);
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new AppError("VALIDATION_FAILED", "Định dạng token không hợp lệ (phải bắt đầu bằng Bearer).", req.requestId);
    }

    const token = authHeader.substring(7);

    // Support mock authentication for development
    if (token.startsWith("mock-")) {
      const rolePart = token.substring(5); // mock-admin, mock-viewer, etc.
      const validRoles = ["admin", "manager", "editor", "operator", "viewer"];
      const role = validRoles.includes(rolePart) ? rolePart : "viewer";

      req.user = {
        uid: `mock-uid-${role}`,
        email: `${role}@qlcv.local`,
        emailVerified: true,
        role: role as any,
        displayName: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        isMock: true,
      };
      return next();
    }

    // In a production setup, verify using Firebase Admin SDK:
    // const decodedToken = await adminAuth.verifyIdToken(token);
    // Determine role based on custom claims or user database config.
    
    // Fallback simulation when real Firebase auth is not yet provisioned with Admin SDK:
    req.user = {
      uid: "simulated-fb-uid",
      email: "user@qlcv.local",
      emailVerified: true,
      role: "viewer",
      displayName: "Simulated Firebase User",
      isMock: true,
    };
    next();
  } catch (error) {
    next(error);
  }
};
