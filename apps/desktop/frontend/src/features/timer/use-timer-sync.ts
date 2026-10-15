"use client";

import { useEffect, useRef } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { onTimerChanged, useIsTauri } from "@/lib/tauri";
import { useTimerStore } from "./timer-store";

/** Mount once near the root: loads the running timer and refetches on `timer://changed`. */
export function useTimerSync() {
  const inTauri = useIsTauri();
  const refresh = useTimerStore((state) => state.refresh);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    if (!inTauri) return;
    void refreshRef.current();

    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    onTimerChanged(() => void refreshRef.current()).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [inTauri]);
}
