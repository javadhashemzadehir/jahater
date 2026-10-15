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
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

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

export const TASKS_CHANGED_EVENT = "tasks://changed";

// Rust emits this after every task write. Views refetch instead of patching local copies (AGENTS.md).
export function onTasksChanged(handler: () => void): Promise<UnlistenFn> {
  return listen(TASKS_CHANGED_EVENT, () => handler());
}
