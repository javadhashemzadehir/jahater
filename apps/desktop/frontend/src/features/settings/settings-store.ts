import { create } from "zustand";
import { getSettings, type Settings } from "@/lib/tauri";

// Same capacity the backend uses until the first load finishes, so the UI never shows zero.
export const DEFAULT_CAPACITY_MINUTES = 360;

type SettingsStore = {
  settings: Settings;
  loaded: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  /** Used after a save with the value the backend returned. */
  replace: (settings: Settings) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: { capacityMinutes: DEFAULT_CAPACITY_MINUTES },
  loaded: false,
  error: null,
  refresh: async () => {
    try {
      set({ settings: await getSettings(), loaded: true, error: null });
    } catch (error: unknown) {
      set({ error, loaded: true });
    }
  },
  replace: (settings) => set({ settings }),
}));
