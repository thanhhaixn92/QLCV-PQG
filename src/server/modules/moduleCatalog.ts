import { tasksQueryModule } from "./tasks-query/tasksQueryModule";
import { tasksCommandModule } from "./tasks-command/register";
import { referenceModule } from "./reference-module/register";
import { identityModule } from "./identity/register";
import { documentsModule } from "./documents/documentsModule";
import { geminiAgentModule } from "./gemini-agent/registerServer";
import { notificationsModule } from "./notifications/register";
import { reportingModule } from "./reporting/register";
import { adminPanelModule } from "./admin/register";

export const moduleCatalog = [
  tasksQueryModule,
  tasksCommandModule,
  referenceModule,
  identityModule,
  documentsModule,
  geminiAgentModule,
  notificationsModule,
  reportingModule,
  adminPanelModule,
];

