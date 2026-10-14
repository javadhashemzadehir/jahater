"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useIsClient } from "@/hooks/use-is-client";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatDate } from "@/lib/format/date";
import { IpcError, createTask, listTasks, useIsTauri, type Task } from "@/lib/tauri";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Temporary S0.3 check: save a task and read it back through the full stack.
// Replaced by the list view in S1.2.

type Messages = Dictionary;

function messageFor(t: Messages, key: string): string {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (typeof node === "object" && node !== null && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, t);
  return typeof value === "string" ? value : t.errors.ipc.unavailable;
}

export function TaskProbe() {
  const t = useTranslations();
  const { locale } = useLocale();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inTauri) return;
    listTasks()
      .then(setTasks)
      .catch((caught: unknown) => setError(messageFor(t, caughtKey(caught))));
    // Load once on mount; the store refetch on tasks://changed arrives in S1.2.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTauri]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createTask({ title });
      setTasks((current) => [created, ...current]);
      setTitle("");
      setError(null);
    } catch (caught: unknown) {
      setError(messageFor(t, caughtKey(caught)));
    }
  }

  if (!isClient) return null;

  if (!inTauri) {
    return <p className="text-muted-foreground">{t.errors.ipc.unavailable}</p>;
  }

  return (
    <section className="flex w-full max-w-xl flex-col gap-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label={t.tasks.titleLabel}
          placeholder={t.tasks.titlePlaceholder}
          dir="auto"
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit">{t.tasks.add}</Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-md border border-border px-3 py-2">
            <span dir="auto" className="block text-sm">
              {task.title}
            </span>
            <time dateTime={task.createdAt} className="text-xs text-muted-foreground">
              {formatDate(task.createdAt, locale)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}

function caughtKey(caught: unknown): string {
  return caught instanceof IpcError ? caught.command.messageKey : "errors.ipc.unavailable";
}
