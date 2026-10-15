"use client";

import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/app-providers";
import { AppShell } from "@/components/shell/app-shell";

// Client boundary for everything under the root layout.
export function AppRoot({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
