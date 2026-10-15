"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  if (!orphan) {
    return loadError ? (
      <Alert variant="destructive" className="max-w-xl">
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    ) : null;
  }

  async function resolve(action: OrphanAction) {
    if (await run(() => resolveOrphanTimer(action))) setOrphan(null);
  }

  const lastSeen = formatTime(orphan.lastSeenAt, locale);
  const tracked = formatClock(orphan.elapsedAtLastSeenSeconds, locale);

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : setOrphan(null))}>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))] max-w-none">
        <DialogHeader>
          <DialogTitle>{t.orphan.title}</DialogTitle>
          <DialogDescription>{t.orphan.description.replace("{time}", lastSeen)}</DialogDescription>
        </DialogHeader>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              {t.orphan.later}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
