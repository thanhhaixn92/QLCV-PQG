import { UserRole } from "../../shared/permissions/permissions";
import { serverConfig } from "../app/serverConfig";
import { AppError } from "../../shared/errors/appError";

const DEVELOPMENT_MAPPINGS: Record<string, UserRole> = {
  "thanhhaikkk36@gmail.com": "admin",
  "admin@qlcv.local": "admin",
  "manager@qlcv.local": "manager",
  "editor@qlcv.local": "editor",
  "operator@qlcv.local": "operator",
  "viewer@qlcv.local": "viewer",
};

export function isValidRole(role: any): role is UserRole {
  return ["admin", "manager", "editor", "operator", "viewer"].includes(role);
}

export function resolveUserRole(
  decodedToken: { email?: string; role?: any; [key: string]: any },
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

  // 2. Allowlist hoặc mapping development được cấu hình rõ
  if (email && DEVELOPMENT_MAPPINGS[email.toLowerCase()]) {
    return DEVELOPMENT_MAPPINGS[email.toLowerCase()];
  }

  // 3. Mặc định viewer
  return "viewer";
}
