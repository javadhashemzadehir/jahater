"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorMessage } from "@/features/tasks/error-message";
import { useAction } from "@/features/tasks/use-action";
import { useSettingsStore } from "@/features/settings/settings-store";
import { CapacityBar } from "@/features/timeline/capacity-bar";
import { dayRange, loadOf, plannedMinutes, startOfDay } from "@/features/timeline/timeline-model";
import { useIsClient } from "@/hooks/use-is-client";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatDate } from "@/lib/format/date";
import { getDailyReview, listBlocks, saveDailyReview, useIsTauri, type Block } from "@/lib/tauri";
import { dayKey, defaultMode, type ReviewMode } from "./review-model";

const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;
const MODES: ReviewMode[] = ["morning", "evening"];

/** A two-minute check-in: one choice and one sentence, for the morning or the evening. */
export function ReviewView() {
  const t = useTranslations();
  const { locale } = useLocale();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const capacity = useSettingsStore((state) => state.settings.capacityMinutes);
  const { error, run } = useAction();

  const [today] = useState(() => startOfDay(new Date()));
  const day = dayKey(today);
  const [mode, setMode] = useState<ReviewMode>(() => defaultMode(new Date()));
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [energy, setEnergy] = useState<number | null>(null);
  const [morning, setMorning] = useState("");
  const [evening, setEvening] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!inTauri) return;
    const { from, to } = dayRange(today);
    Promise.all([getDailyReview(day), listBlocks(from, to)])
      .then(([review, planned]) => {
        setEnergy(review?.energyLevel ?? null);
        setMorning(review?.morningNote ?? "");
        setEvening(review?.eveningNote ?? "");
        setBlocks(planned);
      })
      .catch((caught: unknown) => setLoadError(errorMessage(t, caught)));
    // Loaded once when the view opens; later edits are the user's own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTauri, day]);

  if (!isClient) return null;

  if (!inTauri) {
    return (
      <Alert className="max-w-xl">
        <AlertDescription>{t.errors.ipc.unavailable}</AlertDescription>
      </Alert>
    );
  }

  const load = loadOf(plannedMinutes(blocks, today), capacity);
  const shownError = error ?? loadError;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const ok = await run(() =>
      saveDailyReview(
        day,
        mode === "morning"
          ? { energyLevel: energy, morningNote: morning.trim() === "" ? null : morning }
          : { eveningNote: evening.trim() === "" ? null : evening },
      ),
    );
    if (ok) setSaved(true);
  }

  return (
    <section aria-labelledby="review-heading" className="flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="review-heading" className="text-lg font-semibold">
          {t.review.title}
        </h2>
        <p className="text-sm text-muted-foreground">{formatDate(today, locale, { dateStyle: "full" })}</p>
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-label={t.review.modeLabel}
        className="self-start"
        value={mode}
        onValueChange={(value) => {
          const next = MODES.find((candidate) => candidate === value);
          if (!next) return;
          setMode(next);
          setSaved(false);
        }}
      >
        {MODES.map((value) => (
          <ToggleGroupItem key={value} value={value}>
            {t.review.modes[value]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "morning" ? (
          <>
            <CapacityBar load={load} />
            <FieldSet>
              <FieldLegend>{t.review.energyQuestion}</FieldLegend>
              <RadioGroup
                className="flex flex-wrap gap-3"
                value={energy === null ? "" : String(energy)}
                onValueChange={(value) => {
                  setEnergy(Number(value));
                  setSaved(false);
                }}
              >
                {ENERGY_LEVELS.map((level) => (
                  <Field key={level} orientation="horizontal" className="w-auto">
                    <RadioGroupItem id={`energy-${level}`} value={String(level)} />
                    <FieldLabel htmlFor={`energy-${level}`}>
                      {t.review.energy[String(level) as "1" | "2" | "3" | "4" | "5"]}
                    </FieldLabel>
                  </Field>
                ))}
              </RadioGroup>
              {energy !== null ? (
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setEnergy(null)}>
                  {t.review.clearEnergy}
                </Button>
              ) : null}
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="review-morning">{t.review.morningQuestion}</FieldLabel>
              <Textarea
                id="review-morning"
                rows={3}
                dir="auto"
                value={morning}
                onChange={(event) => {
                  setMorning(event.target.value);
                  setSaved(false);
                }}
              />
            </Field>
          </>
        ) : (
          <Field>
            <FieldLabel htmlFor="review-evening">{t.review.eveningQuestion}</FieldLabel>
            <Textarea
              id="review-evening"
              rows={4}
              dir="auto"
              value={evening}
              onChange={(event) => {
                setEvening(event.target.value);
                setSaved(false);
              }}
            />
          </Field>
        )}

        {shownError ? (
          <Alert variant="destructive">
            <AlertDescription>{shownError}</AlertDescription>
          </Alert>
        ) : null}
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {saved ? t.review.saved : ""}
        </p>

        <Button type="submit" className="self-start">
          {t.tasks.save}
        </Button>
      </form>
    </section>
  );
}
