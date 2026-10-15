# Frontend

Next.js App Router with static export, running inside the Tauri webview. This document defines the bilingual (Persian/English) and three-mode theme (Light, Dark, System) setup. Both use well-known patterns so the setup stays simple.

## Project setup

- `next.config.ts`: `output: "export"`, `images.unoptimized: true`, `reactCompiler: true`, `devIndicators: false`, Tailwind through `@tailwindcss/turbopack`.
- Path aliases: `@/*`, `@components/*`, `@features/*`, `@lib/*`.
- Only client-side features. No route handlers, server actions or SSR-only APIs.
- UI kit: shadcn/ui (New York) in `src/components/ui`. Do not add other kits.

## Provider tree

```
<html lang dir class="{fonts}" suppressHydrationWarning>
  <body>
    <AppProviders>
      <ThemeProvider>                  // next-themes
        <LocaleHydrator>               // reads saved locale, sets lang/dir
          <DirectionSync>              // Radix DirectionProvider
            <MotionConfig reducedMotion="user">
              <TooltipProvider>
                {children} <Toaster /> <TrayActionListener />
```

## Internationalization

| Locale | Direction | Role |
| --- | --- | --- |
| `fa` | RTL | Default |
| `en` | LTR | Secondary |

### Files

```
src/lib/i18n/config.ts          # locales, DEFAULT_LOCALE, directions, labels, storage key
src/lib/i18n/dictionaries.ts    # imports both JSON files, typed from fa
src/lib/i18n/locale-store.ts    # Zustand store: locale, dictionary, direction, hydrate, setLocale
src/hooks/use-locale.ts         # useLocale(), useTranslations()
src/locales/fa/common.json
src/locales/en/common.json
```

### Rules

1. `config.ts` exports `locales = ["fa", "en"] as const`, `DEFAULT_LOCALE = "fa"`, `localeDirections`, `localeLabels` (`فارسی`, `English`), and `LOCALE_STORAGE_KEY = "selfplanner.locale"`.
2. The `fa` JSON is the source of truth for the dictionary type: `type Dictionary = typeof fa`. Missing keys in `en` fail typecheck.
3. `setLocale` updates `document.documentElement.lang` and `.dir`, saves to `localStorage` inside try/catch, and updates the store.
4. `hydrate()` runs once on mount. Root layout renders the default locale on the server and static export; an `en` user sees a one-frame switch. Accepted trade-off.
5. Every user-facing string comes from `useTranslations()`. No literals in JSX, toasts, `aria-label`, tooltips or document title.
6. Dynamic text uses small formatter helpers in `lib/`, not string concatenation, so word order can differ per locale.
7. Add new strings to **both** JSON files in the same change.

### Direction-safe layout

- Use Tailwind logical utilities: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s`, `rounded-s-*`.
- Do not use `left`, `right`, `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right` for layout.
- Mirror directional icons (chevrons, arrows) with `rtl:rotate-180` or a direction-aware wrapper. Do not mirror clocks, play icons or logos.
- Wrap Radix roots with `DirectionProvider` using the store's `direction`.
- User-entered text that may be either script: use `dir="auto"` or `<bdi>`.
- Paragraph-level auto bidi for editable fields: `unicode-bidi: plaintext`.

### Time and date in two locales

| Concern | `fa` | `en` |
| --- | --- | --- |
| Calendar display | Jalali via `Intl` locale `fa-IR-u-ca-persian` | Gregorian |
| Week start default | Saturday | Monday (configurable) |
| Digits | Persian numerals, drawn by the font | Latin |
| Storage | Gregorian ISO 8601 UTC | Gregorian ISO 8601 UTC |

Use one `formatDate` / `formatDuration` module that takes the locale. Never format dates ad hoc in components.

### Timeline direction

The daily timeline is **vertical** (time flows top to bottom), so it has no RTL ambiguity. The weekly view uses columns that follow `dir` and the configured week start. Horizontal time axes are avoided on purpose.

## Theming: Light, Dark, System

### Behaviour

| Mode | Behaviour |
| --- | --- |
| Light | Always light |
| Dark | Always dark |
| System | Follows the OS preference and updates live when it changes |

Default is **System**. The selected mode persists locally (`next-themes` stores it in `localStorage`).

### Implementation

```tsx
// components/providers/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

- `<html suppressHydrationWarning>` is required, because `next-themes` sets the class before hydration.
- Dark styles hang off `.dark` on `<html>`.
- The switcher is a three-button segmented control (`Sun`, `Moon`, `Monitor` from `lucide-react`) with `role="group"`, `aria-pressed` per button and localized `aria-label`s from `t.theme.{label,light,dark,system}`.
- Until `useIsClient()` is true, render a same-size placeholder to avoid a hydration mismatch.
- Use `disableTransitionOnChange` so switching does not animate every colour.

