"use client";

import { useState } from "react";
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
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
    return (
      <Alert className="max-w-xl">
        <AlertDescription>{t.errors.ipc.unavailable}</AlertDescription>
      </Alert>
    );
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
    <Card
      ref={setNodeRef}
      role="region"
      aria-labelledby={headingId}
      className={isOver ? "min-h-40 border-2 border-dashed border-ring bg-accent/40" : "min-h-40"}
    >
      <CardHeader className="p-3 pb-0">
        <CardTitle id={headingId} className="flex items-center justify-between text-sm">
          {t.board.columns[status]}
          <Badge variant="secondary">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-3">
        {tasks.length === 0 ? <p className="text-xs text-muted-foreground">{t.board.emptyColumn}</p> : null}
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onMove={onMove} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TaskCard({ task, onMove }: { task: Task; onMove: (task: Task, status: BoardStatus) => void }) {
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
            aria-label={t.board.moveTo.replace("{title}", task.title)}
            value={isBoardStatus(task.status) ? task.status : ""}
            onChange={(event) => {
              if (isBoardStatus(event.target.value)) onMove(task, event.target.value);
            }}
          >
            {boardStatuses.map((status) => (
              <NativeSelectOption key={status} value={status}>
                {t.board.columns[status]}
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
  handle?: React.ReactNode;
  move?: React.ReactNode;
  lifted?: boolean;
}) {
  return (
    <Card className={lifted ? "gap-2 border-ring bg-background p-2 shadow-md" : "gap-2 bg-background p-2"}>
      <div className="flex items-start gap-2">
        {handle}
        <span dir="auto" className={task.status === "done" ? "min-w-0 flex-1 text-sm line-through" : "min-w-0 flex-1 text-sm"}>
          {task.title}
        </span>
      </div>
      {move}
    </Card>
  );
}
