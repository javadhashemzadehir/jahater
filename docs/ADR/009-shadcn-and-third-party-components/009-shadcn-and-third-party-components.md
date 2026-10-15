# ADR 009: Official shadcn/ui and vetted third-party components for all UI

## Status

Accepted. Supersedes the "No other UI kits" line of [ADR 002](../002-ui-framework-choice/002-ui-framework-choice.md). The rest of ADR 002 still applies.

## Context

Hand-built controls drift from each other and need their own accessibility and RTL work. The shadcn ecosystem already offers many tested components, and the project wants to use them instead of writing its own.

## Decision

- Every UI element is built from an existing component, in this order:
  1. **Official shadcn/ui** (New York, https://ui.shadcn.com/), added into `src/components/ui`.
  2. **shadcn-compatible third-party components**, such as registry blocks and components from https://www.shadcn.io/ and https://shadcnstudio.com/components, or libraries the official components already build on (`cmdk`, `sonner`, `vaul`, `react-day-picker`, `embla-carousel-react`, `recharts`, `input-otp`, `react-resizable-panels`, `@dnd-kit`).
  3. A custom component only when nothing above fits (timeline, matrix, circular timer). Compose it from the components above.
- Third-party code is copied into `src/components/ui` (or a feature folder) and owned like any other code. It must be adapted before merge:
  - design tokens only, defined for `:root` and `.dark` (no hex, `rgb()` or `hsl()`);
  - logical Tailwind utilities and mirrored directional icons for RTL;
  - strings from `useTranslations()`, including `aria-label` and tooltips;
  - keyboard operation, reduced motion, no colour-only meaning;
  - no remote fonts, images, scripts or network calls (privacy rule).
- Check the licence (MIT or compatible) and record each third-party source, with its URL, in `docs/FRONTEND/FRONTEND.md` under "Component sources".
- Complete design systems that bring their own theme and styling (MUI, Chakra, Persian UI kits) stay out, because they conflict with the token approach.

## Consequences

### Positive

- Less custom UI code, consistent behaviour, accessible primitives by default.
- Contributors look in the catalog first.

### Negative

- Each imported component needs an RTL, token and i18n pass.
- New npm dependencies need review. Registry code is not updated automatically.

## Alternatives considered

- **shadcn/ui only (ADR 002):** safe, but forces custom work for components that already exist elsewhere.
- **A full third-party kit:** fast to start, hard to theme and keep private.
