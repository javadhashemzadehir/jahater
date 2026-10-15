"use client";

import { useEffect } from "react";
import { useIsTauri } from "@/lib/tauri";
import { useTaskStore } from "./task-store";
import { useTasksChanged } from "./use-tasks-changed";

/** Mount once near the root: loads the store and keeps it fresh on `tasks://changed`. */
export function useTaskSync() {
  const inTauri = useIsTauri();
  const refresh = useTaskStore((state) => state.refresh);

  useEffect(() => {
    if (inTauri) void refresh();
  }, [inTauri, refresh]);

  useTasksChanged(refresh);
}
