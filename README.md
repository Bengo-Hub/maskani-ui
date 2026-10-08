# maskani-ui

Next.js progressive web app for **Maskani by Codevertex**. One app, four tenant-branded surfaces:

| Surface | Route | Users | Sign-in |
|---|---|---|---|
| Management console | `/{orgSlug}/...` | Tenant admin, property manager, finance, sales or letting, caretaker | SSO with MFA |
| Owner and occupant portal | `/{orgSlug}/portal/...` | Owners, buyers, occupants, household | Phone and one-time password |
| Gate tablet | `/{orgSlug}/gate` | Guards on a registered Android tablet | Device key plus guard PIN, kiosk mode |
| Vendor portal | `/{orgSlug}/vendor/...` | Agency and contractor supervisors | Phone and one-time password |

Host: `https://maskaniapp.codevertexafrica.com`. API: `https://maskaniapi.codevertexafrica.com`.

## Documents

| File | Content |
|---|---|
| [plan.md](plan.md) | Scope per surface, demo slice |
| [docs/ux-ui-spec.md](docs/ux-ui-spec.md) | Screens, navigation, components, PWA, offline gate, brand tokens |
| [docs/integrations.md](docs/integrations.md) | APIs, auth flow, payments modal, subscription gating |
| [docs/sprints/](docs/sprints/README.md) | UI sprint plans with the frontend rules to apply |

## Stack

Next 16 (App Router, Turbopack), React 19, Tailwind v4, shadcn on `@base-ui/react`, TanStack Query 5,
zustand 5, axios, sonner, `@bengo-hub/shared-ui-lib` pinned by git tag, pnpm.

## Local development

```bash
cp .env.example .env.local   # never commit .env.local
pnpm install
pnpm dev                     # http://localhost:3020
pnpm type-check && pnpm build
```

On Windows set `SKIP_STANDALONE=true` for local builds. Deploys run through CI on push to `main`.
