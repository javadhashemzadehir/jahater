# ADR 010: Jahater brand and design system

## Status

Accepted. Supersedes the font choice (Vazirmatn and Comfortaa) in [ADR 008](../008-release-csp-script-policy/008-release-csp-script-policy.md) and the "primary hue pending" note in FRONTEND.md.

## Context

The owner supplied a Jahater brand pack: logo mark, wordmark, app icon, colour palette and type rules.

## Decision

- Adopt the pack's palette (Ink, Amber, Paper, Slate, Amber text) as OKLCH tokens for light and dark in `globals.css`. Light: Paper background, Ink text and primary. Dark: Ink-based surfaces, Amber primary.
- Adopt the logo: ring-and-arrow mark, English and Persian wordmarks, app icon, one-colour variants. Brand marks are artwork, not UI-kit components, so ADR 009 does not apply to them.
- Fonts: Bricolage Grotesque (OFL, bundled locally) for Latin. **Vazirmatn is not used** (owner decision), and Comfortaa is dropped. Persian text uses the system UI font until a Persian font is chosen. This is an open item.
- The product name shown in the UI is Jahater (جهتر). Documentation and the Tauri `productName` still say "Self Planner"; renaming them is a separate change.

## Consequences

### Positive

- One recognisable identity across the app, favicon and installer icons.
- Contrast pairs from the pack are known: Ink on Paper 13:1, Ink on Amber 7:1.

### Negative

- Persian typography depends on the user's system fonts until a Persian font is bundled.
- Amber must never be used for text on Paper; the dark theme maps Amber to primary.

## Alternatives considered

- **Keep Vazirmatn for Persian (the pack's choice):** rejected by the owner.
- **Bundle a different Persian font now:** deferred until the owner picks one.
