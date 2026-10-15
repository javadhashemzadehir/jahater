# ADR 008: Release CSP allows inline scripts for the static export

## Status

Accepted

## Context

Self Planner ships as a Next.js static export inside a Tauri webview. The export inlines small scripts: the `next-themes` bootstrap that sets the theme class before first paint, and Next's hydration payloads. The release CSP in `tauri.conf.json` must block remote code (NFR-01) but must not break the theme bootstrap.

A strict policy would use hashes or nonces for every inline script. Static export has no per-request nonce, and the inline hydration payloads change with each build, so hashes would have to be generated and injected after every `next build`.

## Decision

- `script-src 'self' 'unsafe-inline'` for v0.x. No remote script sources, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, and `connect-src` limited to Tauri IPC.
- `default-src 'self'`, with no CDN, remote font or remote image in the export. Fonts are bundled (Vazirmatn and Comfortaa, both OFL).
- Hash-based strict CSP is deferred. It is recorded as an open item in `docs/SPRINTS/SPRINTS.md`, to be revisited when Next's export tooling supports it or when the policy is worth the build step.

## Consequences

### Positive

- The release build works without per-build generated config.
- No outbound network from the page is possible, which is the privacy rule that matters most here.

### Negative

- Any future injected inline script would run. Review changes that add inline script to the export.

## Alternatives considered

- **Hash-based CSP generated after `next build`:** strictest, but brittle across Next upgrades and adds a build step to the release path.
- **Remote script CDN for theme bootstrap:** rejected by the privacy rules.
