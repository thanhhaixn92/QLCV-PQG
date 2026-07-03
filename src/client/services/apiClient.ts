import { ApiErrorResponse } from "../../shared/contracts/apiContracts";
import { tokenService } from "../infrastructure/firebase/tokenService";
import { isMockAuthAllowed } from "../infrastructure/firebase/firebaseClient";

class ApiClient {
  private mockToken: string = "mock-admin";

  setMockRole(role: string) {
    if (!isMockAuthAllowed) {
      console.warn("apiClient: Đặt vai trò mock bị chặn vì Mock Auth không được bật.");
      return;
    }
    this.mockToken = `mock-${role}`;
    // Đồng bộ với local mock user trong hệ thống auth giả lập
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("qlcv_mock_user", JSON.stringify({
        uid: `mock-uid-${role}`,
        email: `${role}@qlcv.local`,
        displayName: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        emailVerified: true,
        isMock: true,
        role,
      }));
    }
    // Phát sự kiện cập nhật để các trình lắng nghe auth cập nhật theo
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }
  }

  getMockRole(): string {
    if (!isMockAuthAllowed) {
      return "viewer";
    }
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("qlcv_mock_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.role) {
            return parsed.role;
          }
        } catch {
          // ignore
        }
      }
    }
    return this.mockToken.replace("mock-", "");
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    
    if (!headers.has("Authorization")) {
      const authHeaders = await tokenService.getAuthorizationHeaders();
      if (authHeaders["Authorization"]) {
        headers.set("Authorization", authHeaders["Authorization"]);
      }
    }
    headers.set("Content-Type", "application/json");

    const res = await fetch(path, { ...options, headers });
    
    const text = await res.text();
    let json: any = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { message: text };
      }
    }

    if (!res.ok) {
      const errorResponse = json as ApiErrorResponse;
      throw new Error(errorResponse.error?.message || "Đã xảy ra lỗi không xác định.");
    }

    return json as T;
  }
}

export const apiClient = new ApiClient();
