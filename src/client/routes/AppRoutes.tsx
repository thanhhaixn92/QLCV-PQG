import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { TasksQueryPlaceholder } from "../modules/tasks-query/TasksQueryPlaceholder";
import { ModuleUnavailablePage } from "../shell/ModuleUnavailablePage";

interface AppRoutesProps {
  activeModules: Record<string, boolean>;
  dashboardElement: React.ReactNode;
}

export function AppRoutes({ activeModules, dashboardElement }: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={dashboardElement} />
      
      <Route
        path="/tasks-query"
        element={
          activeModules["tasks-query"] ? (
            <TasksQueryPlaceholder />
          ) : (
            <ModuleUnavailablePage moduleId="tasks-query" />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default AppRoutes;
