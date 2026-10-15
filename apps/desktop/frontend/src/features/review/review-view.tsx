"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
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
    return <p className="text-muted-foreground">{t.errors.ipc.unavailable}</p>;
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

      <div role="group" aria-label={t.review.modeLabel} className="inline-flex gap-1 self-start rounded-md border border-border p-1">
        {MODES.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={mode === value ? "secondary" : "ghost"}
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setSaved(false);
            }}
          >
            {t.review.modes[value]}
          </Button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "morning" ? (
          <>
            <CapacityBar load={load} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm">{t.review.energyQuestion}</legend>
              <div className="flex flex-wrap gap-3">
                {ENERGY_LEVELS.map((level) => (
                  <label key={level} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="energy"
                      className="size-4 accent-primary"
                      checked={energy === level}
                      onChange={() => {
                        setEnergy(level);
                        setSaved(false);
                      }}
                    />
                    {t.review.energy[String(level) as "1" | "2" | "3" | "4" | "5"]}
                  </label>
                ))}
              </div>
              {energy !== null ? (
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setEnergy(null)}>
                  {t.review.clearEnergy}
                </Button>
              ) : null}
            </fieldset>
            <label className="flex flex-col gap-1 text-sm" htmlFor="review-morning">
              {t.review.morningQuestion}
              <textarea
                id="review-morning"
                rows={3}
                dir="auto"
                value={morning}
                onChange={(event) => {
                  setMorning(event.target.value);
                  setSaved(false);
                }}
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1 text-sm" htmlFor="review-evening">
            {t.review.eveningQuestion}
            <textarea
              id="review-evening"
              rows={4}
              dir="auto"
              value={evening}
              onChange={(event) => {
                setEvening(event.target.value);
                setSaved(false);
              }}
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
        )}

        {shownError ? (
          <p role="alert" className="text-sm text-destructive">
            {shownError}
          </p>
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
