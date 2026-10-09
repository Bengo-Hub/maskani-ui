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
| S7 (R2) | [sprint-07-r2-leasing.md](sprint-07-r2-leasing.md) |
| S8 (R3) | [sprint-08-r3-listings.md](sprint-08-r3-listings.md) (public site in maskani-commerce) |
| S9 (R4) | [sprint-09-r4-extensions.md](sprint-09-r4-extensions.md) |

## Gaps found by the 2026-10-09 audit

Plan: `.claude/plans/maskani-r1-completion-r2-rentals-2026-10-09.md` (wave in brackets). Each sprint
file points here. Every UI call matches a real API route; the gaps are below.

**Bugs and rule breaks (wave 1c)**
- [ ] Render loops: `work-order-form.tsx`, `run-wizard.tsx` and `unit-form.tsx` default query data to a new `[]` each render and feed it to a `setState` effect
- [ ] Inline `onClose` passed to `AnchoredPortal` in `property-switcher.tsx` and `header.tsx` re-attaches listeners every render
- [ ] Inline `useQuery`/`useMutation` or effect fetches move into `src/hooks`: notices, incident detail, water balance, general and catalogue settings, property staff, terms gate, walk-in decide, media signing (work order and incident detail), gate walk-in and incident sheets, portal pay, catalogue combobox
- [ ] `enabled` gating on imports, notices, water balance and settings queries
- [ ] Collections arrears search and minimum balance filter only the loaded pages; they move to API query params. Suspense total from the API
- [ ] Water loss is a plain mean; the API returns the volume-weighted figure
- [ ] Users list filtered and counted in the browser; server search and paging
- [ ] Statement view promises a running balance and computes none; the API returns it
- [ ] Sales availability grouped client side and unpaginated; server-grouped endpoint
- [ ] `payment.applied` does not invalidate `qk.arrears`
- [ ] Terms acceptance stored on the device only; read the server version
- [ ] Route guard uses a local `EmptyState` instead of shared-ui-lib `FeatureLock`
- [ ] Dead code: unused shadcn components (dropdown-menu, popover, scroll-area, select, separator, table, textarea), unused wrappers and query keys (meters, price lists, reservations, addVehicle until their screens land), `TREASURY_API_URL`; the header hardcodes the treasury URL instead of `TREASURY_UI_URL`
- [ ] `lib/api/types.ts` is 813 lines; split by domain
- [ ] `typescript.ignoreBuildErrors` turned off once type-check is green
- [x] Docs: the UX spec named `org-shell.tsx` and `nav-config.ts`; corrected to `providers/org-providers.tsx` and `lib/nav.ts`, and `/gate/sync` to `GET` (2026-10-09)

**Screens missing (wave 2, API first)**
- [ ] S1: unit detail tabs Billing, Utilities, Sales, Works, Documents, Timeline and vehicles; portal household, vehicles and domestic staff; custom fields; privacy requests
- [ ] S2: statement PDF and spreadsheet through shared-ui-lib `PdfPreview`; meter register and replacement; adjustments and bill queries (console queue and portal submission); payment plans; arrears ladder view
- [ ] S3: price list editor, reservations list, milestone release, restructure, handover with snag list, title stages, purchase and completion statements
- [ ] S4: vendor contracts, schedules and visits, preventive maintenance, vendor invoices, vendor portal, ERP staff picker, guard posts and rosters, patrol checkpoints and tablet patrol scan, occurrence book, gate device list and revoke
- [ ] S5: reports area with charts and export, documents library, budgets and AGM pack, audit log, marketplace enquiries inbox (routes already exist), approval rules and reminder schedules settings
- [ ] Role dashboards (user review 2026-10-09: shallow): a redesigned landing view per console role (tenant admin, property manager, finance, sales or letting, caretaker, security) with the queues, tiles and charts that role acts on, each figure drilling into its records, fed by server-side role summaries; owner portal home rebuilt to the SRDD figure 14 layout (balance per fund with Pay now, purchase progress, last reading, open requests, active passes, notices, household actions)
- [ ] Combobox panels open away from their field inside dialogs and sheets (Assign staff, user report 2026-10-09): fix in shared-ui-lib (portal to body, anchored, flip and clamp), new tag, audit every dropdown
- [ ] Staff dashboard as a business intelligence view (user review 2026-10-09): KPIs with month and year comparisons and 12-month trends, cash-in forecast (scheduled instalments plus recurring charges times collection rate), arrears projection, sales run rate and sell-out estimate, cash flow, revenue mix, collection by block, top debtors, budget against actual, sales pipeline, vendor spend and SLA, occupancy trend; filters, drill-downs and export; all computed server side
- [ ] Portal: bottom tabs Home, Pay, Visitors, Requests, More as the spec says (today Home, Visitors, Requests, Notices); last water reading on home; documents page

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
