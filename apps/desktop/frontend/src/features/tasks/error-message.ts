import { IpcError } from "@/lib/tauri";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Resolves a caught IPC error to its localized message. Unknown errors fall back to the IPC message. */
export function errorMessage(t: Dictionary, caught: unknown): string {
  const key = caught instanceof IpcError ? caught.command.messageKey : "errors.ipc.unavailable";
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (typeof node === "object" && node !== null && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, t);
  return typeof value === "string" ? value : t.errors.ipc.unavailable;
}
