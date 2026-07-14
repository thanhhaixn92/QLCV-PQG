import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleUnavailablePage } from "../shell/ModuleUnavailablePage";
import { clientModuleRegistry } from "../infrastructure/modules/clientModuleRegistry";
import { ModuleErrorBoundary } from "../components/ModuleErrorBoundary";

interface AppRoutesProps {
  activeModules: Record<string, boolean>;
  dashboardElement: React.ReactNode;
}

export function AppRoutes({ activeModules, dashboardElement }: AppRoutesProps) {
  const clientModules = clientModuleRegistry.getAllModules();
  const RouteComp = Route as any;

  return (
    <Routes>
      <Route path="/" element={dashboardElement} />
      
      {clientModules.flatMap((mod) => {
        const { id } = mod.manifest;
        const isEnabled = activeModules[id] === true;

        return mod.routes.map((route) => (
          <RouteComp
            key={`${id}-${route.path}`}
            path={route.path}
            element={
              isEnabled ? (
                <ModuleErrorBoundary moduleId={id}>
                  {route.element}
                </ModuleErrorBoundary>
              ) : (
                <ModuleUnavailablePage moduleId={id} />
              )
            }
          />
        ));
      })}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default AppRoutes;
