import { Request } from "express";
import { UserRole } from "../../shared/permissions/permissions";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  role: UserRole;
  displayName?: string;
  departmentIds?: readonly string[];
  isMock: boolean;
}

export interface AppRequest extends Request {
  user?: AuthenticatedUser;
  requestId?: string;
}
