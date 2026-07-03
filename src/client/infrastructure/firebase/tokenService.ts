import { getClientAuthToken } from "./firebaseAuth";

export const tokenService = {
  async getAuthToken(): Promise<string | null> {
    try {
      return await getClientAuthToken();
    } catch (error) {
      console.error("tokenService: Lỗi khi lấy ID Token:", error);
      return null;
    }
  },

  async getAuthorizationHeaders(): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    if (!token) return {};
    return {
      "Authorization": `Bearer ${token}`
    };
  }
};
