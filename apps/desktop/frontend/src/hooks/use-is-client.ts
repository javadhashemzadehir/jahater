"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False during server render and hydration, true once the client is mounted.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
