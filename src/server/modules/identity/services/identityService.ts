import { getFirebaseStatus, getConfiguredFirestore, initFirebaseAdmin } from "../../../infrastructure/firebase/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { UserProfile, Department, RoleConfiguration, UserRole } from "../../../../shared/contracts/identityContracts";
import { AppError } from "../../../../shared/errors/appError";
import { logger } from "../../../infrastructure/logging/logger";
import { serverConfig } from "../../../app/serverConfig";

// Dữ liệu mẫu ban đầu (Fallback In-Memory và Bootstrap)
const defaultDepartments: Department[] = [
  { id: "dept-cntt", name: "Phòng Công nghệ thông tin", description: "Vận hành hệ thống và an ninh mạng", createdAt: new Date() },
  { id: "dept-khhc", name: "Phòng Kế hoạch Hành chính", description: "Quản lý kế hoạch và công văn hành chính", createdAt: new Date() },
  { id: "dept-attt", name: "Phòng An toàn Thông tin", description: "Giám sát an ninh thông tin", createdAt: new Date() }
];

const defaultRoleConfigs: RoleConfiguration[] = [
  { roleId: "admin", permissions: ["modules.read", "modules.manage", "tasks.read", "tasks.create", "tasks.update", "tasks.assign", "tasks.transition", "tasks.archive", "tasks.manage", "agent.use", "agent.tools.read", "audit.read"], updatedAt: new Date() },
  { roleId: "manager", permissions: ["modules.read", "tasks.read", "tasks.create", "tasks.update", "tasks.assign", "tasks.transition", "tasks.archive", "agent.use", "agent.tools.read"], updatedAt: new Date() },
  { roleId: "editor", permissions: ["modules.read", "tasks.read", "tasks.create", "tasks.update", "tasks.assign", "tasks.transition", "agent.use"], updatedAt: new Date() },
  { roleId: "operator", permissions: ["modules.read", "tasks.read", "tasks.create", "tasks.update", "tasks.transition"], updatedAt: new Date() },
  { roleId: "viewer", permissions: ["modules.read"], updatedAt: new Date() }
];

const defaultUsers: UserProfile[] = [
  { uid: "mock-uid-admin", email: "admin@qlcv.local", displayName: "Administrator", role: "admin", departmentIds: ["dept-cntt"], createdAt: new Date(), updatedAt: new Date() },
  { uid: "mock-uid-manager", email: "manager@qlcv.local", displayName: "Manager User", role: "manager", departmentIds: ["dept-khhc"], createdAt: new Date(), updatedAt: new Date() },
  { uid: "mock-uid-editor", email: "editor@qlcv.local", displayName: "Editor User", role: "editor", departmentIds: ["dept-cntt", "dept-khhc"], createdAt: new Date(), updatedAt: new Date() }
];

class IdentityService {
  private useInMemory = false;
  private inMemoryUsers = new Map<string, UserProfile>();
  private inMemoryDepartments = new Map<string, Department>();
  private inMemoryRoleConfigs = new Map<string, RoleConfiguration>();

  constructor() {
    this.bootstrapInMemory();
  }

  private bootstrapInMemory() {
    defaultDepartments.forEach(d => this.inMemoryDepartments.set(d.id, d));
    defaultRoleConfigs.forEach(r => this.inMemoryRoleConfigs.set(r.roleId, r));
    defaultUsers.forEach(u => this.inMemoryUsers.set(u.uid, u));
  }

  private isFirestoreReady(): boolean {
    if (this.useInMemory) return false;
    const status = getFirebaseStatus();
    return status.status === "ready" || status.status === "initialized";
  }

