import { notificationsManifest } from "./manifest";
import { registerNotificationRoutes } from "./routes/notificationRoutes";

export const notificationsModule = {
  manifest: notificationsManifest,
  registerRoutes: registerNotificationRoutes
};

export default notificationsModule;
