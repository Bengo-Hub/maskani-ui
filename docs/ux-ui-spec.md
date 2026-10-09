# maskani-ui UX and UI specification

## Principles

1. **Configuration drives the product.** Navigation, dashboard tiles, form sections and portal cards
   come from `/auth/me` `modules` and permissions. A disabled module has no menu item, no tile, no
   form section and no route (a direct visit shows the shared `FeatureLock` state).
2. **Phone first for customers and field staff.** Portal, reading round and gate are designed at
   360 px first; console pages are responsive down to tablet and phone with `MobileBottomNav`.
3. **Plain and specific.** Solid brand tokens, specific icons (home, building, droplet, receipt,
   wrench, shield, megaphone), no gradients or glows, no sparkle or bot icons, no decorative emojis.
   Copy is short and literal, follows the humanise rules.
4. **Never fail silently.** Subscription 403s and 5xx errors toast through the shared API client;
   destructive actions use `ConfirmDialog`; empty states explain the next action.
5. **Performance budget.** Portal initial transfer under 200 KB excluding images; LCP under 2.5 s on a
   mid-range Android over 3G; images as resized WebP via `next/image`.
6. **Accessibility.** WCAG 2.2 AA: contrast, focus rings, labels on every input, 44 px touch targets
   on portal and gate.

## Brand

Assets from `shared-docs/brand/maskani/assets` are copied into `public/brand/`.

| Token | Value | Use |
|---|---|---|
| `--brand-plum` | `#6E1A5A` | Primary actions, active nav, logo |
| `--brand-plum-deep` | `#4E1240` | Sidebar background in dark areas, headers on dark |
| `--brand-gold` | `#C8963E` | Accent: highlights, "paid" progress, doorway mark |
| `--brand-gold-light` | `#E7C27A` | Accent on dark backgrounds |
| `--brand-slate` | `#6A6E78` | Secondary text |

`--primary` maps to plum; tenant branding from auth-api (`TenantBrandingProvider`) overrides primary
for tenant-branded surfaces (portal, gate), while the console keeps Maskani plum in the app chrome.
Fonts: Outfit (headings), DM Sans (body), JetBrains Mono (codes, amounts in tables), and Fraunces
for public-page headlines only (see Public pages). Light theme by
default (`defaultTheme="light"`, `enableSystem={false}`); a dark toggle is available.

| File | Use |
|---|---|
| `maskani-logo.svg` | Console header and sign-in |
| `maskani-logo-stacked.svg` | Splash and portal sign-in |
| `maskani-icon.svg` | Collapsed sidebar |
| `maskani-icon-192.png`, `maskani-icon-512.png`, `maskani-icon-app.svg` | PWA manifest |
| `apple-touch-icon.png`, `favicon.svg`, `favicon-32.png` | Browser and iOS |

## Public pages (landing and sign-in)

Redesigned on 2026-10-08 to feel soft and photo-led, like the better real estate sites, while
keeping the console plain and dense. maskani-commerce follows the same rules.

- **Type.** Headlines on public pages use Fraunces with its soft axis (`font-serif-soft`), loaded
  only by those pages through `src/lib/fonts.ts`, so the console never downloads it. Body text
  stays DM Sans; the console keeps Outfit headings.
- **Surfaces.** A warm paper background (`bg-paper`), white cards with large radii (24 to 32 px),
  hairline borders and two soft shadows (`shadow-soft`, `shadow-lift`). No gradients, glows,
  sparkle icons or glassy colour washes. The only blur is the sticky nav once scrolled.
- **Motion.** Hero content rises on load (`animate-rise` with `--rise-delay`); sections below the
  fold fade up as they scroll in (`Reveal`, which leaves server-rendered content visible and only
  hides blocks that start off screen). Photos zoom 3.5 percent on hover (`photo-zoom`). All of it
  switches off under reduced motion.
- **Photos.** Optimised WebP masters in `public/images/`, served through next/image. Sources and
  rules are in `docs/image-credits.md`; a stock photo never stands in for a real estate.
