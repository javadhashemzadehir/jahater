"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BoardView } from "@/features/board/board-view";
import { MatrixView } from "@/features/matrix/matrix-view";
import { LabelsView } from "@/features/labels/labels-view";
import { TasksView } from "@/features/tasks/tasks-view";
import { useTaskSync } from "@/features/tasks/use-task-sync";
import { OrphanTimerDialog } from "@/features/timer/orphan-timer-dialog";
import { ReviewView } from "@/features/review/review-view";
import { SettingsView } from "@/features/settings/settings-view";
import { useSettingsSync } from "@/features/settings/use-settings-sync";
import { TimelineView } from "@/features/timeline/timeline-view";
import { ReportsView } from "@/features/reports/reports-view";
import { TimerPanel } from "@/features/timer/timer-panel";
import { useTimerSync } from "@/features/timer/use-timer-sync";
import { TrashView } from "@/features/trash/trash-view";
import { useTranslations } from "@/hooks/use-locale";

type View = "tasks" | "board" | "matrix" | "timeline" | "timer" | "reports" | "review" | "settings" | "labels" | "trash";

const views: View[] = ["tasks", "board", "matrix", "timeline", "timer", "reports", "review", "settings", "labels", "trash"];

export function Workspace() {
  const t = useTranslations();
  const [view, setView] = useState<View>("tasks");
  useTaskSync();
  useTimerSync();
  useSettingsSync();

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <OrphanTimerDialog />
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

      {view === "tasks" ? <TasksView /> : null}
      {view === "board" ? <BoardView /> : null}
      {view === "matrix" ? <MatrixView /> : null}
      {view === "timeline" ? <TimelineView /> : null}
      {view === "timer" ? <TimerPanel /> : null}
      {view === "reports" ? <ReportsView /> : null}
      {view === "review" ? <ReviewView /> : null}
      {view === "settings" ? <SettingsView /> : null}
      {view === "labels" ? <LabelsView /> : null}
      {view === "trash" ? <TrashView /> : null}
    </div>
  );
}
