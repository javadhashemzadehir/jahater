"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Separator />
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-title`}>{t.tasks.titleLabel}</FieldLabel>
          <Input id={`${fieldId}-title`} value={title} onChange={(event) => setTitle(event.target.value)} dir="auto" />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${fieldId}-notes`}>{t.tasks.notes}</FieldLabel>
          <Textarea
            id={`${fieldId}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            dir="auto"
            rows={3}
          />
        </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-estimate`}>{t.tasks.estimate}</FieldLabel>
          <Input
            id={`${fieldId}-estimate`}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={estimate}
            onChange={(event) => setEstimate(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${fieldId}-project`}>{t.tasks.project}</FieldLabel>
          <NativeSelect id={`${fieldId}-project`} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <NativeSelectOption value="">{t.tasks.noProject}</NativeSelectOption>
            {projects.map((project) => (
              <NativeSelectOption key={project.id} value={project.id}>
                {project.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>

      {tags.length > 0 ? (
        <FieldSet>
          <FieldLegend>{t.tasks.tags}</FieldLegend>
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Field key={tag.id} orientation="horizontal" className="w-auto">
                <Checkbox
                  id={`${fieldId}-tag-${tag.id}`}
                  checked={tagIds.includes(tag.id)}
                  onCheckedChange={() => toggleTag(tag.id)}
                />
                <FieldLabel htmlFor={`${fieldId}-tag-${tag.id}`}>
                  <bdi>{tag.name}</bdi>
                </FieldLabel>
              </Field>
            ))}
          </div>
        </FieldSet>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <Field orientation="horizontal" className="w-auto">
          <Checkbox
            id={`${fieldId}-urgent`}
            checked={isUrgent}
            onCheckedChange={(checked) => setIsUrgent(checked === true)}
          />
          <FieldLabel htmlFor={`${fieldId}-urgent`}>{t.tasks.urgent}</FieldLabel>
        </Field>
        <Field orientation="horizontal" className="w-auto">
          <Checkbox
            id={`${fieldId}-important`}
            checked={isImportant}
            onCheckedChange={(checked) => setIsImportant(checked === true)}
          />
          <FieldLabel htmlFor={`${fieldId}-important`}>{t.tasks.important}</FieldLabel>
        </Field>
      </div>
      </FieldGroup>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
