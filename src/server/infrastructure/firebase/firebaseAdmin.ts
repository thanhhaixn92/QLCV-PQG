import { serverConfig } from "../../app/serverConfig";

export interface FirebaseConnectionStatus {
  connected: boolean;
  projectId?: string;
  databaseId?: string;
  isMock: boolean;
  message: string;
}

export const getFirebaseStatus = (): FirebaseConnectionStatus => {
  if (!serverConfig.firebaseProjectId) {
    return {
      connected: false,
      isMock: true,
      message: "Chưa kết nối dữ liệu Firebase. Hệ thống đang hoạt động ở chế độ giả lập (Mock Mode)."
    };
  }
  return {
    connected: true,
    projectId: serverConfig.firebaseProjectId,
    databaseId: serverConfig.firebaseDatabaseId || "(default)",
    isMock: false,
    message: `Đã cấu hình Firebase. Project: ${serverConfig.firebaseProjectId}, Database ID: ${serverConfig.firebaseDatabaseId || "(default)"}`
  };
};
