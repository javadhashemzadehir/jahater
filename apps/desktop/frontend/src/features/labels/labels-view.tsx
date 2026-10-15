"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/features/tasks/error-message";
import { useTaskStore } from "@/features/tasks/task-store";
import { useAction } from "@/features/tasks/use-action";
import { useIsClient } from "@/hooks/use-is-client";
import { useTranslations } from "@/hooks/use-locale";
import {
  createProject,
  createTag,
  deleteProject,
  deleteTag,
  renameProject,
  renameTag,
  useIsTauri,
  type Label,
} from "@/lib/tauri";

type Api = {
  create: (name: string) => Promise<unknown>;
  rename: (id: string, name: string) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

const projectApi: Api = { create: createProject, rename: renameProject, remove: deleteProject };
const tagApi: Api = { create: createTag, rename: renameTag, remove: deleteTag };

export function LabelsView() {
  const t = useTranslations();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const { projects, tags, error: loadError } = useTaskStore();

  if (!isClient) return null;

  if (!inTauri) {
    return <p className="text-muted-foreground">{t.errors.ipc.unavailable}</p>;
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      {loadError ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(t, loadError)}
        </p>
      ) : null}
      <LabelSection
        id="projects"
        heading={t.labels.projects}
        addLabel={t.labels.addProject}
        placeholder={t.labels.projectPlaceholder}
        empty={t.labels.noProjects}
        items={projects}
        api={projectApi}
      />
      <LabelSection
        id="tags"
        heading={t.labels.tags}
        addLabel={t.labels.addTag}
        placeholder={t.labels.tagPlaceholder}
        empty={t.labels.noTags}
        items={tags}
        api={tagApi}
      />
    </div>
  );
}

type SectionProps = {
  id: string;
  heading: string;
  addLabel: string;
  placeholder: string;
  empty: string;
  items: Label[];
  api: Api;
};

function LabelSection({ id, heading, addLabel, placeholder, empty, items, api }: SectionProps) {
  const t = useTranslations();
  const { error, run } = useAction();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await run(() => api.create(name))) setName("");
  }

  async function onRename(event: FormEvent<HTMLFormElement>, labelId: string) {
    event.preventDefault();
    if (await run(() => api.rename(labelId, draft))) setEditingId(null);
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
      <h2 id={`${id}-heading`} className="text-lg font-semibold">
        {heading}
      </h2>

      <form onSubmit={onAdd} className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label={addLabel}
          placeholder={placeholder}
          dir="auto"
        />
        <Button type="submit">{t.tasks.add}</Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            {editingId === item.id ? (
              <form onSubmit={(event) => void onRename(event, item.id)} className="flex flex-1 gap-2">
                <Input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  aria-label={t.labels.rename}
                  dir="auto"
                />
                <Button type="submit" size="sm">
                  {t.tasks.save}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  {t.tasks.cancel}
                </Button>
              </form>
            ) : (
              <>
                <bdi className="min-w-0 truncate text-sm">{item.name}</bdi>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDraft(item.name);
                      setEditingId(item.id);
                    }}
                  >
                    {t.labels.rename}
                  </Button>
                  <HoldToConfirmButton
                    size="sm"
                    holdLabel={t.labels.deleteHold}
                    confirmingLabel={t.trash.purgeConfirming}
                    onConfirm={() => void run(() => api.remove(item.id))}
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
