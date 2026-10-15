"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTranslations } from "@/hooks/use-locale";
import { updateTask, type Label, type Task } from "@/lib/tauri";
import { useAction } from "./use-action";

type Props = {
  task: Task;
  projects: Label[];
  tags: Label[];
  onClose: () => void;
};

export function TaskEditor({ task, projects, tags, onClose }: Props) {
  const t = useTranslations();
  const { error, run } = useAction();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [estimate, setEstimate] = useState(task.estimateMinutes?.toString() ?? "");
  const [projectId, setProjectId] = useState(task.projectId ?? "");
  const [tagIds, setTagIds] = useState(task.tagIds);
  const [isUrgent, setIsUrgent] = useState(task.isUrgent);
  const [isImportant, setIsImportant] = useState(task.isImportant);

  function toggleTag(id: string) {
    setTagIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minutes = estimate.trim() === "" ? null : Number(estimate);
    const saved = await run(() =>
      updateTask(task.id, {
        title,
        notes: notes.trim() === "" ? null : notes,
        estimateMinutes: minutes,
        projectId: projectId === "" ? null : projectId,
        tagIds,
        isUrgent,
        isImportant,
      }),
    );
    if (saved) onClose();
  }

  const fieldId = `task-${task.id}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-border pt-3">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-title`}>
        {t.tasks.titleLabel}
        <Input id={`${fieldId}-title`} value={title} onChange={(event) => setTitle(event.target.value)} dir="auto" />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-notes`}>
        {t.tasks.notes}
        <textarea
          id={`${fieldId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          dir="auto"
          rows={3}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-estimate`}>
          {t.tasks.estimate}
          <Input
            id={`${fieldId}-estimate`}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={estimate}
            onChange={(event) => setEstimate(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-project`}>
          {t.tasks.project}
          <Select id={`${fieldId}-project`} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">{t.tasks.noProject}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {tags.length > 0 ? (
        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-1 text-sm">{t.tasks.tags}</legend>
          {tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={tagIds.includes(tag.id)}
                onChange={() => toggleTag(tag.id)}
              />
              <bdi>{tag.name}</bdi>
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={isUrgent}
            onChange={(event) => setIsUrgent(event.target.checked)}
          />
          {t.tasks.urgent}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={isImportant}
            onChange={(event) => setIsImportant(event.target.checked)}
          />
          {t.tasks.important}
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {t.tasks.save}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t.tasks.cancel}
        </Button>
      </div>
    </form>
  );
}
