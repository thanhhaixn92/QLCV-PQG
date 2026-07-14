import { reportingManifest } from "./manifest";
import { registerReportingRoutes } from "./routes/reportingRoutes";

export const reportingModule = {
  manifest: reportingManifest,
  registerRoutes: registerReportingRoutes
};

export default reportingModule;
