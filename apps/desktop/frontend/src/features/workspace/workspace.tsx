"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoardView } from "@/features/board/board-view";
import { FocusView } from "@/features/focus/focus-view";
import { LabelsView } from "@/features/labels/labels-view";
import { MatrixView } from "@/features/matrix/matrix-view";
import { ReportsView } from "@/features/reports/reports-view";
import { ReviewView } from "@/features/review/review-view";
import { SettingsView } from "@/features/settings/settings-view";
import { useSettingsSync } from "@/features/settings/use-settings-sync";
import { TasksView } from "@/features/tasks/tasks-view";
import { useTaskSync } from "@/features/tasks/use-task-sync";
import { OrphanTimerDialog } from "@/features/timer/orphan-timer-dialog";
import { TimerPanel } from "@/features/timer/timer-panel";
import { useTimerSync } from "@/features/timer/use-timer-sync";
import { TimelineView } from "@/features/timeline/timeline-view";
import { TrashView } from "@/features/trash/trash-view";
import { useTranslations } from "@/hooks/use-locale";

type View = "tasks" | "board" | "matrix" | "timeline" | "timer" | "reports" | "review" | "settings" | "labels" | "trash";

const screens: Record<View, () => ReactNode> = {
  tasks: () => <TasksView />,
  board: () => <BoardView />,
  matrix: () => <MatrixView />,
  timeline: () => <TimelineView />,
  timer: () => <TimerPanel />,
  reports: () => <ReportsView />,
  review: () => <ReviewView />,
  settings: () => <SettingsView />,
  labels: () => <LabelsView />,
  trash: () => <TrashView />,
};

const views = Object.keys(screens) as View[];

function isView(value: string): value is View {
  return value in screens;
}

export function Workspace() {
  const t = useTranslations();
  const [view, setView] = useState<View>("tasks");
  const [focus, setFocus] = useState(false);
  useTaskSync();
  useTimerSync();
  useSettingsSync();

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <OrphanTimerDialog />

      {focus ? (
        <FocusView onExit={() => setFocus(false)} />
      ) : (
        <Tabs
          value={view}
          onValueChange={(value) => {
            if (isView(value)) setView(value);
          }}
          className="w-full items-center gap-6"
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <TabsList aria-label={t.views.label} className="h-auto flex-wrap">
              {views.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {t.views[value]}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="outline" size="sm" onClick={() => setFocus(true)}>
              {t.focus.enter}
            </Button>
          </div>

          {/* Only the active tab is mounted (Radix default). */}
          {views.map((value) => (
            <TabsContent key={value} value={value} className="flex w-full justify-center">
              {screens[value]()}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
