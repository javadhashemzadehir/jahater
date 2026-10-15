"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";
import { errorMessage } from "@/features/tasks/error-message";
import { useTasksChanged } from "@/features/tasks/use-tasks-changed";
import { useIsClient } from "@/hooks/use-is-client";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatDate } from "@/lib/format/date";
import { listTrashedTasks, purgeTask, restoreTask, useIsTauri, type Task } from "@/lib/tauri";

export function TrashView() {
  const t = useTranslations();
  const { locale } = useLocale();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return listTrashedTasks()
      .then((next) => {
        setTasks(next);
        setError(null);
      })
      .catch((caught: unknown) => setError(errorMessage(t, caught)));
  }, [t]);

  useEffect(() => {
    if (inTauri) void load();
  }, [inTauri, load]);

  useTasksChanged(load);

  async function onRestore(id: string) {
    try {
      await restoreTask(id);
      setError(null);
    } catch (caught: unknown) {
      setError(errorMessage(t, caught));
    }
  }

  async function onPurge(id: string) {
    try {
      await purgeTask(id);
      setError(null);
    } catch (caught: unknown) {
      setError(errorMessage(t, caught));
    }
  }

  if (!isClient) return null;

  if (!inTauri) {
    return <p className="text-muted-foreground">{t.errors.ipc.unavailable}</p>;
  }

  return (
    <section aria-labelledby="trash-heading" className="flex w-full max-w-xl flex-col gap-4">
      <h2 id="trash-heading" className="text-lg font-semibold">
        {t.trash.title}
      </h2>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {tasks.length === 0 ? <p className="text-sm text-muted-foreground">{t.trash.empty}</p> : null}

      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span dir="auto" className="truncate text-sm">
                {task.title}
              </span>
              {task.deletedAt ? (
                <time dateTime={task.deletedAt} className="text-xs text-muted-foreground">
                  {t.trash.trashedOn} {formatDate(task.deletedAt, locale)}
                </time>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => void onRestore(task.id)}>
                {t.trash.restore}
              </Button>
              <HoldToConfirmButton
                size="sm"
                holdLabel={t.trash.purgeHold}
                confirmingLabel={t.trash.purgeConfirming}
                onConfirm={() => void onPurge(task.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
