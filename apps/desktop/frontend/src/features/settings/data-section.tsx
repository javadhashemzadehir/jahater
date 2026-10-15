"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";
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
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p role="status" className="text-sm">
        {message}
      </p>

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
        <p className="text-xs text-muted-foreground">{t.data.importWarning}</p>
        <label className="flex flex-col gap-1 text-sm">
          {t.data.chooseFile}
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => void onPickFile(event)}
            className="text-sm file:me-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5"
          />
        </label>
        {file ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <bdi dir="ltr">{file.name}</bdi>
            </p>
            <HoldToConfirmButton
              className="self-start"
              holdLabel={t.data.importHold}
              confirmingLabel={t.trash.purgeConfirming}
              onConfirm={() => void onImport()}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.data.backupsTitle}</h3>
        <p className="text-xs text-muted-foreground">{t.data.backupsHelp}</p>
        {listError ? (
          <p role="alert" className="text-sm text-destructive">
            {listError}
          </p>
        ) : null}
        {backups.length === 0 ? <p className="text-sm text-muted-foreground">{t.data.noBackups}</p> : null}
        <ul className="flex flex-col gap-2">
          {backups.map((name) => (
            <li key={name} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <span className="text-sm">
                <bdi dir="ltr">{backupDate(name)}</bdi>
                <span className="ms-2 text-xs text-muted-foreground">
                  {name.startsWith("pre-import-") ? t.data.safetyCopy : t.data.dailyCopy}
                </span>
              </span>
              <HoldToConfirmButton
                size="sm"
                holdLabel={t.data.restoreHold}
                confirmingLabel={t.trash.purgeConfirming}
                onConfirm={() => void onRestore(name)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
