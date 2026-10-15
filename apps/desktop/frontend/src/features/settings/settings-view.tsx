"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/features/tasks/error-message";
import { useAction } from "@/features/tasks/use-action";
import { useIsClient } from "@/hooks/use-is-client";
import { useTranslations } from "@/hooks/use-locale";
import { updateSettings, useIsTauri } from "@/lib/tauri";
import { DataSection } from "./data-section";
import { useSettingsStore } from "./settings-store";

export function SettingsView() {
  const t = useTranslations();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const { settings, error: loadError, replace } = useSettingsStore();
  const { error, run } = useAction();
  const [hours, setHours] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!isClient) return null;

  if (!inTauri) {
    return (
      <Alert className="max-w-xl">
        <AlertDescription>{t.errors.ipc.unavailable}</AlertDescription>
      </Alert>
    );
  }

  // Edited as hours with halves allowed; stored as whole minutes.
  const shownHours = hours ?? String(settings.capacityMinutes / 60);
  const shownError = error ?? (loadError ? errorMessage(t, loadError) : null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const capacityMinutes = Math.round(Number(shownHours) * 60);
    setSaved(false);
    const ok = await run(async () => {
      replace(await updateSettings({ capacityMinutes }));
    });
    if (ok) {
      setHours(null);
      setSaved(true);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-10">
    <section aria-labelledby="settings-heading" className="flex w-full max-w-md flex-col gap-4">
      <h2 id="settings-heading" className="text-lg font-semibold">
        {t.views.settings}
      </h2>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field>
          <FieldLabel htmlFor="capacity-hours">{t.settings.capacity}</FieldLabel>
          <Input
            id="capacity-hours"
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            required
            inputMode="decimal"
            value={shownHours}
            onChange={(event) => {
              setSaved(false);
              setHours(event.target.value);
            }}
          />
          <FieldDescription>{t.settings.capacityHelp}</FieldDescription>
        </Field>

        {shownError ? (
          <Alert variant="destructive">
            <AlertDescription>{shownError}</AlertDescription>
          </Alert>
        ) : null}
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {saved ? t.settings.saved : ""}
        </p>

        <Button type="submit" className="self-start">
          {t.tasks.save}
        </Button>
      </form>
    </section>
    <DataSection />
    </div>
  );
}