- **Illustration.** `EstateMap` draws who works from the one estate record (office, owners,
  caretakers, guards, vendors, M-Pesa) as an SVG map on wide screens and a list on phones.
- **Navigation.** The public nav links the sections, the Marketplace (`MARKETPLACE_URL`, shown on
  phones too) and Sign in (the estate launcher).
- **Sign-in.** `AuthShell` puts the form beside a photo panel (a photo band on phones) with the
  estate's logo and name. A tenant whose stored name is its slug shows as a title (`estateName`).
- **Copy.** Plain sentences that say what the product does today. No invented figures,
  testimonials or features that are still being built.

## Shell

- `src/app/layout.tsx`: fonts, `ThemeProvider`, global `<Toaster richColors position="top-right" closeButton />`.
- `src/app/[orgSlug]/layout.tsx`: **server component** with `generateMetadata` returning the tenant
  manifest (`/{orgSlug}/manifest.webmanifest`); app name "{tenant first word} Maskani".
- `src/providers/org-providers.tsx` (client, mounted by the org layout): QueryClient (no retry on 401, 402, 403), AuthProvider,
  BrandingProvider, subscription entitlements; mounts `StaleChunkRecovery`, `OfflineBar registerSW`,
  route guard. Kiosk paths (`/gate`, `/portal/sign-in`) render without console chrome.
- The shell's `<main>` owns page padding. Pages wrap content in `max-w-7xl mx-auto` (lists and boards)
  or `max-w-4xl mx-auto` (detail and forms), with no extra padding.
- Header: tenant name, property switcher (portalled dropdown via `AnchoredPortal`), app switcher,
  account panel. Any header dropdown goes through `AnchoredPortal`.
- Sidebar: groups Overview, Register, Money, Operations, Security, Communication, Reports, Settings;
  collapsible to icons; built from `src/lib/nav.ts` filtered by module and permission.

## Deep links (contract with notifications)

Email links and WhatsApp buttons open these paths under `/{orgSlug}/`. They are baked into
Meta-approved templates, so renaming one needs a new template version; keep them stable.

| Path | Opens | Sign-in |
|---|---|---|
| `portal` | Owner portal home (balance, statement, Pay now) | Phone code |
| `portal/purchase` | Purchase plan, schedule and payments | Phone code |
| `portal/walk-ins/{eventId}` | Allow or decline a visitor at the gate (5 minute countdown) | Phone code; return to this path after sign-in |
| `security/incidents/{id}` | Incident detail | Staff SSO |
| `works/{id}` | Work order detail | Staff SSO |
| `vendors/{id}` | Provider detail with documents | Staff SSO |

A deep link opened while signed out must come back to the same path after sign-in.

## Key screens (low fidelity from SRDD figure 14)

### Console dashboard

Row of stat tiles: "October collections KES 1.31M of 1.52M billed" (progress bar in gold), "Arrears
over 60 days: 7 units, KES 96,300" (link to list), "Work orders: 12 open, 2 past SLA", "Water loss
8.4% this month", "Vendors due for renewal: 1". Below: collections by week chart, arrears ageing
bars, recent payments, open work orders. Each figure links to the records behind it.

### Unit detail

Header with code, type, block, status badges; tabs: Overview (parties with dates and bill-to, accounts
per fund with balances and Pay link), Billing (invoices and payments from treasury), Utilities
(readings with photos, consumption chart), Sales (contract and schedule, if sales is on), Works,
Documents, Timeline.

### Billing run

Step 1 choose property, fund, period; step 2 preview table (unit, lines, total, warnings such as
missing reading or no owner); step 3 issue with live progress (issued, failed, retry failed). Re-issuing
the same period opens the existing run instead of creating another.

### Reading round (caretaker phone)

List in walking order grouped by block; each row shows unit, meter serial, previous reading; tapping
opens a capture sheet: numeric keypad input, camera capture (required), instant flag (lower than
previous, zero consumption, spike) with "re-check" or "save anyway"; progress "23 of 40 read".

### Owner portal home

