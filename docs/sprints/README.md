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
- [x] Render loops: the work order, billing run and unit sheets now reset only when opened and fill defaults from primitive values; refetches no longer wipe what was typed (`13826ed`)
- [x] `AnchoredPortal` reads `onClose` through a ref, so inline closures no longer re-bind its listeners (`13826ed`)
- [x] Notices, water balance, general and catalogue settings and terms moved into hooks (`3cfabe7`)
- [x] Last inline calls moved into hooks: `useIncident`, `useSignedMedia` (one cached hook for work order and incident photos, replacing two effect-and-state copies), `useAssignStaff` and `useRemoveStaff`, `useDecideWalkIn`, and the catalogue combobox on `useUpsertCatalogue(kind, quiet)`. The gate sheets were already on hooks. Pay dialogs keep passing `createIntent` to the shared pay component, which is its contract
- [x] `enabled` gating on imports, notices, settings and catalogue queries; water balance takes its threshold from `/auth/me` instead of a settings call (`3cfabe7`)
- [x] Arrears search and minimum balance run on the API (`q`, `min`), so they reach accounts beyond the loaded page (api `e166219`, ui `3cfabe7`). Suspense total stays client side: it sums one bounded window of treasury's unmatched list
- [x] Water loss average is volume weighted (`3cfabe7`)
- [x] Users list: kept client side on purpose (staff capped by plan at 100, list capped at 500, tiles need the whole set); the API now also takes `q` (`e166219`)
- [x] Statement shows the balance after every entry, worked back from today's position (balance less credit); treasury sends the latest 50 bills and 50 payments, so when a list is full the older entries are left out and the card says so, keeping every balance exact. Full history comes with the statement download (wave 2.1)
- [x] Sales availability grouped and ordered on the API (api `e0f92e5`): blocks in their set order, units in natural code order, slim tiles, an available count per block, and a status filter (All, Available, Reserved, Under agreement). The board stays unpaged by design: it shows one whole property
- [x] `payment.applied` refreshes arrears (`3cfabe7`)
- [x] Terms acceptance follows `/auth/me` `terms_accepted_version` (api `4d05518`, ui `3cfabe7`)
- [x] Route guard shows the shared `FeatureLock` upgrade path when the plan is the reason, the plain message otherwise (`3cfabe7`)
- [x] Switched-off module opens read only (FR-09) instead of "not available": the shell wraps the page in `ModuleReadOnly` (banner, "Switch it back on" for `settings.manage`), and `useAccess().canAll` lets that page's queries run; the API answers the reads and refuses changes (`3ae57a5`). The nav still hides the module, so it is reached by link or bookmark. A plan without the module still shows the `FeatureLock` upgrade path. The UI derives the state from `/auth/me` modules, so it does not read the `X-Module-Read-Only` header; the header stays for other clients
- [x] Dead code: the seven unused shadcn components removed; `TREASURY_API_URL` removed from config, Dockerfile, `build.sh` and `.env.example` (payments go through maskani-api; shared-ui-lib reads only the treasury UI URL); the header uses `TREASURY_UI_URL` from config. The meter, price list, reservation and vehicle wrappers stay: they match live routes and wave 2 screens use them
- [x] `lib/api/types.ts` (817 lines) split into `lib/api/types/` by domain (common, identity, register, billing, utilities, sales, works, gate, notices, reports, settings, portal) behind an index, so `@/lib/api/types` imports are unchanged; all 73 exports kept
- [x] `typescript.ignoreBuildErrors` turned off: `next build` now type-checks too
- [x] Docs: the UX spec named `org-shell.tsx` and `nav-config.ts`; corrected to `providers/org-providers.tsx` and `lib/nav.ts`, and `/gate/sync` to `GET` (2026-10-09)

**Screens missing (wave 2, API first)**
- [ ] S1: unit detail tabs Billing, Utilities, Sales, Works, Documents, Timeline and vehicles; portal household, vehicles and domestic staff; custom fields; privacy requests
- [ ] S2: statement PDF and spreadsheet through shared-ui-lib `PdfPreview`; meter register and replacement; adjustments and bill queries (console queue and portal submission); payment plans; arrears ladder view
- [ ] S3: price list editor, reservations list, milestone release, restructure, handover with snag list, title stages, purchase and completion statements
- [ ] S4: vendor contracts, schedules and visits, preventive maintenance, vendor invoices, vendor portal, ERP staff picker, guard posts and rosters, patrol checkpoints and tablet patrol scan, occurrence book, gate device list and revoke
- [ ] S5: reports area with charts and export, documents library, budgets and AGM pack, audit log, marketplace enquiries inbox (routes already exist), approval rules and reminder schedules settings
- [x] Owner portal home rebuilt to SRDD figure 14 (`bfe1037`, api `acb29ec` adds `last_reading`): total to pay first, quick actions that open the visitor and request forms, units with accounts, Pay now, paybill and water reading, visitors, requests and notices panels, purchase progress
- [x] Role queues on the console dashboard from one `GET /reports/role-summary` (api `a20d833`): reading round progress for caretakers, the maintenance queue, today at the gate for security, finance queues, sales follow-ups. Each panel shows only with its permission and module, every row links to its records, and rows needing action say so in words. The dashboard is now open to every staff role (caretakers and guards used to land on "not available" after sign-in); report tiles, charts and the period picker need `reports.view`. Realtime gate, reading, work order and payment events refresh the panels
- [ ] Role dashboards, remaining (user review 2026-10-09: shallow; owner home and role queues done): a redesigned landing view per console role (tenant admin, property manager, finance, sales or letting, caretaker, security) with the queues, tiles and charts that role acts on, each figure drilling into its records, fed by server-side role summaries; owner portal home rebuilt to the SRDD figure 14 layout (balance per fund with Pay now, purchase progress, last reading, open requests, active passes, notices, household actions)
- [x] Combobox panels open away from their field inside dialogs and sheets (Assign staff, user report 2026-10-09). Cause: a transformed dialog is the containing block for `position: fixed`. Fixed in shared-ui-lib v0.1.106 (`combobox/fixed-position.ts`, also the multi-select and the data-table popover), not with a portal, which would close base-ui dialogs; maskani-ui pinned to v0.1.106 (`13826ed`)
- [ ] Fleet apps still pinned below v0.1.106 keep the bug inside dialogs; bump them as each is next touched (recorded in memory)
- [x] Staff dashboard performance and outlook section on `/reports/insights` (`9b3ed1e`): KPIs with last-month and last-year comparisons in words, days to collect, occupancy, request close time, 12-month trend, stacked 12-month cash forecast with its method, revenue by charge, blocks, maintenance by category, sales pace; table view on every chart. Still open from the line below: cash out (vendor bills and payroll from treasury), top debtors' ageing movement, budget against actual, export
- [ ] Staff dashboard as a business intelligence view (user review 2026-10-09): KPIs with month and year comparisons and 12-month trends, cash-in forecast (scheduled instalments plus recurring charges times collection rate), arrears projection, sales run rate and sell-out estimate, cash flow, revenue mix, collection by block, top debtors, budget against actual, sales pipeline, vendor spend and SLA, occupancy trend; filters, drill-downs and export; all computed server side
- [ ] Portal: bottom tabs Home, Pay, Visitors, Requests, More as the spec says (today Home, Visitors, Requests, Notices); last water reading on home; documents page

## Definition of done

`pnpm type-check` and `pnpm build` both green (the build type-checks since `ignoreBuildErrors` was
turned off on 2026-10-09); every new page opened in a real browser at phone, tablet and desktop widths; no console
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
