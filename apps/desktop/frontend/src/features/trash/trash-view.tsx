"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
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
    return (
      <Alert className="max-w-xl">
        <AlertDescription>{t.errors.ipc.unavailable}</AlertDescription>
      </Alert>
    );
  }

  return (
    <section aria-labelledby="trash-heading" className="flex w-full max-w-xl flex-col gap-4">
      <h2 id="trash-heading" className="text-lg font-semibold">
        {t.trash.title}
      </h2>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {tasks.length === 0 ? (
        <Empty>
          <EmptyDescription>{t.trash.empty}</EmptyDescription>
        </Empty>
      ) : null}

      <ItemGroup className="gap-2">
        {tasks.map((task) => (
          <Item key={task.id} role="listitem" variant="outline" size="sm">
            <ItemContent className="gap-0.5">
              <ItemTitle dir="auto" className="w-full font-normal">
                <span className="truncate">{task.title}</span>
              </ItemTitle>
              {task.deletedAt ? (
                <ItemDescription>
                  <time dateTime={task.deletedAt}>
                    {t.trash.trashedOn} {formatDate(task.deletedAt, locale)}
                  </time>
                </ItemDescription>
              ) : null}
            </ItemContent>
            <ItemActions>
              <Button variant="outline" size="sm" onClick={() => void onRestore(task.id)}>
                {t.trash.restore}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    {t.trash.purge}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.trash.purgeTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.trash.purgeDescription.replace("{title}", task.title)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.tasks.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      className={buttonVariants({ variant: "destructive" })}
                      onClick={() => void onPurge(task.id)}
                    >
                      {t.trash.purge}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </section>
  );
}
