/**
 * Readable date (and time, for safety copies) from a backup file name.
 * `backup-2026-10-15.json` becomes `2026-10-15`; `pre-import-20261015-083000.json` becomes
 * `2026-10-15 08:30:00`. Anything unrecognised is shown as it is.
 */
export function backupDate(name: string): string {
  const daily = /^backup-(\d{4}-\d{2}-\d{2})\.json$/.exec(name);
  if (daily) return daily[1];

  const safety = /^pre-import-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/.exec(name);
  if (safety) {
    const [, year, month, day, hour, minute, second] = safety;
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  return name;
}
