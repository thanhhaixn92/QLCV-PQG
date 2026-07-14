import { Notification, EmailLog } from "../contracts/notificationTypes";
import { getFirebaseStatus, getConfiguredFirestore } from "../../../infrastructure/firebase/firebaseAdmin";
import { getTaskQueryRepository } from "../../tasks-query/data/taskQueryRepository";
import { logger } from "../../../infrastructure/logging/logger";
import crypto from "crypto";

const inMemoryNotifications: Notification[] = [];
const inMemoryEmails: EmailLog[] = [];

function isFirestoreReady(): boolean {
  const status = getFirebaseStatus();
  return status.status === "ready" || status.status === "initialized";
}

export const notificationService = {
  /**
   * Thêm thông báo mới, đảm bảo tính duy nhất (Idempotency) nếu truyền ID cụ thể
   */
  async addNotification(input: Omit<Notification, "createdAt" | "status"> & { id?: string }): Promise<Notification> {
    const id = input.id || crypto.randomUUID();
    const notification: Notification = {
      id,
      status: "unread",
      createdAt: new Date().toISOString(),
      ...input
    };

    // 1. Kiểm tra trùng lặp trong in-memory
    const existsInMemory = inMemoryNotifications.some((n) => n.id === id);
    if (existsInMemory) {
      logger.info(`[NotificationService] Thông báo với ID ${id} đã tồn tại trong in-memory (bỏ qua để đảm bảo Idempotency).`);
      return inMemoryNotifications.find((n) => n.id === id)!;
    }

    // 2. Ghi nhận in-memory
    inMemoryNotifications.unshift(notification);
    if (inMemoryNotifications.length > 500) {
      inMemoryNotifications.pop();
    }

    // 3. Ghi nhận Firestore nếu có sẵn
    if (isFirestoreReady()) {
      try {
        const db = getConfiguredFirestore();
        const docRef = db.collection("notifications").doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          logger.info(`[NotificationService] Thông báo với ID ${id} đã tồn tại trong Firestore (bỏ qua để đảm bảo Idempotency).`);
          return docSnap.data() as Notification;
        }
        await docRef.set(notification);
      } catch (err: any) {
        logger.warn(`[NotificationService] Thất bại khi lưu thông báo lên Firestore: ${err.message}`);
      }
    }

    // 4. Nếu yêu cầu gửi email, tiến hành gửi email mô phỏng
    if (notification.sendEmail) {
      await this.sendSimulatedEmail({
        recipient: `${notification.userId}@qlcv.local`,
        subject: `[QLCV] ${notification.title}`,
        body: notification.content,
        notificationId: notification.id
      });
      notification.emailSent = true;
      notification.emailSentAt = new Date().toISOString();

      // Cập nhật lại bản ghi sau khi gửi email
      if (isFirestoreReady()) {
        try {
          const db = getConfiguredFirestore();
          await db.collection("notifications").doc(id).update({
            emailSent: true,
            emailSentAt: notification.emailSentAt
          });
        } catch (err) {
          // Bỏ qua lỗi cập nhật phụ
        }
      }
    }

    logger.info(`[NotificationService] Thêm thành công thông báo: [${notification.title}] cho User: ${notification.userId}`);
    return notification;
  },

  /**
   * Lấy danh sách thông báo của người dùng
   */
  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    if (!isFirestoreReady()) {
      return inMemoryNotifications.filter((n) => n.userId === userId);
    }

    try {
      const db = getConfiguredFirestore();
      const snapshot = await db.collection("notifications")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      if (snapshot.empty) {
        return inMemoryNotifications.filter((n) => n.userId === userId);
      }

      const list: Notification[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Notification);
      });
      return list;
    } catch (err: any) {
      logger.warn(`[NotificationService] Thất bại truy xuất Firestore: ${err.message}. Fallback in-memory.`);
      return inMemoryNotifications.filter((n) => n.userId === userId);
    }
  },

  /**
   * Đánh dấu đã đọc
   */
  async markAsRead(userId: string, notificationIds?: string[]): Promise<void> {
    // 1. Cập nhật in-memory
    inMemoryNotifications.forEach((n) => {
      if (n.userId === userId && (!notificationIds || notificationIds.includes(n.id))) {
        n.status = "read";
      }
    });

    // 2. Cập nhật Firestore
    if (isFirestoreReady()) {
      try {
        const db = getConfiguredFirestore();
        if (notificationIds && notificationIds.length > 0) {
          const batch = db.batch();
          for (const id of notificationIds) {
            const ref = db.collection("notifications").doc(id);
            batch.update(ref, { status: "read" });
          }
          await batch.commit();
        } else {
          // Đánh dấu tất cả của user này là đã đọc
          const snapshot = await db.collection("notifications")
            .where("userId", "==", userId)
            .where("status", "==", "unread")
            .get();

          if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.forEach((doc) => {
              batch.update(doc.ref, { status: "read" });
            });
            await batch.commit();
          }
        }
      } catch (err: any) {
        logger.warn(`[NotificationService] Thất bại khi đánh dấu đã đọc trên Firestore: ${err.message}`);
      }
    }
  },

  /**
   * Gửi email mô phỏng, ghi nhận vào hệ thống logs kiểm toán email
   */
  async sendSimulatedEmail(params: {
    recipient: string;
    subject: string;
    body: string;
    notificationId?: string;
  }): Promise<EmailLog> {
    const log: EmailLog = {
      id: crypto.randomUUID(),
      recipient: params.recipient,
      subject: params.subject,
      body: params.body,
      sentAt: new Date().toISOString(),
      status: "success",
      notificationId: params.notificationId
    };

    inMemoryEmails.unshift(log);
    if (inMemoryEmails.length > 100) {
      inMemoryEmails.pop();
    }

    if (isFirestoreReady()) {
      try {
        const db = getConfiguredFirestore();
        await db.collection("simulated_emails").doc(log.id).set(log);
      } catch (err: any) {
        logger.warn(`[NotificationService] Thất bại khi ghi email log lên Firestore: ${err.message}`);
      }
    }

    logger.info(`[NotificationService] GỬI EMAIL THÀNH CÔNG: Tới <${log.recipient}> - Tiêu đề: "${log.subject}"`);
    return log;
  },

  /**
   * Lấy lịch sử email mô phỏng (Admin)
   */
  async getSimulatedEmails(): Promise<EmailLog[]> {
    if (!isFirestoreReady()) {
      return inMemoryEmails;
    }

    try {
      const db = getConfiguredFirestore();
      const snapshot = await db.collection("simulated_emails")
        .orderBy("sentAt", "desc")
        .limit(50)
        .get();

      if (snapshot.empty) {
        return inMemoryEmails;
      }

      const list: EmailLog[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as EmailLog);
      });
      return list;
    } catch (err) {
      return inMemoryEmails;
    }
  },

  /**
   * Tự động quét và phát hiện các công việc sắp quá hạn hoặc đã quá hạn
   */
  async scanAndNotifyOverdueTasks(requestId: string): Promise<{ overdueCount: number; nearDueCount: number }> {
    logger.info(`[NotificationService] Bắt đầu quét công việc quá hạn/sắp quá hạn... ReqID: ${requestId}`);
    let overdueCount = 0;
    let nearDueCount = 0;

    try {
      const taskRepo = getTaskQueryRepository();
      // Lấy toàn bộ công việc thông qua rạp xiếc rẽ hướng. Chúng ta lấy 100 cái đầu tiên để quét an toàn.
      const taskResult = await taskRepo.list({ limit: 100 }, {
        actorUid: "system",
        actorRole: "admin",
        permissions: ["tasks.read", "tasks.manage"]
      });

      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const task of taskResult.items) {
        // Chỉ quét công việc chưa hoàn thành/hủy bỏ
        if (task.status === "completed" || task.status === "cancelled") {
          continue;
        }

        if (!task.dueAt) {
          continue;
        }

        const dueTime = new Date(task.dueAt);
        const assigneeUid = task.assignee?.uid || task.creator?.uid;

        if (!assigneeUid) {
          continue; // Không có ai chịu trách nhiệm để thông báo
        }

        if (dueTime < now) {
          // 1. Quá hạn (Overdue)
          const idempotencyId = `due-overdue-${task.id}`;
          
          // Thêm thông báo idempotent
          const notif = await this.addNotification({
            id: idempotencyId,
            userId: assigneeUid,
            title: `Cảnh báo: Công việc quá hạn [${task.title}]`,
            content: `Công việc '${task.title}' đã bị quá hạn kể từ ngày ${dueTime.toLocaleString()}. Vui lòng hoàn thành hoặc thương lượng cập nhật tiến độ.`,
            type: "task_overdue",
            taskId: task.id,
            sendEmail: true
          });

          // Nếu đúng là mới nạp thông báo thực tế (chứ không phải bị bỏ qua do trùng lặp)
          if (notif.createdAt === new Date().toISOString() || !inMemoryNotifications.slice(1).some(n => n.id === idempotencyId)) {
            overdueCount++;
          }
        } else if (dueTime >= now && dueTime <= oneDayFromNow) {
          // 2. Sắp quá hạn (Near Due - trong 24h)
          const idempotencyId = `due-neardue-${task.id}`;

          const notif = await this.addNotification({
            id: idempotencyId,
            userId: assigneeUid,
            title: `Cảnh báo: Công việc sắp đến hạn [${task.title}]`,
            content: `Công việc '${task.title}' sắp hết hạn hoàn thành vào ngày ${dueTime.toLocaleString()}. Hãy ưu tiên hoàn thành đúng hẹn.`,
            type: "task_near_due",
            taskId: task.id,
            sendEmail: true
          });

          if (notif.createdAt === new Date().toISOString() || !inMemoryNotifications.slice(1).some(n => n.id === idempotencyId)) {
            nearDueCount++;
          }
        }
      }

      logger.info(`[NotificationService] Hoàn thành quét. Phát hiện quá hạn mới: ${overdueCount}, sắp quá hạn mới: ${nearDueCount}`);
    } catch (err: any) {
      logger.error(`[NotificationService] Lỗi nghiêm trọng khi thực thi quét tác vụ: ${err.message}`);
    }

    return { overdueCount, nearDueCount };
  }
};

export default notificationService;
