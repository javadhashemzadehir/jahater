import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { z } from "zod";

// Every IPC payload and response is validated here, at the boundary (AGENTS.md).

export const commandErrorSchema = z.object({
  code: z.string(),
  messageKey: z.string(),
});

export type CommandError = z.infer<typeof commandErrorSchema>;

export const taskStatusSchema = z.enum(["todo", "doing", "done", "archived"]);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  status: taskStatusSchema,
  isUrgent: z.boolean(),
  isImportant: z.boolean(),
  estimateMinutes: z.number().int().positive().nullable(),
  projectId: z.string().nullable(),
  tagIds: z.array(z.string()),
  deletedAt: z.string().nullable(),
  revision: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  title: z.string(),
  notes: z.string().nullish(),
  isUrgent: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  estimateMinutes: z.number().int().positive().nullish(),
  projectId: z.string().nullish(),
  tagIds: z.array(z.string()).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Omitted key: unchanged. `null`: cleared. Value: set.
export const updateTaskInputSchema = z.object({
  title: z.string().optional(),
  notes: z.string().nullish(),
  status: taskStatusSchema.optional(),
  isUrgent: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  estimateMinutes: z.number().int().positive().nullish(),
  projectId: z.string().nullish(),
  tagIds: z.array(z.string()).optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const labelSchema = z.object({
  id: z.string(),
  name: z.string(),
  revision: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Label = z.infer<typeof labelSchema>;

export const timerModeSchema = z.enum(["tracker", "timebox", "pomodoro", "flowtime"]);

export type TimerMode = z.infer<typeof timerModeSchema>;

export const timerSchema = z.object({
  id: z.string(),
  taskId: z.string().nullable(),
  mode: timerModeSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  pausedTotalSec: z.number().int().nonnegative(),
  pausedAt: z.string().nullable(),
  targetMin: z.number().int().positive().nullable(),
  isPaused: z.boolean(),
  note: z.string().nullable(),
  elapsedSeconds: z.number().int().nonnegative(),
  remainingSeconds: z.number().int().nonnegative().nullable(),
  revision: z.number().int(),
});

export type Timer = z.infer<typeof timerSchema>;

export const startTimerInputSchema = z.object({
  taskId: z.string().nullish(),
  mode: timerModeSchema,
  targetMin: z.number().int().positive().nullish(),
  note: z.string().nullish(),
});

export type StartTimerInput = z.infer<typeof startTimerInputSchema>;

export const blockKindSchema = z.enum(["task", "buffer", "transition", "free", "event"]);

export type BlockKind = z.infer<typeof blockKindSchema>;

export const blockSchema = z.object({
  id: z.string(),
  taskId: z.string().nullable(),
  kind: blockKindSchema,
  title: z.string().nullable(),
  startAt: z.string(),
  durationMin: z.number().int().positive(),
  revision: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Block = z.infer<typeof blockSchema>;

export const createBlockInputSchema = z.object({
  taskId: z.string().nullish(),
  kind: blockKindSchema,
  title: z.string().nullish(),
  startAt: z.string(),
  durationMin: z.number().int().positive(),
});

export type CreateBlockInput = z.infer<typeof createBlockInputSchema>;

// Omitted key: unchanged. `null` on taskId or title: cleared.
export const updateBlockInputSchema = z.object({
  taskId: z.string().nullish(),
  title: z.string().nullish(),
  startAt: z.string().optional(),
  durationMin: z.number().int().positive().optional(),
});

export type UpdateBlockInput = z.infer<typeof updateBlockInputSchema>;

export const orphanActionSchema = z.enum(["resume", "stopAtLastSeen", "discard"]);

export type OrphanAction = z.infer<typeof orphanActionSchema>;

export const orphanTimerSchema = z.object({
  timer: timerSchema,
  lastSeenAt: z.string(),
  elapsedAtLastSeenSeconds: z.number().int().nonnegative(),
});

export type OrphanTimer = z.infer<typeof orphanTimerSchema>;

export const trackedEntrySchema = z.object({
  id: z.string(),
  taskId: z.string().nullable(),
  mode: timerModeSchema,
  startedAt: z.string(),
  endedAt: z.string(),
  actualSeconds: z.number().int().nonnegative(),
});

export type TrackedEntry = z.infer<typeof trackedEntrySchema>;

export const settingsSchema = z.object({
  capacityMinutes: z.number().int().positive(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const updateSettingsInputSchema = z.object({
  capacityMinutes: z.number().int().positive().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;

export const reviewSchema = z.object({
  id: z.string(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  morningNote: z.string().nullable(),
  eveningNote: z.string().nullable(),
  energyLevel: z.number().int().min(1).max(5).nullable(),
  revision: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Review = z.infer<typeof reviewSchema>;

// Omitted key: unchanged. `null`: cleared.
export const saveReviewInputSchema = z.object({
  morningNote: z.string().nullish(),
  eveningNote: z.string().nullish(),
  energyLevel: z.number().int().min(1).max(5).nullish(),
});

export type SaveReviewInput = z.infer<typeof saveReviewInputSchema>;

export const importSummarySchema = z.object({
  rows: z.number().int().nonnegative(),
  safetyBackup: z.string(),
});

export type ImportSummary = z.infer<typeof importSummarySchema>;

export class IpcError extends Error {
  readonly command: CommandError;

  constructor(command: CommandError) {
    super(command.code);
    this.name = "IpcError";
    this.command = command;
  }
}

// Plain browser runs (UI work without the desktop shell) have no Tauri bridge.
export function useIsTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(command: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await invoke(command, args);
  } catch (error) {
    const parsed = commandErrorSchema.safeParse(error);
    if (parsed.success) throw new IpcError(parsed.data);
    throw new IpcError({ code: "IPC_UNAVAILABLE", messageKey: "errors.ipc.unavailable" });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new IpcError({ code: "IPC_INVALID_RESPONSE", messageKey: "errors.ipc.invalidResponse" });
  }
  return parsed.data;
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  const payload = createTaskInputSchema.parse(input);
  return call("create_task", { input: payload }, taskSchema);
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const payload = updateTaskInputSchema.parse(input);
  return call("update_task", { id, input: payload }, taskSchema);
}

export function trashTask(id: string): Promise<Task> {
  return call("trash_task", { id }, taskSchema);
}

export function restoreTask(id: string): Promise<Task> {
  return call("restore_task", { id }, taskSchema);
}

export function purgeTask(id: string): Promise<void> {
  return call("purge_task", { id }, z.void());
}

export function listTasks(): Promise<Task[]> {
  return call("list_tasks", {}, taskSchema.array());
}

export function listTrashedTasks(): Promise<Task[]> {
  return call("list_trashed_tasks", {}, taskSchema.array());
}

export function listProjects(): Promise<Label[]> {
  return call("list_projects", {}, labelSchema.array());
}

export function createProject(name: string): Promise<Label> {
  return call("create_project", { name }, labelSchema);
}

export function renameProject(id: string, name: string): Promise<Label> {
  return call("rename_project", { id, name }, labelSchema);
}

export function deleteProject(id: string): Promise<void> {
  return call("delete_project", { id }, z.void());
}

export function listTags(): Promise<Label[]> {
  return call("list_tags", {}, labelSchema.array());
}

export function createTag(name: string): Promise<Label> {
  return call("create_tag", { name }, labelSchema);
}

export function renameTag(id: string, name: string): Promise<Label> {
  return call("rename_tag", { id, name }, labelSchema);
}

export function deleteTag(id: string): Promise<void> {
  return call("delete_tag", { id }, z.void());
}

export function startTimer(input: StartTimerInput): Promise<Timer> {
  const payload = startTimerInputSchema.parse(input);
  return call("start_timer", { input: payload }, timerSchema);
}

export function pauseTimer(): Promise<Timer> {
  return call("pause_timer", {}, timerSchema);
}

export function resumeTimer(): Promise<Timer> {
  return call("resume_timer", {}, timerSchema);
}

export function stopTimer(): Promise<Timer> {
  return call("stop_timer", {}, timerSchema);
}

export function getActiveTimer(): Promise<Timer | null> {
  return call("get_active_timer", {}, timerSchema.nullable());
}

export function createBlock(input: CreateBlockInput): Promise<Block> {
  const payload = createBlockInputSchema.parse(input);
  return call("create_block", { input: payload }, blockSchema);
}

export function updateBlock(id: string, input: UpdateBlockInput): Promise<Block> {
  const payload = updateBlockInputSchema.parse(input);
  return call("update_block", { id, input: payload }, blockSchema);
}

export function deleteBlock(id: string): Promise<void> {
  return call("delete_block", { id }, z.void());
}

/** Blocks with any part inside `[from, to)` (ISO strings), earliest first. */
export function listBlocks(from: string, to: string): Promise<Block[]> {
  return call("list_blocks", { from, to }, blockSchema.array());
}

/** A timer the previous session left running and the user has not dealt with yet. */
export function getOrphanTimer(): Promise<OrphanTimer | null> {
  return call("get_orphan_timer", {}, orphanTimerSchema.nullable());
}

export function resolveOrphanTimer(action: OrphanAction): Promise<Timer | null> {
  return call("resolve_orphan_timer", { action: orphanActionSchema.parse(action) }, timerSchema.nullable());
}

/** Finished entries that started inside `[from, to)` (ISO strings), with worked seconds. */
export function listTrackedEntries(from: string, to: string): Promise<TrackedEntry[]> {
  return call("list_tracked_entries", { from, to }, trackedEntrySchema.array());
}

export function getSettings(): Promise<Settings> {
  return call("get_settings", {}, settingsSchema);
}

export function updateSettings(input: UpdateSettingsInput): Promise<Settings> {
  const payload = updateSettingsInputSchema.parse(input);
  return call("update_settings", { input: payload }, settingsSchema);
}

/** `day` is the local date as YYYY-MM-DD. Resolves to null before the first save. */
export function getDailyReview(day: string): Promise<Review | null> {
  return call("get_daily_review", { day }, reviewSchema.nullable());
}

export function saveDailyReview(day: string, input: SaveReviewInput): Promise<Review> {
  const payload = saveReviewInputSchema.parse(input);
  return call("save_daily_review", { day, input: payload }, reviewSchema);
}

/** Writes a full export into the app's exports folder; resolves to where the file is. */
export function exportData(): Promise<string> {
  return call("export_data", {}, z.string());
}

/** Replaces all data with an export file's text. The backend keeps a safety copy first. */
export function importData(json: string): Promise<ImportSummary> {
  return call("import_data", { json }, importSummarySchema);
}

/** Backup file names, newest first. */
export function listBackups(): Promise<string[]> {
  return call("list_backups", {}, z.string().array());
}

export function restoreBackup(name: string): Promise<ImportSummary> {
  return call("restore_backup", { name }, importSummarySchema);
}

export const TIMER_CHANGED_EVENT = "timer://changed";

// Rust emits this when a timer starts, pauses, resumes or stops.
export function onTimerChanged(handler: () => void): Promise<UnlistenFn> {
  return listen(TIMER_CHANGED_EVENT, () => handler());
}

export const TASKS_CHANGED_EVENT = "tasks://changed";

// Rust emits this after every task write. Views refetch instead of patching local copies (AGENTS.md).
export function onTasksChanged(handler: () => void): Promise<UnlistenFn> {
  return listen(TASKS_CHANGED_EVENT, () => handler());
}
