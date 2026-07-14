import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "manager", "editor", "operator", "viewer"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userProfileSchema = z.object({
  uid: z.string().min(1, "UID không được để trống"),
  email: z.string().email("Email không hợp lệ"),
  displayName: z.string().max(100, "Tên hiển thị tối đa 100 kí tự").optional(),
  role: userRoleSchema,
  departmentIds: z.array(z.string()).default([]),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const departmentSchema = z.object({
  id: z.string().min(1, "Mã phòng ban không được để trống"),
  name: z.string().min(2, "Tên phòng ban tối thiểu 2 kí tự").max(150),
  description: z.string().max(500).optional(),
  createdAt: z.date().or(z.string()).optional(),
});

export type Department = z.infer<typeof departmentSchema>;

export const roleConfigurationSchema = z.object({
  roleId: userRoleSchema,
  permissions: z.array(z.string()),
  updatedAt: z.date().or(z.string()).optional(),
});

export type RoleConfiguration = z.infer<typeof roleConfigurationSchema>;

export interface IdentityModuleState {
  users: UserProfile[];
  departments: Department[];
  roleConfigs: RoleConfiguration[];
  loading: boolean;
  error: string | null;
}
