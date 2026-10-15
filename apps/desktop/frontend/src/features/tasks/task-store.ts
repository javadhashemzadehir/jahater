import { create } from "zustand";
import { listProjects, listTags, listTasks, type Label, type Task } from "@/lib/tauri";

// The backend is the source of truth. This store only caches the last fetch and is
// refilled on `tasks://changed`; views never keep their own copy of order or status.

type TaskStore = {
  tasks: Task[];
  projects: Label[];
  tags: Label[];
  loaded: boolean;
  error: unknown;
  refresh: () => Promise<void>;
};

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  projects: [],
  tags: [],
  loaded: false,
  error: null,
  refresh: async () => {
    try {
      const [tasks, projects, tags] = await Promise.all([listTasks(), listProjects(), listTags()]);
      set({ tasks, projects, tags, loaded: true, error: null });
    } catch (error: unknown) {
      set({ error, loaded: true });
    }
  },
}));
