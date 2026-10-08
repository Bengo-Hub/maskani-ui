# UI sprint 0: shell, auth, branding, PWA

| Item | Detail |
|---|---|
| Scaffold | Copy of hospital-ui structure: `src/app/[orgSlug]`, `org-shell.tsx`, `lib/api`, `lib/auth`, `store`, `providers`, `components/ui` |
| Brand | `public/brand/*` from `shared-docs/brand/maskani/assets`; tokens in `globals.css`; favicon and manifest icons |
| Auth | PKCE SSO with `maskani-ui` client, callback, refresh, logout standard; maskani `/auth/me` |
| Navigation | `nav-config.ts` filtered by modules and permissions; sidebar, header with property switcher in `AnchoredPortal`, `MobileBottomNav` |
| PWA | `public/sw.js`, `OfflineBar`, `StaleChunkRecovery`, tenant manifest route |
| Subscription | `/api/subscription` proxy (in-cluster), `FeatureGate`, `LimitReachedModal`, toasts |
| Landing | `/` explains Maskani and links to tenant sign-in (no AI-look hero) |
| Devops | Dockerfile, `build.sh`, `.github/workflows/deploy.yml`, `.env.example` |

## Progress

As of 2026-10-08.

- [x] Docs: README, plan, UX/UI spec, integrations, sprints
- [x] devops-k8s `apps/maskani-ui` values drafted (not yet committed; waits for the first image)
- [x] Scaffold: config, dependencies and API layer (template changed to pos-ui, which has the full PWA set; hospital-ui has none). `pnpm audit --prod` clean. next-pwa left out entirely, not just disabled, because its build chain carried five high advisories; the committed `public/sw.js` rule is unchanged
- [x] shared-ui-lib v0.1.104 adds Maskani to the app switcher and service tags
- [x] Shell, auth store, providers (console shell, deep-plum sidebar, header with AnchoredPortal property switcher, shared app switcher and account panel, shared mobile bottom nav)
- [x] Brand assets and tokens (maskable icons and iOS launch images generated from the brand set)
- [x] PKCE SSO with the `maskani-ui` client; silent probe never loops; only a refused refresh token signs out
- [x] Navigation filtered by modules and permissions (one `lib/nav.ts` table drives sidebar, bottom nav and route guard)
- [x] PWA: committed `sw.js` + `sw-media.js`, OfflineBar, StaleChunkRecovery, tenant manifest, launch splash, install prompt
- [x] Subscription gate (fail open; shared SubscriptionProvider, LimitReachedModal)
- [x] Landing page
- [x] Dockerfile, `build.sh`, deploy workflow, repo `Bengo-Hub/maskani-ui` (CI green 2026-10-08)
- [x] devops-k8s `apps/maskani-ui` pushed (`b3846451`) and ArgoCD app applied; 2 pods ready

## Rules to apply

All standing rules in [README.md](README.md). Scenario-specific:

| Scenario | Rule | Memory file |
|---|---|---|
| First shared-ui-lib consumer setup | `@source` directive or shared components render unstyled | `feedback_ui_architecture_uniformity.md` |
| Service worker | Static committed file, never next-pwa generation | `pwa-offline-uniform-pattern.md` |
| Build args | `NEXT_PUBLIC_*` baked at build; secrets only server side | `feedback_no_secrets_in_code.md` |
