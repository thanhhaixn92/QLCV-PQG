export type NotificationType = "system" | "task_overdue" | "task_near_due" | "info";
export type NotificationStatus = "unread" | "read";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  status: NotificationStatus;
  taskId?: string;
  createdAt: string;
  sendEmail?: boolean;
  emailSent?: boolean;
  emailSentAt?: string;
}

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "success" | "failed";
  notificationId?: string;
}
