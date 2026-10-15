"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    return (
      <Alert className="max-w-xl">
        <AlertDescription>{t.errors.ipc.unavailable}</AlertDescription>
      </Alert>
    );
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
        <Field>
          <FieldLabel htmlFor="report-range">{t.reports.range}</FieldLabel>
          <NativeSelect id="report-range" value={String(days)} onChange={(event) => setDays(Number(event.target.value) as ReportRange)}>
            {reportRanges.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {t.reports.ranges[String(value) as "1" | "7" | "30"]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="report-grouping">{t.reports.groupBy}</FieldLabel>
          <NativeSelect id="report-grouping" value={grouping} onChange={(event) => setGrouping(event.target.value as Grouping)}>
            {groupings.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {t.reports.groupings[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {report.rows.length === 0 ? (
        <Empty>
          <EmptyDescription>{t.reports.empty}</EmptyDescription>
        </Empty>
      ) : (
        <Card className="shadow-none">
          <Table>
            <TableCaption className="sr-only">{t.reports.title}</TableCaption>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead scope="col" className="px-3">
                  {t.reports.groupings[grouping]}
                </TableHead>
                <TableHead scope="col" className="px-3 text-end">
                  {t.reports.estimate}
                </TableHead>
                <TableHead scope="col" className="px-3 text-end">
                  {t.reports.actual}
                </TableHead>
                <TableHead scope="col" className="px-3 text-end">
                  {t.reports.difference}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.key}>
                  <TableHead scope="row" className="h-auto px-3 py-2 font-normal text-foreground">
                    <bdi>{labelOf(row)}</bdi>
                  </TableHead>
                  <TableCell className="px-3 text-end tabular-nums">{row.estimateMinutes ? formatDuration(row.estimateMinutes, locale) : "–"}</TableCell>
                  <TableCell className="px-3 text-end tabular-nums">{minutes(row.actualSeconds)}</TableCell>
                  <TableCell className="px-3 text-end tabular-nums">{difference(row.estimateMinutes, row.actualSeconds)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableHead scope="row" className="h-auto px-3 py-2 text-foreground">
                  {t.reports.total}
                </TableHead>
                <TableCell className="px-3 text-end tabular-nums">{report.total.estimateMinutes ? formatDuration(report.total.estimateMinutes, locale) : "–"}</TableCell>
                <TableCell className="px-3 text-end tabular-nums">{minutes(report.total.actualSeconds)}</TableCell>
                <TableCell className="px-3 text-end tabular-nums">{difference(report.total.estimateMinutes, report.total.actualSeconds)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}

      {grouping === "tag" ? <p className="text-xs text-muted-foreground">{t.reports.tagNote}</p> : null}
      {grouping === "day" ? <p className="text-xs text-muted-foreground">{t.reports.dayNote}</p> : null}
    </section>
  );
}
