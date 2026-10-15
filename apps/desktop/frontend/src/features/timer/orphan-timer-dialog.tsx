"use client";

import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/features/tasks/error-message";
import { useAction } from "@/features/tasks/use-action";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatClock, formatTime } from "@/lib/format/date";
import {
  getOrphanTimer,
  resolveOrphanTimer,
  useIsTauri,
  type OrphanAction,
  type OrphanTimer,
} from "@/lib/tauri";

/**
 * Asks what to do with a timer the previous session left running: keep it, stop it at the last
 * moment the app saw it alive, or discard it. Closing the dialog leaves the timer as it is.
 */
export function OrphanTimerDialog() {
  const t = useTranslations();
  const { locale } = useLocale();
  const inTauri = useIsTauri();
  const { error, run } = useAction();
  const [orphan, setOrphan] = useState<OrphanTimer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!inTauri) return;
    getOrphanTimer()
      .then(setOrphan)
      .catch((caught: unknown) => setLoadError(errorMessage(t, caught)));
    // Asked once per launch; the translations only matter for an error message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTauri]);

  if (!orphan) return loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null;

  async function resolve(action: OrphanAction) {
    if (await run(() => resolveOrphanTimer(action))) setOrphan(null);
  }

  const lastSeen = formatTime(orphan.lastSeenAt, locale);
  const tracked = formatClock(orphan.elapsedAtLastSeenSeconds, locale);

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? undefined : setOrphan(null))}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80" />
        <Dialog.Content className="fixed start-1/2 top-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-y-1/2 flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-lg ltr:-translate-x-1/2 rtl:translate-x-1/2">
          <Dialog.Title className="text-lg font-semibold">{t.orphan.title}</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {t.orphan.description.replace("{time}", lastSeen)}
          </Dialog.Description>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button onClick={() => void resolve("stopAtLastSeen")}>
              {t.orphan.stopAtLastSeen.replace("{time}", lastSeen).replace("{tracked}", tracked)}
            </Button>
            <Button variant="outline" onClick={() => void resolve("resume")}>
              {t.orphan.resume}
            </Button>
            <Button variant="ghost" onClick={() => void resolve("discard")}>
              {t.orphan.discard}
            </Button>
          </div>

          <Dialog.Close asChild>
            <Button variant="ghost" size="sm">
              {t.orphan.later}
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
