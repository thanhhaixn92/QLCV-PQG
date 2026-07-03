import { AppRequest } from "../../auth/authTypes";

export interface Task {
  id: string;
  title: string;
  status: "completed" | "pending";
  assignee: string;
}

export const tasksQueryServiceMock = {
  async getTasks(req: AppRequest): Promise<Task[]> {
    return [
      { id: "CV-001", title: "Xây dựng khung ứng dụng QLCV_PQG Next v3.0", status: "completed", assignee: "Principal Architect" },
      { id: "CV-002", title: "Thiết lập module-state-registry điều khiển luồng", status: "completed", assignee: "Senior Dev" },
      { id: "CV-003", title: "Tích hợp và kiểm toán API Edge với Zod", status: "pending", assignee: "Security Lead" }
    ];
  }
};
