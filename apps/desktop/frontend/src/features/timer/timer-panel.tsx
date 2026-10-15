"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage } from "@/features/tasks/error-message";
import { useTaskStore } from "@/features/tasks/task-store";
import { useAction } from "@/features/tasks/use-action";
import { useIsClient } from "@/hooks/use-is-client";
import { useTranslations } from "@/hooks/use-locale";
import {
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  timerModeSchema,
  useIsTauri,
  type TimerMode,
} from "@/lib/tauri";
import { CircularTimer } from "./circular-timer";
import { useNow } from "./use-now";
import { useTimerStore } from "./timer-store";

const modes = timerModeSchema.options;

// Timebox needs a length; pomodoro defaults to 25 minutes; tracker and flowtime run open-ended.
const needsTarget: Record<TimerMode, "required" | "optional" | "none"> = {
  tracker: "none",
  timebox: "required",
  pomodoro: "optional",
  flowtime: "none",
};

export function TimerPanel() {
  const t = useTranslations();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const { active, error: loadError } = useTimerStore();
  const tasks = useTaskStore((state) => state.tasks);
  const { error, run } = useAction();
  const nowMs = useNow(active !== null && !active.isPaused);

  const [taskId, setTaskId] = useState("");
  const [mode, setMode] = useState<TimerMode>("tracker");
  const [minutes, setMinutes] = useState("25");

  if (!isClient) return null;

  if (!inTauri) {
    return <p className="text-muted-foreground">{t.errors.ipc.unavailable}</p>;
  }

  const shownError = error ?? (loadError ? errorMessage(t, loadError) : null);
  const taskTitle = new Map(tasks.map((task) => [task.id, task.title]));
  const openTasks = tasks.filter((task) => task.status !== "done" && task.status !== "archived");

  function onStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = needsTarget[mode] === "none" || minutes.trim() === "" ? null : Number(minutes);
    void run(() => startTimer({ taskId: taskId || null, mode, targetMin: target }));
  }

  return (
    <section aria-labelledby="timer-heading" className="flex w-full max-w-md flex-col items-center gap-6">
      <h2 id="timer-heading" className="sr-only">
        {t.views.timer}
      </h2>

      {shownError ? (
        <p role="alert" className="text-sm text-destructive">
          {shownError}
        </p>
      ) : null}

      {active ? (
        <>
          <p className="text-sm text-muted-foreground">
            {t.timer.modes[active.mode]}
            {active.taskId && taskTitle.get(active.taskId) ? (
              <>
                {" · "}
                <bdi>{taskTitle.get(active.taskId)}</bdi>
              </>
            ) : null}
          </p>
          <CircularTimer timer={active} nowMs={nowMs} />
          <div className="flex gap-2">
            {active.isPaused ? (
              <Button onClick={() => void run(resumeTimer)}>{t.timer.resume}</Button>
            ) : (
              <Button variant="secondary" onClick={() => void run(pauseTimer)}>
                {t.timer.pause}
              </Button>
            )}
            <Button variant="outline" onClick={() => void run(stopTimer)}>
              {t.timer.stop}
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={onStart} className="flex w-full flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t.timer.idle}</p>

          <label className="flex flex-col gap-1 text-sm" htmlFor="timer-task">
            {t.timer.task}
            <Select id="timer-task" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              <option value="">{t.timer.noTask}</option>
              {openTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-sm" htmlFor="timer-mode">
            {t.timer.mode}
            <Select id="timer-mode" value={mode} onChange={(event) => setMode(event.target.value as TimerMode)}>
              {modes.map((value) => (
                <option key={value} value={value}>
                  {t.timer.modes[value]}
                </option>
              ))}
            </Select>
          </label>

          {needsTarget[mode] !== "none" ? (
            <label className="flex flex-col gap-1 text-sm" htmlFor="timer-minutes">
              {t.timer.minutes}
              <Input
                id="timer-minutes"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={minutes}
                required={needsTarget[mode] === "required"}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </label>
          ) : null}

          <Button type="submit">{t.timer.start}</Button>
        </form>
      )}
    </section>
  );
}
