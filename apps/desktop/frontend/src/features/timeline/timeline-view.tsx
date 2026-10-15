"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorMessage } from "@/features/tasks/error-message";
import { useTaskStore } from "@/features/tasks/task-store";
import { useTasksChanged } from "@/features/tasks/use-tasks-changed";
import { useAction } from "@/features/tasks/use-action";
import { useNow } from "@/features/timer/use-now";
import { useIsClient } from "@/hooks/use-is-client";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatDate, formatTime } from "@/lib/format/date";
import { createBlock, listBlocks, updateBlock, useIsTauri, type Block } from "@/lib/tauri";
import { BlockEditor } from "./block-editor";
import {
  PX_PER_MINUTE,
  MINUTES_PER_DAY,
  addDays,
  assignLanes,
  dayRange,
  geometry,
  isSameDay,
  isoFromTimeInput,
  minutesIntoDay,
  movedStart,
  startOfDay,
} from "./timeline-model";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function TimelineView() {
  const t = useTranslations();
  const { locale } = useLocale();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const tasks = useTaskStore((state) => state.tasks);
  const { error, run } = useAction();
  const nowMs = useNow(true);

  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const load = useCallback(() => {
    const { from, to } = dayRange(day);
    return listBlocks(from, to)
      .then((next) => {
        setBlocks(next);
        setLoadError(null);
      })
      .catch((caught: unknown) => setLoadError(errorMessage(t, caught)));
  }, [day, t]);

  useEffect(() => {
    if (inTauri) void load();
  }, [inTauri, load]);

  useTasksChanged(load);

  // Start the view near the current time (or 07:00 on other days).
  useEffect(() => {
    const target = isSameDay(day, new Date()) ? Math.max(0, minutesIntoDay(new Date().toISOString(), day) - 60) : 7 * 60;
    scroller.current?.scrollTo({ top: target * PX_PER_MINUTE });
  }, [day, isClient, inTauri]);

  if (!isClient) return null;

  if (!inTauri) {
    return <p className="text-muted-foreground">{t.errors.ipc.unavailable}</p>;
  }

  const taskTitle = new Map(tasks.map((task) => [task.id, task.title]));
  const label = (block: Block) =>
    (block.taskId ? taskTitle.get(block.taskId) : undefined) ?? block.title ?? t.timeline.untitled;
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const lanes = assignLanes(
    blocks.map((block) => {
      const start = minutesIntoDay(block.startAt, day);
      return { id: block.id, start, end: start + block.durationMin };
    }),
  );
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const today = isSameDay(day, new Date(nowMs));
  const nowMinutes = minutesIntoDay(new Date(nowMs).toISOString(), day);
  const shownError = error ?? loadError;

  // A drag changes the block's own start (ADR 007). The list refetches from `tasks://changed`.
  function onDragEnd(event: DragEndEvent) {
    const block = byId.get(String(event.active.id));
    if (!block) return;
    const startAt = movedStart(block.startAt, block.durationMin, event.delta.y / PX_PER_MINUTE, day);
    if (startAt !== new Date(block.startAt).toISOString()) {
      void run(() => updateBlock(block.id, { startAt }));
    }
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => t.timeline.announce.pickedUp.replace("{title}", label(byId.get(String(active.id))!)),
    onDragOver: () => undefined,
    onDragEnd: ({ active }) => t.timeline.announce.dropped.replace("{title}", label(byId.get(String(active.id))!)),
    onDragCancel: ({ active }) => t.timeline.announce.cancelled.replace("{title}", label(byId.get(String(active.id))!)),
  };

  return (
    <section aria-labelledby="timeline-heading" className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="timeline-heading" className="text-lg font-semibold">
          {formatDate(day, locale, { dateStyle: "full" })}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" aria-label={t.timeline.previousDay} onClick={() => setDay(addDays(day, -1))}>
            <ChevronLeft className="rtl:rotate-180" aria-hidden />
          </Button>
          <Button variant="outline" onClick={() => setDay(startOfDay(new Date()))}>
            {t.timeline.today}
          </Button>
          <Button variant="outline" size="icon" aria-label={t.timeline.nextDay} onClick={() => setDay(addDays(day, 1))}>
            <ChevronRight className="rtl:rotate-180" aria-hidden />
          </Button>
        </div>
      </div>

      <NewBlockForm day={day} />

      {shownError ? (
        <p role="alert" className="text-sm text-destructive">
          {shownError}
        </p>
      ) : null}

      {blocks.length === 0 ? <p className="text-sm text-muted-foreground">{t.timeline.empty}</p> : null}

      <DndContext
        sensors={sensors}
        onDragEnd={onDragEnd}
        accessibility={{ announcements, screenReaderInstructions: { draggable: t.timeline.instructions } }}
      >
        <div ref={scroller} className="max-h-[60vh] overflow-y-auto rounded-md border border-border">
          <div className="relative flex" style={{ height: MINUTES_PER_DAY * PX_PER_MINUTE }}>
            <div className="w-16 shrink-0 border-e border-border" aria-hidden>
              {HOURS.map((hour) => (
                <div key={hour} className="border-b border-border pe-2 pt-0.5 text-end text-xs text-muted-foreground" style={{ height: 60 * PX_PER_MINUTE }}>
                  {formatTime(new Date(2026, 0, 1, hour), locale)}
                </div>
              ))}
            </div>

            <div className="relative flex-1">
              {HOURS.map((hour) => (
                <div key={hour} className="border-b border-border/60" style={{ height: 60 * PX_PER_MINUTE }} />
              ))}

              {today ? (
                <div
                  role="separator"
                  aria-label={`${t.timeline.now} ${formatTime(new Date(nowMs), locale)}`}
                  className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-timer-progress"
                  style={{ top: nowMinutes * PX_PER_MINUTE }}
                >
                  <span className="absolute -top-2 start-0 rounded-sm bg-timer-progress px-1 text-xs text-primary-foreground">
                    {t.timeline.now}
                  </span>
                </div>
              ) : null}

              {blocks.map((block) => {
                const place = lanes.get(block.id) ?? { lane: 0, lanes: 1 };
                return (
                  <BlockCard
                    key={block.id}
                    block={block}
                    title={label(block)}
                    day={day}
                    lane={place.lane}
                    lanes={place.lanes}
                    selected={block.id === selectedId}
                    onSelect={() => setSelectedId(block.id === selectedId ? null : block.id)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </DndContext>

      {selected ? (
        <BlockEditor key={`${selected.id}-${selected.revision}`} block={selected} day={day} onClose={() => setSelectedId(null)} />
      ) : (
        <p className="text-xs text-muted-foreground">{t.timeline.selectHint}</p>
      )}
    </section>
  );
}

function BlockCard({
  block,
  title,
  day,
  lane,
  lanes,
  selected,
  onSelect,
}: {
  block: Block;
  title: string;
  day: Date;
  lane: number;
  lanes: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations();
  const { locale } = useLocale();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: block.id });
  const place = geometry(block.startAt, block.durationMin, day);
  const end = new Date(Date.parse(block.startAt) + block.durationMin * 60000);

  return (
    <div
      ref={setNodeRef}
      className={`absolute z-10 flex items-start overflow-hidden rounded-md border bg-card text-xs shadow-sm ${
        selected ? "border-2 border-ring" : "border-border"
      } ${isDragging ? "opacity-70" : ""}`}
      style={{
        top: place.top,
        height: place.height,
        insetInlineStart: `${(lane / lanes) * 100}%`,
        width: `${100 / lanes}%`,
        transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
      }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={t.timeline.dragHandle.replace("{title}", title)}
        className="cursor-grab touch-none p-0.5 text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="min-w-0 flex-1 px-1 py-0.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span dir="auto" className="block truncate font-medium">
          {title}
        </span>
        <span className="block truncate text-muted-foreground">
          {formatTime(block.startAt, locale)} – {formatTime(end, locale)}
        </span>
      </button>
    </div>
  );
}

function NewBlockForm({ day }: { day: Date }) {
  const t = useTranslations();
  const tasks = useTaskStore((state) => state.tasks);
  const { error, run } = useAction();
  const [taskId, setTaskId] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [duration, setDuration] = useState("30");

  const open = tasks.filter((task) => task.status !== "done" && task.status !== "archived");

  function onTaskChange(id: string) {
    setTaskId(id);
    const estimate = tasks.find((task) => task.id === id)?.estimateMinutes;
    if (estimate) setDuration(String(estimate));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startAt = isoFromTimeInput(day, start);
    if (startAt === null) return;
    const created = await run(() =>
      createBlock({
        kind: "task",
        taskId: taskId || null,
        title: taskId ? null : title,
        startAt,
        durationMin: Number(duration),
      }),
    );
    if (created) setTitle("");
  }

  return (
    <form onSubmit={onSubmit} aria-label={t.timeline.addBlock} className="grid items-end gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
      <div className="flex flex-col gap-1">
        <label className="text-sm" htmlFor="block-task">
          {t.timer.task}
        </label>
        <div className="flex gap-2">
          <Select id="block-task" value={taskId} onChange={(event) => onTaskChange(event.target.value)}>
            <option value="">{t.timeline.noTask}</option>
            {open.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </Select>
          {taskId === "" ? (
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label={t.timeline.blockTitle}
              placeholder={t.timeline.blockTitle}
              dir="auto"
            />
          ) : null}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        {t.timeline.start}
        <Input type="time" required value={start} onChange={(event) => setStart(event.target.value)} dir="ltr" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t.timeline.duration}
        <Input
          type="number"
          min={1}
          max={1440}
          step={1}
          required
          inputMode="numeric"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          className="w-24"
        />
      </label>
      <Button type="submit">{t.timeline.add}</Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-4">
          {error}
        </p>
      ) : null}
    </form>
  );
}
