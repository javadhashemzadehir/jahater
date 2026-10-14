import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

// Every IPC payload and response is validated here, at the boundary (AGENTS.md).

export const commandErrorSchema = z.object({
  code: z.string(),
  messageKey: z.string(),
});

export type CommandError = z.infer<typeof commandErrorSchema>;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "doing", "done", "archived"]),
  isUrgent: z.boolean(),
  isImportant: z.boolean(),
  revision: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  title: z.string(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

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

export function listTasks(): Promise<Task[]> {
  return call("list_tasks", {}, taskSchema.array());
}
