"use client";

import { useCallback, useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { errorMessage } from "@/features/tasks/error-message";
import { useTaskStore } from "@/features/tasks/task-store";
import { useTasksChanged } from "@/features/tasks/use-tasks-changed";
import { useIsClient } from "@/hooks/use-is-client";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatDate, formatDuration } from "@/lib/format/date";
import { listTrackedEntries, onTimerChanged, useIsTauri, type TrackedEntry } from "@/lib/tauri";
import {
  NONE_KEY,
  buildReport,
  dayFromKey,
  differenceMinutes,
  groupings,
  rangeFor,
  reportRanges,
  type Grouping,
  type ReportRange,
  type ReportRow,
} from "./report-model";

export function ReportsView() {
  const t = useTranslations();
  const { locale } = useLocale();
  const isClient = useIsClient();
  const inTauri = useIsTauri();
  const { tasks, projects, tags } = useTaskStore();
  const [days, setDays] = useState<ReportRange>(7);
  const [grouping, setGrouping] = useState<Grouping>("task");
  const [entries, setEntries] = useState<TrackedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const { from, to } = rangeFor(days, new Date());
    return listTrackedEntries(from, to)
      .then((next) => {
        setEntries(next);
        setError(null);
      })
      .catch((caught: unknown) => setError(errorMessage(t, caught)));
  }, [days, t]);

  useEffect(() => {
    if (inTauri) void load();
  }, [inTauri, load]);

  // A finished timer changes the report; so does editing a task's estimate.
  useTasksChanged(load);
  useEffect(() => {
    if (!inTauri) return;
    let disposed = false;
    let stop: (() => void) | undefined;
    onTimerChanged(() => void load()).then((unlisten) => {
      if (disposed) unlisten();
      else stop = unlisten;
    });
    return () => {
      disposed = true;
      stop?.();
    };
  }, [inTauri, load]);

  if (!isClient) return null;

  if (!inTauri) {
    return <p className="text-muted-foreground">{t.errors.ipc.unavailable}</p>;
  }

  const report = buildReport(entries, tasks, grouping);
  const titles = new Map(tasks.map((task) => [task.id, task.title]));
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));

  function labelOf(row: ReportRow): string {
    if (row.key === NONE_KEY) return t.reports.none[grouping];
    if (grouping === "day") return formatDate(dayFromKey(row.key), locale, { dateStyle: "full" });
    const lookup = grouping === "task" ? titles : grouping === "project" ? projectNames : tagNames;
    return lookup.get(row.key) ?? t.reports.removed[grouping];
  }

  const minutes = (seconds: number) => formatDuration(Math.round(seconds / 60), locale);
  const signed = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", { signDisplay: "exceptZero" });

  function difference(estimateMinutes: number, actualSeconds: number): string {
    const diff = differenceMinutes(estimateMinutes, actualSeconds);
    return diff === null ? t.reports.noEstimate : `${signed.format(diff)} ${t.reports.minutesUnit}`;
  }

  return (
    <section aria-labelledby="reports-heading" className="flex w-full max-w-3xl flex-col gap-4">
      <h2 id="reports-heading" className="text-lg font-semibold">
        {t.reports.title}
      </h2>
      <p className="text-sm text-muted-foreground">{t.reports.intro}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          {t.reports.range}
          <Select value={String(days)} onChange={(event) => setDays(Number(event.target.value) as ReportRange)}>
            {reportRanges.map((value) => (
              <option key={value} value={value}>
                {t.reports.ranges[String(value) as "1" | "7" | "30"]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.reports.groupBy}
          <Select value={grouping} onChange={(event) => setGrouping(event.target.value as Grouping)}>
            {groupings.map((value) => (
              <option key={value} value={value}>
                {t.reports.groupings[value]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {report.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.reports.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">{t.reports.title}</caption>
            <thead className="bg-muted/50 text-start">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t.reports.groupings[grouping]}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {t.reports.estimate}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {t.reports.actual}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {t.reports.difference}
                </th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <th scope="row" className="px-3 py-2 text-start font-normal">
                    <bdi>{labelOf(row)}</bdi>
                  </th>
                  <td className="px-3 py-2 text-end tabular-nums">{row.estimateMinutes ? formatDuration(row.estimateMinutes, locale) : "–"}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{minutes(row.actualSeconds)}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{difference(row.estimateMinutes, row.actualSeconds)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium">
                <th scope="row" className="px-3 py-2 text-start">
                  {t.reports.total}
                </th>
                <td className="px-3 py-2 text-end tabular-nums">{report.total.estimateMinutes ? formatDuration(report.total.estimateMinutes, locale) : "–"}</td>
                <td className="px-3 py-2 text-end tabular-nums">{minutes(report.total.actualSeconds)}</td>
                <td className="px-3 py-2 text-end tabular-nums">{difference(report.total.estimateMinutes, report.total.actualSeconds)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {grouping === "tag" ? <p className="text-xs text-muted-foreground">{t.reports.tagNote}</p> : null}
      {grouping === "day" ? <p className="text-xs text-muted-foreground">{t.reports.dayNote}</p> : null}
    </section>
  );
}