### Tokens

All colours are CSS variables in `styles/globals.css`, defined in OKLCH for `:root` (light) and `.dark`, then mapped to Tailwind with `@theme inline`:

```
--background --foreground --card --card-foreground --popover --popover-foreground
--primary --primary-foreground --secondary --secondary-foreground
--muted --muted-foreground --accent --accent-foreground
--destructive --destructive-foreground --border --input --ring
--sidebar --sidebar-foreground --sidebar-accent --sidebar-accent-foreground
--scrollbar-*   --radius
```

Self Planner additions (define each for light **and** dark):

| Token | Use |
| --- | --- |
| `--timer-track`, `--timer-progress`, `--timer-warning`, `--timer-overtime` | Circular timer states. Overtime is a calm accent, not an alarm red. |
| `--quadrant-1` … `--quadrant-4` | Eisenhower quadrants |
| `--block-task`, `--block-buffer`, `--block-free`, `--block-event` | Timeline block kinds |
| `--now-line` | Current time marker |

Rules:

1. Components use tokens through Tailwind classes (`bg-background`, `text-muted-foreground`). No hex or `rgb()` in components.
2. Colour is never the only carrier of meaning. Pair with icon, label or pattern.
3. Project colours are user-chosen and stored as a hue or a light/dark pair; they must stay readable on both backgrounds. Compute readable foreground at runtime.
4. Pick a primary hue for the brand. Decision pending.
5. Check contrast in all three modes before merging UI work.
6. Dark mode is designed, not inverted.

## Fonts

| Locale | Font | Notes |
| --- | --- | --- |
| `fa` | Vazirmatn (SIL OFL) | Persian and Latin subsets; Persian digits come from the locale formatter |
| `en` | Comfortaa (SIL OFL), with Vazirmatn fallback for Persian glyphs | |

- Yekan Bakh is not used: its licence does not allow redistribution in this repo. Decision recorded in S0.1 (SPRINTS.md).
- Font files come from the `@fontsource` npm packages and live in `src/fonts/` with their OFL texts in `src/fonts/licenses/`. No remote font loading.
- Loaded with `next/font/local` as CSS variables (`--font-vazirmatn-arabic`, `--font-vazirmatn-latin`, `--font-comfortaa`), `display: "swap"`.
- `html { --font-family: ... }` and `html[lang="en"] { --font-family: ... }` switch the stack with the locale.
- `body` and portal content (`[data-radix-portal]`, `[role="dialog"]`, Sonner toasts) must all use `var(--font-family)`.
- **Check each font's licence for redistribution inside an open-source repo before committing the files.** If a font cannot be bundled, use Vazirmatn (SIL OFL) for `fa` and a system or OFL font for `en`.
- FaNum caveat: copied text contains Latin digits even though they look Persian. Fine for display, noted for export.

## Feature structure

```
features/tasks/        # task store, task row, task form, inbox
features/board/        # Kanban view
features/matrix/       # Eisenhower view
features/timeline/     # day and week views, blocks, now line
features/timer/        # circular timer, mode controls, orphan-timer dialog
features/reports/      # estimate vs actual, time by project
features/review/       # morning and evening review
features/settings/     # language, theme, shortcuts, tray, capacity
features/trash/
features/capture/      # quick-capture window UI
```

Each feature has its own Zustand store. Server state does not exist: the backend is the source of truth, and stores refetch on `tasks://changed`.

## Views from one model

| View | Reads | Drag changes |
| --- | --- | --- |
| List | tasks by status and `sort_order` | `sort_order` |
| Kanban | tasks grouped by `status` | `status` |
| Matrix | tasks grouped by (`is_urgent`, `is_important`) | both flags |
| Timeline | `time_blocks` plus `time_entries` | `start_at`, `duration_min` |

Every drag action also has a keyboard path (FR-16): `@dnd-kit` keyboard sensor plus explicit "Move to…" menu items.

## Accessibility

- Visible focus ring in all themes (`--ring`).
- Skip-to-content link in the shell.
- `aria-live` for timer milestones, not for every tick.
- Reduced motion respected globally (CSS media query and `MotionConfig`).

## Tauri integration

`lib/tauri.ts` wraps `invoke` and `listen`, validates responses with Zod, and exposes `useIsTauri()` so the app can still run in a plain browser for UI work. IPC features need the desktop shell.
