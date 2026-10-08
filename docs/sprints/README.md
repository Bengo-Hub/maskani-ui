# maskani-ui sprints

Sprint numbers match `maskani-api/docs/sprints`. The demo slice (Sunday 11 October 2026) pulls the
core of sprints 1 to 4 forward.

| Sprint | File |
|---|---|
| S0 | [sprint-00-bootstrap.md](sprint-00-bootstrap.md) |
| S1 | [sprint-01-register-portal.md](sprint-01-register-portal.md) |
| S2 | [sprint-02-billing-collections.md](sprint-02-billing-collections.md) |
| S3 | [sprint-03-sales.md](sprint-03-sales.md) |
| S4 | [sprint-04-works-vendors-gate.md](sprint-04-works-vendors-gate.md) |
| S5 | [sprint-05-reports-documents.md](sprint-05-reports-documents.md) |
| S6 | [sprint-06-hardening.md](sprint-06-hardening.md) |

## Definition of done

`pnpm type-check` and `pnpm build` both green (`ignoreBuildErrors` means build alone proves nothing
about types); every new page opened in a real browser at phone, tablet and desktop widths; no console
errors; docs updated; pushed to `main` and the deployed page checked.

## Standing frontend rules (from `.claude/memory`)

| Rule | Memory file |
|---|---|
| Data only through `@/lib/api/client` plus TanStack hooks in `src/hooks`; never inline `fetch` | `feedback_ui_architecture_uniformity.md` |
| shadcn primitives (on `@base-ui/react`); sonner toasts for subscription 403 and 5xx; `ConfirmDialog` for destructive actions, never `window.confirm` | `feedback_ui_architecture_uniformity.md` |
| No AI-look: no sparkle, wand, stars or bot icons; no gradients or glows; no decorative emojis; copy humanised | `feedback_ui_architecture_uniformity.md`, `feedback_humanize_docs_and_comments.md` |
| The shell owns padding; page wrapper is `max-w-Nxl mx-auto` matching sibling pages, never extra `p-*` | `feedback_page_content_width_and_combobox_overlay.md` |
| Header and sticky-bar dropdowns through `AnchoredPortal`; `SearchableCombobox` pin at v0.1.82 or later | `feedback_page_content_width_and_combobox_overlay.md` |
| Modal width scales with content | `feedback_modal_width_scales_with_content.md` |
| Light theme default (`defaultTheme="light"`, `enableSystem={false}`) | `frontends-default-light-theme.md` |
| Files split at about 300 to 400 lines | `feedback_file_length_modular.md` |
| pnpm only; Docker install with `--frozen-lockfile`; `onlyBuiltDependencies` set | `feedback_use_pnpm.md`, `feedback_pnpm_frozen_lockfile.md` |
| PWA: committed static `public/sw.js`, next-pwa disabled, `OfflineBar registerSW` in a client provider, shared `PwaUpdater` | `pwa-offline-uniform-pattern.md` |
| Tenant manifest from a server-component `[orgSlug]/layout.tsx`; app name "{tenant} Maskani" | `pwa-tenant-manifest-fix.md` |
| `StaleChunkRecovery`; effects must not depend on unstable inline callbacks (React #185) | `pos-inventory-ui-stale-bundle-crash-and-pos-auth-me-404-2026-09-11.md` |
| SSO logout standard; one silent `prompt=none` probe for kiosk apps | `sso-frontend-logout-standard.md`, `sso-silent-probe-prompt-none.md` |
| Permissions from the JWT plus maskani `/auth/me`; refresh periodically | `reference_service_rbac_authme_sync.md` |
| Subscription gates fail open; features from `sub_features` | `subscription-gate-fail-open.md`, `subscription-jwt-enrichment.md` |
| shared-ui-lib consumers need `@source ".../shared-ui-lib/dist"` in `globals.css` | `feedback_ui_architecture_uniformity.md` |
| Server routes call other services in-cluster, never through the public domain | `s2s-cloudflare-loopback-fleetwide-fix-2026-09-10.md` |
| Property (outlet) selection stored per tenant slug | `tenant-switch-outlet-cache-fix.md` |
| Idle screensaver or lock must not bounce signed-in users; transient refresh failures do not log out | `inventory-ui-idle-screensaver-bounce-and-auth-refresh-2026-09-24.md` |
| Use the ui-ux-pro-max and ui-styling skills for layout and component decisions | Claude skills |
| After every `shadcn add`, check imports and the package.json diff (the CLI once wrote `from "cn"` and added an unrelated `cn` package) | phase 2 plan, lesson 2 |
| Charts: recharts 3.10.1 or later, memoised data and formatters, hoisted props, no Suspense around a mounted chart (React #185) | `pos-split-tender-treasury-reference-and-dashboard-185-2026-10-04.md` |
| Mobile: wrapping headers, single-row scrolling tab strips, `grid-cols-1 sm:grid-cols-2` forms, DataTable mobile tags, branded splash | `auth-ui-mobile-revamp-2026-08-21.md` |
| Gated queries carry `enabled` on module and permission so a background fetch never storms 403 toasts | `pos-payment-bar-gateways-payhero-c2b-room-gate-2026-10-03.md` |
| Full UI lessons checklist (23 items) | `.claude/plans/maskani-phase2-ui-mvp-2026-10-08.md` |
