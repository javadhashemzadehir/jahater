"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsClient } from "@/hooks/use-is-client";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatDate } from "@/lib/format/date";
import { createTask, listTasks, trashTask, useIsTauri, type Task } from "@/lib/tauri";
import { errorMessage } from "./error-message";
import { useTasksChanged } from "./use-tasks-changed";

// Temporary task list. The full list view with shared store sync replaces it in S1.2.

export function TasksView() {
  const t = useTranslations();
  const { locale } = useLocale();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return listTasks()
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createTask({ title });
      setTitle("");
      setError(null);
    } catch (caught: unknown) {
      setError(errorMessage(t, caught));
    }
  }

  async function onTrash(id: string) {
    try {
      await trashTask(id);
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
    <section className="flex w-full max-w-xl flex-col gap-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label={t.tasks.titleLabel}
          placeholder={t.tasks.titlePlaceholder}
          dir="auto"
        />
        <Button type="submit">{t.tasks.add}</Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {tasks.length === 0 ? <p className="text-sm text-muted-foreground">{t.tasks.empty}</p> : null}

      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span dir="auto" className="truncate text-sm">
                {task.title}
              </span>
              <time dateTime={task.createdAt} className="text-xs text-muted-foreground">
                {formatDate(task.createdAt, locale)}
              </time>
            </div>
            <Button variant="outline" size="sm" onClick={() => void onTrash(task.id)}>
              {t.tasks.moveToTrash}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
