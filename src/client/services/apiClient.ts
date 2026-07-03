import { ApiErrorResponse } from "../../shared/contracts/apiContracts";

class ApiClient {
  private mockToken: string = "mock-admin";

  setMockRole(role: string) {
    this.mockToken = `mock-${role}`;
  }

  getMockRole(): string {
    return this.mockToken.replace("mock-", "");
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.mockToken}`);
    }
    headers.set("Content-Type", "application/json");

    const res = await fetch(path, { ...options, headers });
    const json = await res.json();

    if (!res.ok) {
      const errorResponse = json as ApiErrorResponse;
      throw new Error(errorResponse.error?.message || "Đã xảy ra lỗi không xác định.");
    }

    return json;
  }
}

export const apiClient = new ApiClient();
