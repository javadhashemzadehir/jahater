"use client";

import { useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarClock, Flame, GripVertical, Pause, Zap, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { errorMessage } from "@/features/tasks/error-message";
import { useTaskStore } from "@/features/tasks/task-store";
import { useAction } from "@/features/tasks/use-action";
import { useIsClient } from "@/hooks/use-is-client";
import { useTranslations } from "@/hooks/use-locale";
import { updateTask, useIsTauri, type Task } from "@/lib/tauri";
import {
  flagsAfterDrop,
  flagsFor,
  groupByQuadrant,
  parseQuadrantId,
  quadrantId,
  quadrantOf,
  quadrants,
  type Quadrant,
} from "./matrix-model";

// Colour is never the only cue: each quadrant also has an icon and a text title.
const icons: Record<Quadrant, LucideIcon> = { 1: Flame, 2: CalendarClock, 3: Zap, 4: Pause };

// Literal class names so Tailwind can see them.
const tones: Record<Quadrant, string> = { 1: "bg-quadrant-1", 2: "bg-quadrant-2", 3: "bg-quadrant-3", 4: "bg-quadrant-4" };

// Layout order: row "important" (1, 2) above row "not important" (3, 4), urgent column first.
const layout: Quadrant[] = [1, 2, 3, 4];

export function MatrixView() {
  const t = useTranslations();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const { tasks, error: loadError } = useTaskStore();
  const { error, run } = useAction();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  if (!isClient) return null;

  if (!inTauri) {
    return (
      <Alert className="max-w-xl">
        <AlertDescription>{t.errors.ipc.unavailable}</AlertDescription>
      </Alert>
    );
  }

  const groups = groupByQuadrant(tasks);
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const activeTask = activeId ? byId.get(activeId) : undefined;
  const shownError = error ?? (loadError ? errorMessage(t, loadError) : null);

  // A drag changes the task's own two flags (ADR 007). The store refills from `tasks://changed`.
  function moveTo(task: Task, quadrant: Quadrant) {
    void run(() => updateTask(task.id, flagsFor(quadrant)));
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const task = byId.get(String(event.active.id));
    if (!task) return;
    const flags = flagsAfterDrop(task, event.over?.id);
    if (flags) void run(() => updateTask(task.id, flags));
  }

  const title = (id: unknown) => byId.get(String(id))?.title ?? "";
  const quadrantName = (id: unknown) => {
    const quadrant = parseQuadrantId(id);
    return quadrant ? t.matrix.quadrants[quadrant] : "";
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => t.board.announce.pickedUp.replace("{title}", title(active.id)),
    onDragOver: ({ active, over }) =>
      over
        ? t.board.announce.over.replace("{title}", title(active.id)).replace("{column}", quadrantName(over.id))
        : t.matrix.announce.outside.replace("{title}", title(active.id)),
    onDragEnd: ({ active, over }) =>
      over
        ? t.board.announce.dropped.replace("{title}", title(active.id)).replace("{column}", quadrantName(over.id))
        : t.board.announce.cancelled.replace("{title}", title(active.id)),
    onDragCancel: ({ active }) => t.board.announce.cancelled.replace("{title}", title(active.id)),
  };

  return (
    <section aria-labelledby="matrix-heading" className="flex w-full max-w-4xl flex-col gap-4">
      <h2 id="matrix-heading" className="sr-only">
        {t.views.matrix}
      </h2>

      {shownError ? (
        <Alert variant="destructive">
          <AlertDescription>{shownError}</AlertDescription>
        </Alert>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: t.matrix.instructions },
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <p className="text-center text-xs font-medium text-muted-foreground">{t.matrix.urgent}</p>
          <p className="text-center text-xs font-medium text-muted-foreground">{t.matrix.notUrgent}</p>
          {layout.map((quadrant) => (
            <Cell key={quadrant} quadrant={quadrant} tasks={groups[quadrant]} onMove={moveTo} />
          ))}
        </div>
        <DragOverlay>{activeTask ? <CardBody task={activeTask} lifted /> : null}</DragOverlay>
      </DndContext>

      <p className="text-xs text-muted-foreground">{t.matrix.rowHint}</p>
    </section>
  );
}

function Cell({
  quadrant,
  tasks,
  onMove,
}: {
  quadrant: Quadrant;
  tasks: Task[];
  onMove: (task: Task, quadrant: Quadrant) => void;
}) {
  const t = useTranslations();
  const { setNodeRef, isOver } = useDroppable({ id: quadrantId(quadrant) });
  const Icon = icons[quadrant];
  const headingId = `matrix-${quadrant}`;
  const tone = tones[quadrant];

  return (
    <Card
      ref={setNodeRef}
      role="region"
      aria-labelledby={headingId}
      className={`${tone} min-h-44 ${isOver ? "border-2 border-dashed border-ring" : ""}`}
    >
      <CardHeader className="p-3 pb-0">
        <CardTitle id={headingId} className="flex items-center gap-2 text-sm">
          <Icon className="size-4" aria-hidden />
          {t.matrix.quadrants[quadrant]}
          <Badge variant="secondary" className="ms-auto">
            {tasks.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">{t.matrix.hints[quadrant]}</CardDescription>
      </CardHeader>
      <CardContent className="p-3">
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onMove={onMove} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TaskCard({ task, onMove }: { task: Task; onMove: (task: Task, quadrant: Quadrant) => void }) {
  const t = useTranslations();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <li ref={setNodeRef} className={isDragging ? "opacity-40" : undefined}>
      <CardBody
        task={task}
        handle={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            ref={setActivatorNodeRef}
            aria-label={t.board.dragHandle.replace("{title}", task.title)}
            className="cursor-grab touch-none text-muted-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden />
          </Button>
        }
        move={
          <NativeSelect
            size="sm"
            aria-label={t.matrix.moveTo.replace("{title}", task.title)}
            value={String(quadrantOf(task))}
            onChange={(event) => {
              const target = parseQuadrantId(`q${event.target.value}`);
              if (target) onMove(task, target);
            }}
          >
            {quadrants.map((quadrant) => (
              <NativeSelectOption key={quadrant} value={quadrant}>
                {t.matrix.quadrants[quadrant]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        }
      />
    </li>
  );
}

function CardBody({
  task,
  handle,
  move,
  lifted = false,
}: {
  task: Task;
  handle?: ReactNode;
  move?: ReactNode;
  lifted?: boolean;
}) {
  return (
    <Card className={lifted ? "gap-2 border-ring bg-background p-2 shadow-md" : "gap-2 bg-background p-2"}>
      <div className="flex items-start gap-2">
        {handle}
        <span dir="auto" className="min-w-0 flex-1 text-sm">
          {task.title}
        </span>
      </div>
      {move}
    </Card>
  );
}
