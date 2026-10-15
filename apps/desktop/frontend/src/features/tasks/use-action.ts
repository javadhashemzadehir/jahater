"use client";

import { useState } from "react";
import { useTranslations } from "@/hooks/use-locale";
import { errorMessage } from "./error-message";

/** Runs a backend call and keeps its localized error for display. */
export function useAction() {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    try {
      await action();
      setError(null);
      return true;
    } catch (caught: unknown) {
      setError(errorMessage(t, caught));
      return false;
    }
  }

  return { error, run };
}