```
Unit B07, 3 bedroom
Balance due KES 6,450     Due 10 November
[ Pay now ]   M-Pesa paybill 123456, account B07
Purchase plan   KES 4.2M of 7.5M paid   [ View ]
Water, October  9 m3, reading photo     [ View ]
Requests   Visitors   Notices
```

Pay now opens the shared `TreasuryPaymentModal` with the tenant's real gateways (M-Pesa prompt via
Daraja or PayHero, card via Paystack where configured) and shows the paybill and account number as the
offline alternative.

### Gate tablet

Full-screen, large type, landscape. Top bar: gate name, guard on duty since, online or offline dot,
queued count. Main: 6-digit keypad and Scan QR button. Result card: green Valid with host unit and
window and an Admit button; amber Walk-in pending host with countdown; red Not valid with reason. Bottom
actions: Walk-in visitor, Exit, Patrol scan, Incident.

## Offline gate behaviour

- On sign-on and every 5 minutes online, `GET /gate/sync` returns passes valid for the next 24 hours
  and active badges; stored in IndexedDB (encrypted with a device key held in memory after PIN unlock).
- Verify checks the cache first when offline; entries are queued in IndexedDB with a
  `client_event_id` and flushed on reconnect; the server deduplicates.
- The offline ribbon and queued count come from the shared `OfflineBar` with `getPendingCount`.
- Mutations use `networkMode: 'always'` so they do not pause when the browser reports offline.

## PWA

- Committed hand-written `public/sw.js` (network-first navigation, cache-first `_next/static`,
  stale-while-revalidate assets); next-pwa stays installed with `disable: true`.
- `OfflineBar registerSW` in the client shell; shared `PwaUpdater` shows the update banner.
- `StaleChunkRecovery` mounted once.
- Tenant manifest from the `[orgSlug]` server layout; icons from the brand set.

### Splash and app feel

- iOS launch images: `appleWebApp.startupImage` entries for the common iPhone and iPad sizes,
  generated once from `maskani-logo-stacked.svg` on plum and committed under `public/splash/`
  (auth-ui `APPLE_SPLASH_SCREENS` pattern).
- In-app `AppSplash` while the session restores: logo and a plain progress bar on the page
  background. No glow, no gradient.
- Installed launch (`display-mode: standalone`): brief branded overlay (pos-ui `PwaSplashScreen`
  pattern), then the app.
- Install prompt: shared `PwaInstallPrompt` with app name "{tenant first word} Maskani".
- Phones: bottom navigation per surface, forms open as bottom sheets, 44 px targets, safe-area
  insets respected, `DataTable` mobile cards.

Bottom navigation tabs:

| Surface | Tabs |
|---|---|
| Console | Home, Units, Money, Works, More (opens the sidebar) |
| Portal | Home, Pay, Visitors, Requests, More |
| Gate tablet | None (kiosk) |

## Realtime

One `EventSource` per signed-in session on `GET {API}/api/v1/{tenant}/maskani/stream?token=`.
Events are hints (`{type, id, property_id, unit_id}`); the client invalidates the matching TanStack
queries and refetches, so a missed event only delays a screen until its next refetch. Reconnect with
backoff from 2 s to 30 s and refetch active queries after a reconnect.

| Event | Refreshes |
|---|---|
| `billing_run.progress` | Billing run detail and list |
| `payment.applied` | Dashboard, unit accounts, statements, portal balance |
| `work_order.updated` | Work order board, detail, portal requests |
| `gate.event`, `walk_in.requested`, `walk_in.decided` | Gate log, portal walk-in screen |
| `reading.saved` | Reading round, anomaly review |
| `notice.status` | Notices and deliveries |

## Components

Reuse before building: shared-ui-lib `DataTable` (server pagination, export), `SearchableCombobox`,
`TreasuryPaymentModal`, `FeatureGate`, `FeatureLock`, `LimitReachedModal`, `SubscriptionBanner`,
`AnnouncementBanner`, `MobileBottomNav`, `AppSwitcher`, `AccountPanel`, `OfflineBar`, legal links and
cookie consent. Local shadcn primitives for buttons, inputs, dialogs, sheets, tabs, badges. Modal width
scales with content. Files split at about 300 to 400 lines.
