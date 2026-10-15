"use client";

import { useEffect, useRef } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { onTasksChanged, useIsTauri } from "@/lib/tauri";

/** Calls `handler` whenever the backend reports a task write. No-op outside the desktop shell. */
export function useTasksChanged(handler: () => void) {
  const inTauri = useIsTauri();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!inTauri) return;
    let disposed = false;
    let unlisten: UnlistenFn | undefined;

    onTasksChanged(() => handlerRef.current()).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [inTauri]);
}
