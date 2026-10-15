"use client";

import { useEffect } from "react";
import { useIsTauri } from "@/lib/tauri";
import { useSettingsStore } from "./settings-store";

/** Mount once near the root: loads device settings from the backend. */
export function useSettingsSync() {
  const inTauri = useIsTauri();
  const refresh = useSettingsStore((state) => state.refresh);

  useEffect(() => {
    if (inTauri) void refresh();
  }, [inTauri, refresh]);
}
