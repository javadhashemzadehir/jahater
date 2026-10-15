"use client";

import { useState } from "react";
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
import { GripVertical } from "lucide-react";
import { Select } from "@/components/ui/select";
import { errorMessage } from "@/features/tasks/error-message";
import { useTaskStore } from "@/features/tasks/task-store";
import { useAction } from "@/features/tasks/use-action";
import { useIsClient } from "@/hooks/use-is-client";
import { useTranslations } from "@/hooks/use-locale";
import { updateTask, useIsTauri, type Task } from "@/lib/tauri";
import { boardStatuses, groupByStatus, isBoardStatus, statusAfterDrop, type BoardStatus } from "./board-model";

export function BoardView() {
  const t = useTranslations();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const { tasks, error: loadError } = useTaskStore();
  const { error, run } = useAction();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Pointer drags need a small distance so a click on the card is not a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  if (!isClient) return null;

  if (!inTauri) {
    return <p className="text-muted-foreground">{t.errors.ipc.unavailable}</p>;
  }

  const columns = groupByStatus(tasks);
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const activeTask = activeId ? byId.get(activeId) : undefined;
  const shownError = error ?? (loadError ? errorMessage(t, loadError) : null);

  // A drag changes the task's own `status` (ADR 007). The store refills from `tasks://changed`.
  function moveTo(task: Task, status: BoardStatus) {
    void run(() => updateTask(task.id, { status }));
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const task = byId.get(String(event.active.id));
    if (!task) return;
    const status = statusAfterDrop(task, event.over?.id);
    if (status) moveTo(task, status);
  }

  const title = (id: unknown) => byId.get(String(id))?.title ?? "";
  const column = (id: unknown) => (isBoardStatus(id) ? t.board.columns[id] : "");

  const announcements: Announcements = {
    onDragStart: ({ active }) => t.board.announce.pickedUp.replace("{title}", title(active.id)),
    onDragOver: ({ active, over }) =>
      over
        ? t.board.announce.over.replace("{title}", title(active.id)).replace("{column}", column(over.id))
        : t.board.announce.outside.replace("{title}", title(active.id)),
    onDragEnd: ({ active, over }) =>
      over
        ? t.board.announce.dropped.replace("{title}", title(active.id)).replace("{column}", column(over.id))
        : t.board.announce.cancelled.replace("{title}", title(active.id)),
    onDragCancel: ({ active }) => t.board.announce.cancelled.replace("{title}", title(active.id)),
  };

  return (
    <section aria-labelledby="board-heading" className="flex w-full max-w-5xl flex-col gap-4">
      <h2 id="board-heading" className="sr-only">
        {t.views.board}
      </h2>

      {shownError ? (
        <p role="alert" className="text-sm text-destructive">
          {shownError}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: t.board.instructions },
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {boardStatuses.map((status) => (
            <Column key={status} status={status} tasks={columns[status]} onMove={moveTo} />
          ))}
        </div>
        <DragOverlay>{activeTask ? <CardBody task={activeTask} lifted /> : null}</DragOverlay>
      </DndContext>
    </section>
  );
}

function Column({
  status,
  tasks,
  onMove,
}: {
  status: BoardStatus;
  tasks: Task[];
  onMove: (task: Task, status: BoardStatus) => void;
}) {
  const t = useTranslations();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const headingId = `board-${status}`;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={
        isOver
          ? "flex min-h-40 flex-col gap-2 rounded-lg border-2 border-dashed border-ring bg-accent/40 p-3"
          : "flex min-h-40 flex-col gap-2 rounded-lg border border-border bg-card p-3"
      }
    >
      <h3 id={headingId} className="flex items-center justify-between text-sm font-semibold">
        {t.board.columns[status]}
        <span className="text-xs font-normal text-muted-foreground">{tasks.length}</span>
      </h3>
      {tasks.length === 0 ? <p className="text-xs text-muted-foreground">{t.board.emptyColumn}</p> : null}
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <Card key={task.id} task={task} onMove={onMove} />
        ))}
      </ul>
    </section>
  );
}

function Card({ task, onMove }: { task: Task; onMove: (task: Task, status: BoardStatus) => void }) {
  const t = useTranslations();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <li ref={setNodeRef} className={isDragging ? "opacity-40" : undefined}>
      <CardBody
        task={task}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={t.board.dragHandle.replace("{title}", task.title)}
            className="cursor-grab touch-none rounded-sm p-1 text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        }
        move={
          <Select
            aria-label={t.board.moveTo.replace("{title}", task.title)}
            value={isBoardStatus(task.status) ? task.status : ""}
            onChange={(event) => {
              if (isBoardStatus(event.target.value)) onMove(task, event.target.value);
            }}
            className="h-8 text-xs"
          >
            {boardStatuses.map((status) => (
              <option key={status} value={status}>
                {t.board.columns[status]}
              </option>
            ))}
          </Select>
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
  handle?: React.ReactNode;
  move?: React.ReactNode;
  lifted?: boolean;
}) {
  return (
    <div
      className={
        lifted
          ? "flex flex-col gap-2 rounded-md border border-ring bg-background p-2 shadow-md"
          : "flex flex-col gap-2 rounded-md border border-border bg-background p-2"
      }
    >
      <div className="flex items-start gap-2">
        {handle}
        <span dir="auto" className={task.status === "done" ? "min-w-0 flex-1 text-sm line-through" : "min-w-0 flex-1 text-sm"}>
          {task.title}
        </span>
      </div>
      {move}
    </div>
  );
}
