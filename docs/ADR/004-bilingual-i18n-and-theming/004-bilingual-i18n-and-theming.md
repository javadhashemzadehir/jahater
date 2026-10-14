# ADR 004: Bilingual i18n and three-mode theming

## Status

Accepted

## Context

Self Planner targets Persian users first while staying usable in English. Direction, typography and copy must switch without duplicating UI trees. Users expect Light, Dark and System themes. The author already implemented both in JabeX.

## Decision

### Internationalization

| Locale | Direction | Role |
| --- | --- | --- |
| `fa` | RTL | Default |
| `en` | LTR | Secondary |

- JSON dictionaries in `locales/{fa,en}/common.json`; the `fa` file defines the dictionary type.
- Zustand locale store; `lang` and `dir` set on `<html>`; locale persisted in `localStorage`.
- All user-facing strings come from the dictionary.
- Tailwind logical utilities and Radix `DirectionProvider`.
- Jalali calendar display in `fa`, Gregorian in `en`; storage always Gregorian ISO UTC.
- Fonts per locale through CSS variables switched on `html[lang]`.

### Theming

- `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`.
- Three modes exposed to the user: Light, Dark, System.
- OKLCH design tokens on `:root` and `.dark`, mapped with Tailwind `@theme inline`.
- Components use tokens only.

## Consequences

### Positive

- Single component tree for both directions.
- No flash of wrong theme, live response to OS changes in System mode.
- Straight reuse of working JabeX code.

### Negative

- Every string needs two catalog entries.
- Some layout bugs appear in only one direction, so UI work is tested in both.
- Static export renders `fa` first, so `en` users see a one-frame switch.
- Verify that the theme bootstrap script is accepted by the release CSP.

## Alternatives considered

- **Persian only:** excludes English contributors and users.
- **English default:** conflicts with the product position.
- **Separate RTL and LTR apps:** unnecessary maintenance.
- **Media-query-only dark mode:** cannot offer an explicit Light or Dark override.
