# ADR 002: UI framework choice

## Status

Accepted

## Context

The UI needs accessible primitives, full RTL support, design tokens that work in light and dark, and freedom to build custom views (timeline, matrix, circular timer).

## Decision

- **Tailwind CSS v4** with CSS variable tokens in OKLCH.
- **shadcn/ui (New York)** on **Radix** primitives, copied into `components/ui`.
- **lucide-react** icons, **sonner** toasts, **cmdk** command palette, **framer-motion** with reduced-motion support.
- **@dnd-kit** for drag and drop (keyboard sensor required).
- No other UI kits (no MUI, Chakra or Persian-specific kits).

## Consequences

### Positive

- Components are owned code, easy to adapt for RTL.
- Radix handles focus, keyboard and ARIA; `DirectionProvider` handles RTL.
- Same system as JabeX.

### Negative

- Updating shadcn components is manual.
- `@dnd-kit` is new to the author's stack and needs RTL and keyboard testing.

## Alternatives considered

- **MUI / Chakra:** heavier, harder to theme with the token approach.
- **Headless UI only:** more work for the same result.
