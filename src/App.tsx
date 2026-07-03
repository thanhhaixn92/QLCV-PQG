/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AppProviders } from "./client/app/AppProviders";
import { App as ClientApp } from "./client/app/App";

export default function App() {
  return (
    <AppProviders>
      <ClientApp />
    </AppProviders>
  );
}

