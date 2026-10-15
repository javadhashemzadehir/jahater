"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useIsClient } from "@/hooks/use-is-client";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatDate, formatDuration } from "@/lib/format/date";
import { createTask, trashTask, updateTask, useIsTauri, type Task } from "@/lib/tauri";
import { errorMessage } from "./error-message";
import { TaskEditor } from "./task-editor";
import { useTaskStore } from "./task-store";
import { useAction } from "./use-action";

export function TasksView() {
  const t = useTranslations();
  const { locale } = useLocale();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const { tasks, projects, tags, error: loadError } = useTaskStore();
  const { error, run } = useAction();
  const [title, setTitle] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await run(() => createTask({ title, projectId: projectFilter || null }));
    if (created) setTitle("");
  }

  if (!isClient) return null;

  if (!inTauri) {
    return (
      <Alert className="max-w-xl">
        <AlertDescription>{t.errors.ipc.unavailable}</AlertDescription>
      </Alert>
    );
  }

  const projectName = new Map(projects.map((project) => [project.id, project.name]));
  const tagName = new Map(tags.map((tag) => [tag.id, tag.name]));
  const visible = tasks.filter(
    (task) =>
      task.status !== "archived" &&
      (projectFilter === "" || task.projectId === projectFilter) &&
      (tagFilter === "" || task.tagIds.includes(tagFilter)),
  );
  const shownError = error ?? (loadError ? errorMessage(t, loadError) : null);

  function toggleDone(task: Task) {
    void run(() => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" }));
  }

  return (
    <section aria-labelledby="tasks-heading" className="flex w-full max-w-2xl flex-col gap-4">
      <h2 id="tasks-heading" className="sr-only">
        {t.views.tasks}
      </h2>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label={t.tasks.titleLabel}
          placeholder={t.tasks.titlePlaceholder}
          dir="auto"
        />
        <Button type="submit">{t.tasks.add}</Button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2">
        <NativeSelect aria-label={t.tasks.filterProject} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <NativeSelectOption value="">{t.tasks.allProjects}</NativeSelectOption>
          {projects.map((project) => (
            <NativeSelectOption key={project.id} value={project.id}>
              {project.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label={t.tasks.filterTag} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <NativeSelectOption value="">{t.tasks.allTags}</NativeSelectOption>
          {tags.map((tag) => (
            <NativeSelectOption key={tag.id} value={tag.id}>
              {tag.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {shownError ? (
        <Alert variant="destructive">
          <AlertDescription>{shownError}</AlertDescription>
        </Alert>
      ) : null}

      {visible.length === 0 ? (
        <Empty>
          <EmptyDescription>{t.tasks.empty}</EmptyDescription>
        </Empty>
      ) : null}

      <ItemGroup className="gap-2">
        {visible.map((task) => {
          const done = task.status === "done";
          const editing = editingId === task.id;
          return (
            <Item key={task.id} role="listitem" variant="outline" size="sm">
              <Checkbox
                checked={done}
                onCheckedChange={() => toggleDone(task)}
                aria-label={done ? t.tasks.markTodo : t.tasks.markDone}
              />
              <ItemContent className="gap-0.5">
                <ItemTitle dir="auto" className={done ? "w-full font-normal text-muted-foreground line-through" : "w-full font-normal"}>
                  <span className="truncate">{task.title}</span>
                </ItemTitle>
                <ItemDescription className="flex flex-wrap gap-x-3">
                    {task.projectId ? <bdi>{projectName.get(task.projectId)}</bdi> : null}
                    {task.tagIds.map((id) => (
                      <bdi key={id}>#{tagName.get(id)}</bdi>
                    ))}
                    {task.estimateMinutes ? <span>{formatDuration(task.estimateMinutes, locale)}</span> : null}
                  <time dateTime={task.createdAt}>{formatDate(task.createdAt, locale)}</time>
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={editing}
                  onClick={() => setEditingId(editing ? null : task.id)}
                >
                  {t.tasks.edit}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void run(() => trashTask(task.id))}>
                  {t.tasks.moveToTrash}
                </Button>
              </ItemActions>
              {editing ? (
                <div className="basis-full">
                  <TaskEditor
                  key={task.revision}
                  task={task}
                  projects={projects}
                  tags={tags}
                    onClose={() => setEditingId(null)}
                  />
                </div>
              ) : null}
            </Item>
          );
        })}
      </ItemGroup>
    </section>
  );
}
