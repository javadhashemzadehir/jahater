"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { errorMessage } from "@/features/tasks/error-message";
import { useTaskStore } from "@/features/tasks/task-store";
import { useAction } from "@/features/tasks/use-action";
import { useTasksChanged } from "@/features/tasks/use-tasks-changed";
import { CircularTimer } from "@/features/timer/circular-timer";
import { useTimerStore } from "@/features/timer/timer-store";
import { useNow } from "@/features/timer/use-now";
import { dayRange, startOfDay } from "@/features/timeline/timeline-model";
import { useTranslations } from "@/hooks/use-locale";
import { listBlocks, pauseTimer, resumeTimer, startTimer, stopTimer, updateTask, useIsTauri, type Block } from "@/lib/tauri";
import { pickCurrentTask } from "./focus-model";

/**
 * Only the current task and its timer. No lists, no navigation: the single way out is the
 * button at the bottom.
 */
export function FocusView({ onExit }: { onExit: () => void }) {
  const t = useTranslations();
  const inTauri = useIsTauri();
  const tasks = useTaskStore((state) => state.tasks);
  const { active, error: timerError } = useTimerStore();
  const { error, run } = useAction();
  const nowMs = useNow(true);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockError, setBlockError] = useState<string | null>(null);

  const load = useCallback(() => {
    const { from, to } = dayRange(startOfDay(new Date()));
    return listBlocks(from, to)
      .then((next) => {
        setBlocks(next);
        setBlockError(null);
      })
      .catch((caught: unknown) => setBlockError(errorMessage(t, caught)));
  }, [t]);

  useEffect(() => {
    if (inTauri) void load();
  }, [inTauri, load]);

  useTasksChanged(load);

  const current = pickCurrentTask({ timer: active, blocks, tasks, nowMs });
  const shownError = error ?? blockError ?? (timerError ? errorMessage(t, timerError) : null);

  return (
    <section aria-labelledby="focus-heading" className="flex w-full max-w-md flex-col items-center gap-8 py-6">
      <h2 id="focus-heading" className="sr-only">
        {t.focus.title}
      </h2>

      {current ? (
        <p dir="auto" className="text-center text-2xl font-semibold">
          {current.title}
        </p>
      ) : (
        <Empty>
          <EmptyDescription>{t.focus.nothingCurrent}</EmptyDescription>
        </Empty>
      )}

      {shownError ? (
        <Alert variant="destructive">
          <AlertDescription>{shownError}</AlertDescription>
        </Alert>
      ) : null}

      {active ? (
        <>
          <CircularTimer timer={active} nowMs={nowMs} />
          <div className="flex gap-2">
            {active.isPaused ? (
              <Button size="lg" onClick={() => void run(resumeTimer)}>
                {t.timer.resume}
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => void run(pauseTimer)}>
                {t.timer.pause}
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={() => void run(stopTimer)}>
              {t.timer.stop}
            </Button>
          </div>
        </>
      ) : (
        <Button size="lg" onClick={() => void run(() => startTimer({ taskId: current?.id ?? null, mode: "tracker" }))}>
          {t.timer.start}
        </Button>
      )}

      {current && current.status !== "done" ? (
        <Button variant="ghost" onClick={() => void run(() => updateTask(current.id, { status: "done" }))}>
          {t.focus.markDone}
        </Button>
      ) : null}

      <Button variant="ghost" size="sm" onClick={onExit}>
        {t.focus.exit}
      </Button>
    </section>
  );
}
