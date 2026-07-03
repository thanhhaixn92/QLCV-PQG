import { UserRole } from "../../shared/permissions/permissions";
import { serverConfig } from "../app/serverConfig";
import { AppError } from "../../shared/errors/appError";

export function isValidRole(role: unknown): role is UserRole {
  if (typeof role !== "string") return false;
  return ["admin", "manager", "editor", "operator", "viewer"].includes(role);
}

function parseDevRoleMappings(mappingsStr: string | undefined): Record<string, UserRole> {
  const result: Record<string, UserRole> = {};
  if (!mappingsStr) return result;
  const pairs = mappingsStr.split(",");
  for (const pair of pairs) {
    const parts = pair.split(":");
    if (parts.length === 2) {
      const email = parts[0].trim().toLowerCase();
      const role = parts[1].trim();
      if (isValidRole(role)) {
        result[email] = role;
      }
    }
  }
  return result;
}

export function resolveUserRole(
  decodedToken: { email?: string; role?: unknown; [key: string]: unknown },
  requestId?: string
): UserRole {
  const email = decodedToken.email;

  // Kiểm tra email domain nếu ALLOWED_EMAIL_DOMAINS được thiết lập
  const allowedDomains = serverConfig.allowedEmailDomains;
  if (allowedDomains && allowedDomains.length > 0) {
    if (!email) {
      throw new AppError(
        "PERMISSION_DENIED",
        "Truy cập bị từ chối: Tài khoản không có địa chỉ email.",
        requestId
      );
    }
    const parts = email.split("@");
    if (parts.length !== 2) {
      throw new AppError(
        "PERMISSION_DENIED",
        "Truy cập bị từ chối: Định dạng email không hợp lệ.",
        requestId
      );
    }
    const domain = parts[1].toLowerCase().trim();
    if (!allowedDomains.includes(domain)) {
      throw new AppError(
        "PERMISSION_DENIED",
        `Truy cập bị từ chối: Tên miền email '${domain}' không thuộc danh sách tên miền được phép truy cập.`,
        requestId
      );
    }
  }

  // 1. Firebase custom claim role nếu hợp lệ
  if (decodedToken.role && isValidRole(decodedToken.role)) {
    return decodedToken.role;
  }

  // 2. Chỉ áp dụng dev role mappings khi NODE_ENV !== "production"
  if (serverConfig.nodeEnv !== "production" && email) {
    const devMappings = parseDevRoleMappings(serverConfig.devRoleMappings);
    const resolvedRole = devMappings[email.toLowerCase()];
    if (resolvedRole) {
      return resolvedRole;
    }
  }

  // 3. Mặc định viewer
  return "viewer";
}
