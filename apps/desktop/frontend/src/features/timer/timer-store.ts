import { create } from "zustand";
import { getActiveTimer, type Timer } from "@/lib/tauri";

// Cache of the backend's running timer. Refilled on `timer://changed`; never edited locally.

type TimerStore = {
  active: Timer | null;
  loaded: boolean;
  error: unknown;
  refresh: () => Promise<void>;
};

export const useTimerStore = create<TimerStore>((set) => ({
  active: null,
  loaded: false,
  error: null,
  refresh: async () => {
    try {
      set({ active: await getActiveTimer(), loaded: true, error: null });
    } catch (error: unknown) {
      set({ error, loaded: true });
    }
  },
}));
