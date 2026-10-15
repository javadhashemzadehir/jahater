# ADR 009: All UI is built from the shadcn design system

## Status

Accepted. Supersedes the "No other UI kits" line of [ADR 002](../002-ui-framework-choice/002-ui-framework-choice.md). The rest of ADR 002 still applies.

## Context

Hand-built controls drift from each other and each one needs its own accessibility and RTL work. The shadcn ecosystem already provides tested components for everything the app needs, so the project does not build its own.

## Decision

- **No custom-built components.** Every control, surface, list row, message and overlay is a shadcn component from `src/components/ui`:
  1. **Official shadcn/ui** (New York, https://ui.shadcn.com/).
  2. **shadcn-compatible third-party components** when the official set has no match: registry components from https://www.shadcn.io/ or https://shadcnstudio.com/components, or the libraries the official components are built on (`cmdk`, `sonner`, `vaul`, `react-day-picker`, `embla-carousel-react`, `recharts`, `input-otp`, `react-resizable-panels`).
- Feature code only **composes** these components. Plain HTML in features is limited to layout (`div`, `section`, `ul`/`li` wrappers with flex or grid), headings, and text (`p`, `span`, `time`, `bdi`). No raw `button`, `input`, `select`, `textarea`, `table`, hand-styled cards or `role="alert"` paragraphs.
- Drawing and drag behaviour come from libraries, not hand-written SVG or components: charts and the timer ring use the shadcn `chart` component (Recharts); drag and drop uses `@dnd-kit` with shadcn `Button` handles.
- If no shadcn or shadcn-compatible component fits, stop and record the gap as an open item in `docs/FRONTEND/FRONTEND.md`; do not write a one-off component.
- Components added from outside the official set are copied into `src/components/ui` and adapted before merge:
  - design tokens only, defined for `:root` and `.dark` (no hex, `rgb()` or `hsl()`);
  - logical Tailwind utilities and mirrored directional icons for RTL;
  - strings from `useTranslations()`, including `aria-label` and tooltips;
  - keyboard operation, reduced motion, no colour-only meaning;
  - no remote fonts, images, scripts or network calls (privacy rule).
- Check the licence (MIT or compatible) and record each source in `docs/FRONTEND/FRONTEND.md` under "Component sources".
- Complete design systems that bring their own theme (MUI, Chakra, Persian UI kits) stay out, because they conflict with the token approach.
- Destructive confirmations use the shadcn `AlertDialog` (Cancel / Confirm). This replaces the custom hold-to-confirm button (FR-09 updated).

## Consequences

### Positive

- One visual and interaction language; accessible primitives by default.
- Less UI code to own and test.

### Negative

- Each component from outside the official set needs an RTL, token and i18n pass.
- New dependencies (for example Recharts) add bundle size and need review. Registry code is not updated automatically.
- Hold-to-confirm, which resisted accidental clicks, is replaced by a two-step dialog.

## Alternatives considered

- **shadcn/ui plus custom components where needed:** faster for one-off views, but lets bespoke UI creep back in.
- **A full third-party kit:** fast to start, hard to theme and keep private.