  // --- USERS ---
  async getUsers(requestId?: string): Promise<UserProfile[]> {
    if (!this.isFirestoreReady()) {
      return Array.from(this.inMemoryUsers.values());
    }

    try {
      const db = getConfiguredFirestore();
      const snapshot = await db.collection("users").get();
      if (snapshot.empty) {
        // Tự động gieo hạt dữ liệu ban đầu lên Firestore nếu trống
        await this.seedInitialData();
        return Array.from(this.inMemoryUsers.values());
      }

      const users: UserProfile[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          departmentIds: data.departmentIds || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        });
      });
      return users;
    } catch (error: any) {
      logger.warn(`[IdentityService] Không thể tải dữ liệu users từ Firestore: ${error.message}. Chuyển sang In-Memory fallback.`);
      return Array.from(this.inMemoryUsers.values());
    }
  }

  async getUser(uid: string, requestId?: string): Promise<UserProfile | null> {
    if (!this.isFirestoreReady()) {
      return this.inMemoryUsers.get(uid) || null;
    }

    try {
      const db = getConfiguredFirestore();
      const doc = await db.collection("users").doc(uid).get();
      if (!doc.exists) return null;
      const data = doc.data()!;
      return {
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        departmentIds: data.departmentIds || [],
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      };
    } catch (error: any) {
      logger.warn(`[IdentityService] Thất bại khi lấy user ${uid} từ Firestore, dùng In-Memory: ${error.message}`);
      return this.inMemoryUsers.get(uid) || null;
    }
  }

  async updateUserRoleAndDepartments(
    uid: string,
    role: UserRole,
    departmentIds: string[],
    displayName?: string,
    requestId?: string
  ): Promise<UserProfile> {
    const now = new Date();
    
    // Cập nhật In-memory trước
    const existingMemory = this.inMemoryUsers.get(uid);
    if (existingMemory) {
      existingMemory.role = role;
      existingMemory.departmentIds = departmentIds;
      if (displayName !== undefined) {
        existingMemory.displayName = displayName;
      }
      existingMemory.updatedAt = now;
    } else {
      // Nếu chưa có, gieo mẫu hoặc tạo mới
      this.inMemoryUsers.set(uid, {
        uid,
        email: `${uid}@qlcv.local`,
        displayName: displayName || `User ${uid}`,
        role,
        departmentIds,
        createdAt: now,
        updatedAt: now
      });
    }

    // Gán Firebase custom claim thực tế cho người dùng nếu Admin SDK sẵn sàng
    try {
      const app = initFirebaseAdmin();
      if (app) {
        await getAuth(app).setCustomUserClaims(uid, { role, departmentIds });
        logger.info(`[IdentityService] Đã cập nhật Custom Claims thành công cho user ${uid}: role=${role}, depts=${departmentIds.join(",")}. ReqID: ${requestId}`);
      }
    } catch (claimsErr: any) {
      logger.warn(`[IdentityService] Không thể thiết lập Custom Claims cho user ${uid}: ${claimsErr.message}`);
    }

    if (!this.isFirestoreReady()) {
      return this.inMemoryUsers.get(uid)!;
    }

    try {
      const db = getConfiguredFirestore();
      const userRef = db.collection("users").doc(uid);
      const updatePayload: any = {
        role,
        departmentIds,
        updatedAt: now,
      };
      if (displayName !== undefined) {
        updatePayload.displayName = displayName;
      }

      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (snapshot.exists) {
          transaction.update(userRef, updatePayload);
        } else {
          // Tạo mới tài liệu nếu chưa tồn tại trong Firestore
          transaction.set(userRef, {
            uid,
            email: existingMemory?.email || `${uid}@qlcv.local`,
            displayName: displayName || `User ${uid}`,
            role,
            departmentIds,
            createdAt: now,
            updatedAt: now,
          });
        }
      });

      return (await this.getUser(uid, requestId))!;
    } catch (error: any) {
      logger.error(`[IdentityService] Lỗi khi cập nhật user ${uid} trên Firestore: ${error.message}`);
      throw new AppError("DEPENDENCY_UNAVAILABLE", `Không thể lưu thông tin phân quyền người dùng: ${error.message}`);
    }
  }

  // --- DEPARTMENTS ---
  async getDepartments(requestId?: string): Promise<Department[]> {
    if (!this.isFirestoreReady()) {
      return Array.from(this.inMemoryDepartments.values());
    }

    try {
      const db = getConfiguredFirestore();
      const snapshot = await db.collection("departments").get();
      if (snapshot.empty) {
        await this.seedInitialData();
        return Array.from(this.inMemoryDepartments.values());
      }

      const depts: Department[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        depts.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        });
      });
      return depts;
    } catch (error: any) {
      logger.warn(`[IdentityService] Thất bại khi lấy danh sách phòng ban từ Firestore: ${error.message}`);
      return Array.from(this.inMemoryDepartments.values());
    }
  }

  async createDepartment(dept: Department, requestId?: string): Promise<Department> {
    const now = new Date();
    const newDept = { ...dept, createdAt: now };
    this.inMemoryDepartments.set(dept.id, newDept);

    if (!this.isFirestoreReady()) {
      return newDept;
    }

    try {
      const db = getConfiguredFirestore();
      await db.collection("departments").doc(dept.id).set({
        name: dept.name,
        description: dept.description || "",
        createdAt: now,
      });
      return newDept;
    } catch (error: any) {
      logger.error(`[IdentityService] Lỗi tạo phòng ban trên Firestore: ${error.message}`);
      throw new AppError("DEPENDENCY_UNAVAILABLE", `Lỗi tạo phòng ban: ${error.message}`);
    }
  }

  // --- SYSTEM SEEDING ---
  private async seedInitialData() {
    try {
      const db = getConfiguredFirestore();
      
      // Gieo hạt phòng ban
      for (const d of defaultDepartments) {
        await db.collection("departments").doc(d.id).set({
          name: d.name,
          description: d.description,
          createdAt: new Date(),
        });
      }

      // Gieo hạt phân quyền vai trò
      for (const r of defaultRoleConfigs) {
        await db.collection("system_roles").doc(r.roleId).set({
          roleId: r.roleId,
          permissions: r.permissions,
          updatedAt: new Date(),
        });
      }

      // Gieo hạt tài khoản mẫu
      for (const u of defaultUsers) {
        await db.collection("users").doc(u.uid).set({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          departmentIds: u.departmentIds,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      logger.info("[IdentityService] Đã gieo dữ liệu bảo mật, vai trò, phòng ban khởi tạo thành công vào Firestore.");
    } catch (e: any) {
      logger.warn(`[IdentityService] Gieo hạt dữ liệu ban đầu thất bại (có thể đã tồn tại hoặc lỗi quyền hạn): ${e.message}`);
    }
  }
}

export const identityService = new IdentityService();
export default identityService;
