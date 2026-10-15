"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/features/tasks/use-action";
import { useTranslations } from "@/hooks/use-locale";
import { createBlock, deleteBlock, updateBlock, type Block } from "@/lib/tauri";
import { isoFromTimeInput, movedStart, timeInputValue } from "./timeline-model";

const NUDGE_MINUTES = 15;
const BUFFER_MINUTES = 10;

type Props = {
  block: Block;
  day: Date;
  onClose: () => void;
};

/** Edit panel for one block. It is also the keyboard alternative to dragging. */
export function BlockEditor({ block, day, onClose }: Props) {
  const t = useTranslations();
  const { error, run } = useAction();
  const [title, setTitle] = useState(block.title ?? "");
  const [start, setStart] = useState(timeInputValue(block.startAt));
  const [duration, setDuration] = useState(String(block.durationMin));

  function nudge(deltaMinutes: number) {
    void run(() =>
      updateBlock(block.id, { startAt: movedStart(block.startAt, block.durationMin, deltaMinutes, day) }),
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startAt = isoFromTimeInput(day, start);
    if (startAt === null) return;
    const saved = await run(() =>
      updateBlock(block.id, {
        startAt,
        durationMin: Number(duration),
        title: title.trim() === "" ? null : title,
      }),
    );
    if (saved) onClose();
  }

  // A short protective gap right after this block, so one task does not run into the next.
  function addBufferAfter() {
    const endMs = Date.parse(block.startAt) + block.durationMin * 60000;
    void run(() =>
      createBlock({ kind: "buffer", startAt: new Date(endMs).toISOString(), durationMin: BUFFER_MINUTES }),
    );
  }

  async function onDelete() {
    if (await run(() => deleteBlock(block.id))) onClose();
  }

  return (
    <form onSubmit={onSubmit} aria-label={t.timeline.editBlock} className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          {t.timeline.blockTitle}
          <Input value={title} onChange={(event) => setTitle(event.target.value)} dir="auto" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.timeline.start}
          <Input type="time" required value={start} onChange={(event) => setStart(event.target.value)} dir="ltr" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.timeline.duration}
          <Input
            type="number"
            min={1}
            max={1440}
            step={1}
            required
            inputMode="numeric"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => nudge(-NUDGE_MINUTES)}>
          {t.timeline.earlier}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => nudge(NUDGE_MINUTES)}>
          {t.timeline.later}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addBufferAfter}>
          {t.timeline.bufferAfter}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          {t.tasks.save}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t.tasks.cancel}
        </Button>
        <Button type="button" variant="outline" size="sm" className="ms-auto" onClick={() => void onDelete()}>
          {t.timeline.removeBlock}
        </Button>
      </div>
    </form>
  );
}
