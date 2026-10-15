"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
    return <p className="text-muted-foreground">{t.errors.ipc.unavailable}</p>;
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
        <Select aria-label={t.tasks.filterProject} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">{t.tasks.allProjects}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <Select aria-label={t.tasks.filterTag} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">{t.tasks.allTags}</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </Select>
      </div>

      {shownError ? (
        <p role="alert" className="text-sm text-destructive">
          {shownError}
        </p>
      ) : null}

      {visible.length === 0 ? <p className="text-sm text-muted-foreground">{t.tasks.empty}</p> : null}

      <ul className="flex flex-col gap-2">
        {visible.map((task) => {
          const done = task.status === "done";
          const editing = editingId === task.id;
          return (
            <li key={task.id} className="flex flex-col gap-2 rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-primary"
                  checked={done}
                  onChange={() => toggleDone(task)}
                  aria-label={done ? t.tasks.markTodo : t.tasks.markDone}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span dir="auto" className={done ? "truncate text-sm text-muted-foreground line-through" : "truncate text-sm"}>
                    {task.title}
                  </span>
                  <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {task.projectId ? <bdi>{projectName.get(task.projectId)}</bdi> : null}
                    {task.tagIds.map((id) => (
                      <bdi key={id}>#{tagName.get(id)}</bdi>
                    ))}
                    {task.estimateMinutes ? <span>{formatDuration(task.estimateMinutes, locale)}</span> : null}
                    <time dateTime={task.createdAt}>{formatDate(task.createdAt, locale)}</time>
                  </span>
                </div>
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
              </div>
              {editing ? (
                <TaskEditor
                  key={task.revision}
                  task={task}
                  projects={projects}
                  tags={tags}
                  onClose={() => setEditingId(null)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
