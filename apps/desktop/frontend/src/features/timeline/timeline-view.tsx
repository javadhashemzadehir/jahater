"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { errorMessage } from "@/features/tasks/error-message";
import { useTaskStore } from "@/features/tasks/task-store";
import { useTasksChanged } from "@/features/tasks/use-tasks-changed";
import { useAction } from "@/features/tasks/use-action";
import { useNow } from "@/features/timer/use-now";
import { useIsClient } from "@/hooks/use-is-client";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatDate, formatTime } from "@/lib/format/date";
import { blockKindSchema, createBlock, listBlocks, updateBlock, useIsTauri, type Block, type BlockKind } from "@/lib/tauri";
import { useSettingsStore } from "@/features/settings/settings-store";
import { BlockEditor } from "./block-editor";
import { CapacityBar } from "./capacity-bar";
import {
  PX_PER_MINUTE,
  MINUTES_PER_DAY,
  addDays,
  assignLanes,
  dayRange,
  geometry,
  isSameDay,
  isoFromTimeInput,
  loadOf,
  plannedMinutes,
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
  const capacity = useSettingsStore((state) => state.settings.capacityMinutes);
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
    return (
      <Alert className="max-w-xl">
        <AlertDescription>{t.errors.ipc.unavailable}</AlertDescription>
      </Alert>
    );
  }

  const taskTitle = new Map(tasks.map((task) => [task.id, task.title]));
  const label = (block: Block) =>
    (block.taskId ? taskTitle.get(block.taskId) : undefined) ??
    block.title ??
    (block.kind === "task" ? t.timeline.untitled : t.timeline.kinds[block.kind]);
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

      <CapacityBar load={loadOf(plannedMinutes(blocks, day), capacity)} />

      <NewBlockForm day={day} />

      {shownError ? (
        <Alert variant="destructive">
          <AlertDescription>{shownError}</AlertDescription>
        </Alert>
      ) : null}

      {blocks.length === 0 ? (
        <Empty className="p-4">
          <EmptyDescription>{t.timeline.empty}</EmptyDescription>
        </Empty>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragEnd={onDragEnd}
        accessibility={{ announcements, screenReaderInstructions: { draggable: t.timeline.instructions } }}
      >
        <Card ref={scroller} className="block max-h-[60vh] overflow-y-auto shadow-none">
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
                  <Badge className="absolute -top-2.5 start-0 border-transparent bg-timer-progress px-1 py-0 text-primary-foreground">
                    {t.timeline.now}
                  </Badge>
                </div>
              ) : null}

              {blocks.map((block) => {
                const place = lanes.get(block.id) ?? { lane: 0, lanes: 1 };
                return (
                  <BlockCard
                    key={block.id}
                    block={block}
                    title={label(block)}
                    kindLabel={block.kind === "task" ? null : t.timeline.kinds[block.kind]}
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
        </Card>
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
  kindLabel,
  day,
  lane,
  lanes,
  selected,
  onSelect,
}: {
  block: Block;
  title: string;
  kindLabel: string | null;
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
    <Card
      ref={setNodeRef}
      className={`absolute z-10 flex-row items-start overflow-hidden rounded-md text-xs ${
        selected ? "border-2 border-ring" : ""
      } ${kindLabel ? "border-dashed" : ""} ${isDragging ? "opacity-70" : ""}`}
      style={{
        top: place.top,
        height: place.height,
        insetInlineStart: `${(lane / lanes) * 100}%`,
        width: `${100 / lanes}%`,
        transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        ref={setActivatorNodeRef}
        aria-label={t.timeline.dragHandle.replace("{title}", title)}
        className="size-6 shrink-0 cursor-grab touch-none rounded-none text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-pressed={selected}
        onClick={onSelect}
        className="h-auto min-w-0 flex-1 flex-col items-stretch gap-0 rounded-none px-1 py-0.5 text-start text-xs font-normal whitespace-normal"
      >
        <span dir="auto" className="block truncate font-medium">
          {title}
        </span>
        <span className="block truncate text-muted-foreground">
          {kindLabel ? `${kindLabel} · ` : ""}
          {formatTime(block.startAt, locale)} – {formatTime(end, locale)}
        </span>
      </Button>
    </Card>
  );
}

function NewBlockForm({ day }: { day: Date }) {
  const t = useTranslations();
  const tasks = useTaskStore((state) => state.tasks);
  const { error, run } = useAction();
  const [kind, setKind] = useState<BlockKind>("task");
  const [taskId, setTaskId] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [duration, setDuration] = useState("30");

  const open = tasks.filter((task) => task.status !== "done" && task.status !== "archived");
  const isTask = kind === "task";

  function onKindChange(next: BlockKind) {
    setKind(next);
    // Short protective blocks start at a sensible length; the user can change it.
    if (next === "buffer" || next === "transition") setDuration("10");
    if (next !== "task") setTaskId("");
  }

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
        kind,
        taskId: isTask && taskId ? taskId : null,
        title: taskId ? null : title,
        startAt,
        durationMin: Number(duration),
      }),
    );
    if (created) setTitle("");
  }

  return (
    <form onSubmit={onSubmit} aria-label={t.timeline.addBlock} className="grid items-end gap-2 sm:grid-cols-[auto_1fr_auto_auto_auto]">
      <Field>
        <FieldLabel htmlFor="block-kind">{t.timeline.kind}</FieldLabel>
        <NativeSelect id="block-kind" value={kind} onChange={(event) => onKindChange(event.target.value as BlockKind)}>
          {blockKindSchema.options.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {t.timeline.kinds[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="block-task">{isTask ? t.timer.task : t.timeline.blockTitle}</FieldLabel>
        {isTask ? (
          <div className="flex gap-2">
            <NativeSelect id="block-task" value={taskId} onChange={(event) => onTaskChange(event.target.value)}>
              <NativeSelectOption value="">{t.timeline.noTask}</NativeSelectOption>
              {open.map((task) => (
                <NativeSelectOption key={task.id} value={task.id}>
                  {task.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
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
        ) : (
          <Input
            id="block-task"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t.timeline.kinds[kind]}
            dir="auto"
          />
        )}
      </Field>
      <Field>
        <FieldLabel htmlFor="block-start">{t.timeline.start}</FieldLabel>
        <Input id="block-start" type="time" required value={start} onChange={(event) => setStart(event.target.value)} dir="ltr" />
      </Field>
      <Field>
        <FieldLabel htmlFor="block-duration">{t.timeline.duration}</FieldLabel>
        <Input
          id="block-duration"
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
      </Field>
      <Button type="submit">{t.timeline.add}</Button>
      {error ? (
        <Alert variant="destructive" className="sm:col-span-5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
