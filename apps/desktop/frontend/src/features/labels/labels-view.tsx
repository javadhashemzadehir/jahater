"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
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
    return (
      <Alert className="max-w-xl">
        <AlertDescription>{t.errors.ipc.unavailable}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(t, loadError)}</AlertDescription>
        </Alert>
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
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <Empty>
          <EmptyDescription>{empty}</EmptyDescription>
        </Empty>
      ) : null}

      <ItemGroup className="gap-2">
        {items.map((item) => (
          <Item key={item.id} role="listitem" variant="outline" size="sm">
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
                <ItemContent>
                  <ItemTitle className="w-full font-normal">
                    <bdi className="truncate">{item.name}</bdi>
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        {t.labels.delete}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t.labels.deleteTitle.replace("{name}", item.name)}
                        </AlertDialogTitle>
                        <AlertDialogDescription>{t.labels.deleteDescription}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.tasks.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          className={buttonVariants({ variant: "destructive" })}
                          onClick={() => void run(() => api.remove(item.id))}
                        >
                          {t.labels.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </ItemActions>
              </>
            )}
          </Item>
        ))}
      </ItemGroup>
    </section>
  );
}
