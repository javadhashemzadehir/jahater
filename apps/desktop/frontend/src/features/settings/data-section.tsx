"use client";

import { useEffect, useState, type ChangeEvent } from "react";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { errorMessage } from "@/features/tasks/error-message";
import { useAction } from "@/features/tasks/use-action";
import { useTranslations } from "@/hooks/use-locale";
import { exportData, importData, listBackups, restoreBackup } from "@/lib/tauri";
import { backupDate } from "./backup-model";

/** Export, import and restore. Anything that replaces data needs a long press first. */
export function DataSection() {
  const t = useTranslations();
  const { error, run } = useAction();
  const [exportedTo, setExportedTo] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  function reload() {
    return listBackups()
      .then((names) => {
        setBackups(names);
        setListError(null);
      })
      .catch((caught: unknown) => setListError(errorMessage(t, caught)));
  }

  useEffect(() => {
    void reload();
    // Loaded once when the section opens; actions below reload it themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onExport() {
    setMessage(null);
    await run(async () => {
      setExportedTo(await exportData());
    });
  }

  async function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    setMessage(null);
    if (!picked) return;
    setFile({ name: picked.name, text: await picked.text() });
  }

  async function onImport() {
    if (!file) return;
    const ok = await run(async () => {
      const summary = await importData(file.text);
      setMessage(t.data.imported.replace("{rows}", String(summary.rows)).replace("{backup}", summary.safetyBackup));
    });
    if (ok) setFile(null);
    void reload();
  }

  async function onRestore(name: string) {
    const ok = await run(async () => {
      const summary = await restoreBackup(name);
      setMessage(t.data.restored.replace("{backup}", summary.safetyBackup));
    });
    if (ok) setExportedTo(null);
    void reload();
  }

  return (
    <section aria-labelledby="data-heading" className="flex w-full max-w-md flex-col gap-4">
      <h2 id="data-heading" className="text-lg font-semibold">
        {t.data.title}
      </h2>
      <p className="text-sm text-muted-foreground">{t.data.intro}</p>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {/* Always mounted so screen readers announce the message when it appears. */}
      <Alert className={message ? undefined : "sr-only"}>
        <AlertDescription>{message}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.data.exportTitle}</h3>
        <Button variant="outline" className="self-start" onClick={() => void onExport()}>
          {t.data.export}
        </Button>
        {exportedTo ? (
          <p className="text-sm text-muted-foreground">
            {t.data.exportedTo} <bdi dir="ltr" className="break-all">{exportedTo}</bdi>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.data.importTitle}</h3>
        <Field>
          <FieldLabel htmlFor="import-file">{t.data.chooseFile}</FieldLabel>
          <Input
            id="import-file"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void onPickFile(event)}
          />
          <FieldDescription>{t.data.importWarning}</FieldDescription>
        </Field>
        {file ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <bdi dir="ltr">{file.name}</bdi>
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="self-start">
                  {t.data.importConfirm}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.data.importConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.data.importWarning}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.tasks.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: "destructive" })}
                    onClick={() => void onImport()}
                  >
                    {t.data.importConfirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.data.backupsTitle}</h3>
        <p className="text-xs text-muted-foreground">{t.data.backupsHelp}</p>
        {listError ? (
          <Alert variant="destructive">
            <AlertDescription>{listError}</AlertDescription>
          </Alert>
        ) : null}
        {backups.length === 0 ? (
          <Empty className="p-4">
            <EmptyDescription>{t.data.noBackups}</EmptyDescription>
          </Empty>
        ) : null}
        <ItemGroup className="gap-2">
          {backups.map((name) => (
            <Item key={name} role="listitem" variant="outline" size="sm">
              <ItemContent className="gap-0.5">
                <ItemTitle className="font-normal">
                  <bdi dir="ltr">{backupDate(name)}</bdi>
                </ItemTitle>
                <ItemDescription>
                  {name.startsWith("pre-import-") ? t.data.safetyCopy : t.data.dailyCopy}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      {t.data.restore}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.data.restoreConfirmTitle}</AlertDialogTitle>
                      <AlertDialogDescription>{t.data.backupsHelp}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.tasks.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        className={buttonVariants({ variant: "destructive" })}
                        onClick={() => void onRestore(name)}
                      >
                        {t.data.restore}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </div>
    </section>
  );
}
