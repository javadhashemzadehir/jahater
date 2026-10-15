"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TasksView } from "@/features/tasks/tasks-view";
import { TrashView } from "@/features/trash/trash-view";
import { useTranslations } from "@/hooks/use-locale";

type View = "tasks" | "trash";

const views: View[] = ["tasks", "trash"];

export function Workspace() {
  const t = useTranslations();
  const [view, setView] = useState<View>("tasks");

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div role="group" aria-label={t.views.label} className="inline-flex gap-1 rounded-md border border-border p-1">
        {views.map((value) => {
          const pressed = view === value;
          return (
            <Button
              key={value}
              variant={pressed ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={pressed}
              onClick={() => setView(value)}
            >
              {t.views[value]}
            </Button>
          );
        })}
      </div>

      {view === "tasks" ? <TasksView /> : <TrashView />}
    </div>
  );
}
