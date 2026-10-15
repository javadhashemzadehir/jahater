# ADR 011: Owner-supplied fonts (Comfortaa and Yekan Bakh)

## Status

Accepted. Supersedes the font decision in [ADR 010](../010-jahater-brand-and-design-system/010-jahater-brand-and-design-system.md). The palette, logo and name decisions in ADR 010 stand.

## Context

ADR 010 bundled Bricolage Grotesque for Latin and left Persian on the system font. The owner supplied the fonts to use instead: Comfortaa and Yekan Bakh (FaNum).

## Decision

- Latin: Comfortaa (variable, weights 300 to 700), bundled locally.
- Persian: Yekan Bakh FaNum in Regular, Medium and Bold, bundled locally.
- Stack per locale: `en` is Comfortaa then Yekan Bakh; `fa` is Yekan Bakh then Comfortaa. Comfortaa has no Persian glyphs, so mixed text falls through per character.
- Bricolage Grotesque is removed. Vazirmatn stays unused.

## Consequences

- Persian has a bundled typeface and consistent rendering across machines.
- Comfortaa is SIL OFL. Yekan Bakh is a commercial font: its licence must allow embedding in a distributed app and, if the repository is public, redistribution of the font files. **Open item: the owner confirms the licence before any public release or public repository.**
- Yekan Bakh files are `.woff` (about 60 KB each), Comfortaa is a `.ttf` (about 200 KB). Converting to woff2 is a later size optimisation.
- FaNum variants render Latin digits as Persian digits; copied or exported text still contains Latin digits.

## Alternatives considered

- **Bricolage Grotesque plus system Persian (ADR 010):** replaced by owner decision.
- **An OFL Persian font:** not chosen; the owner supplied Yekan Bakh.
