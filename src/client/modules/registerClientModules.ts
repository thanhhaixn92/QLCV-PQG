import { clientModuleRegistry } from "../infrastructure/modules/clientModuleRegistry";
import { ListTodo, Cpu, Users, FolderOpen, Bell, BarChart3, Shield } from "lucide-react";
import { tasksQueryManifest } from "./tasks-query/manifest";
import { TasksQueryPlaceholder } from "./tasks-query/TasksQueryPlaceholder";
import { referenceModuleManifest } from "./reference-module/manifest";
import { ReferencePlaceholder } from "./reference-module/ReferencePlaceholder";
import { identityModuleManifest } from "./identity/manifest";
import { IdentityPlaceholder } from "./identity/IdentityPlaceholder";
import { documentsManifest } from "./documents/manifest";
import { DocumentsModuleView } from "./documents/DocumentsModuleView";
import { notificationsManifest } from "./notifications/manifest";
import { NotificationsModuleView } from "./notifications/NotificationsModuleView";
import { reportingManifest } from "./reporting/manifest";
import { ReportingModuleView } from "./reporting/ReportingModuleView";
import { adminManifest } from "./admin/manifest";
import { AdminModuleView } from "./admin/AdminModuleView";
import React from "react";

let initialized = false;

export function registerClientModules() {
  if (initialized) return;
  initialized = true;

  clientModuleRegistry.registerModule({
    manifest: tasksQueryManifest,
    routes: [
      {
        path: "/tasks-query",
        element: React.createElement(TasksQueryPlaceholder)
      }
    ],
    menuItem: {
      icon: ListTodo,
      label: "Truy vấn Công việc",
      path: "/tasks-query"
    }
  });

  clientModuleRegistry.registerModule({
    manifest: referenceModuleManifest,
    routes: [
      {
        path: "/reference-module",
        element: React.createElement(ReferencePlaceholder)
      }
    ],
    menuItem: {
      icon: Cpu,
      label: "Mô-đun Tham chiếu",
      path: "/reference-module"
    }
  });

  clientModuleRegistry.registerModule({
    manifest: identityModuleManifest,
    routes: [
      {
        path: "/identity-management",
        element: React.createElement(IdentityPlaceholder)
      }
    ],
    menuItem: {
      icon: Users,
      label: "Danh tính & Quyền",
      path: "/identity-management"
    }
  });

  clientModuleRegistry.registerModule({
    manifest: documentsManifest,
    routes: [
      {
        path: "/documents",
        element: React.createElement(DocumentsModuleView)
      }
    ],
    menuItem: {
      icon: FolderOpen,
      label: "Tài liệu & Biên tập",
      path: "/documents"
    }
  });

  clientModuleRegistry.registerModule({
    manifest: notificationsManifest,
    routes: [
      {
        path: "/notifications",
        element: React.createElement(NotificationsModuleView)
      }
    ],
    menuItem: {
      icon: Bell,
      label: "Thông báo & Cảnh báo",
      path: "/notifications"
    }
  });

  clientModuleRegistry.registerModule({
    manifest: reportingManifest,
    routes: [
      {
        path: "/reporting",
        element: React.createElement(ReportingModuleView)
      }
    ],
    menuItem: {
      icon: BarChart3,
      label: "Báo cáo & Thống kê",
      path: "/reporting"
    }
  });

  clientModuleRegistry.registerModule({
    manifest: adminManifest,
    routes: [
      {
        path: "/admin-panel",
        element: React.createElement(AdminModuleView)
      }
    ],
    menuItem: {
      icon: Shield,
      label: "Bảng Điều khiển Quản trị",
      path: "/admin-panel"
    }
  });
}

