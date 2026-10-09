# maskani-ui integrations

## Environment

| Variable | Value (production) | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://maskaniapi.codevertexafrica.com` | maskani-api |
| `NEXT_PUBLIC_SSO_URL` | `https://sso.codevertexafrica.com` | auth-api OIDC |
| `NEXT_PUBLIC_SSO_CLIENT_ID` | `maskani-ui` | registered in auth-api seed |
| `NEXT_PUBLIC_AUTH_UI_URL` | `https://accounts.codevertexafrica.com` | login and logout pages |
| `NEXT_PUBLIC_TREASURY_UI_URL` | `https://books.codevertexafrica.com` | payment modal and app switcher; payments go through maskani-api, never straight to treasury |
| `NEXT_PUBLIC_NOTIFICATIONS_URL` | `https://notificationsapi.codevertexafrica.com` | push config |
| `NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL` | `https://pricing.codevertexafrica.com` | upgrade links |
| `SUBSCRIPTION_BASE_URL` (server only) | `http://subscription-api.subscriptions.svc.cluster.local:4000` | in-cluster, never through Cloudflare |
| `INTERNAL_SERVICE_KEY` (server only, secret) | from `maskani-ui-secrets` | used only by server routes |

`NEXT_PUBLIC_*` values are build arguments in the Dockerfile and `build.sh`.

## Authentication

- **Staff:** PKCE OIDC against auth-api (`/api/v1/authorize`, `/token`, `/auth/refresh`, `/auth/me`),
  callback at `/{orgSlug}/auth/callback`; then maskani `/api/v1/{tenant}/maskani/auth/me` for
  permissions, properties and modules. Logout posts `/api/v1/auth/logout` through
  `revokeServerSession`, then redirects to `accounts.../login?return_to=`.
- **Portal and vendor users:** `POST {SSO}/api/v1/auth/phone/otp/request` then `/verify` with
  `tenant_slug`, `phone`, `client_id`; same token storage and refresh as staff. The code goes to
  the member's email when they have one, otherwise WhatsApp. The code screen offers "Send it on
  WhatsApp instead", which requests again with `channel: "whatsapp"`. The copy names both
  channels because the API never says which one it used (that would reveal the account).
- **Gate tablet:** registered device key (stored on the device after registration by a manager) plus
  guard PIN; one silent `prompt=none` SSO probe per session is allowed, never a loop.
- Token refresh tolerates transient failures; only a real 401 logs out.

## API client

`src/lib/api/client.ts`: axios singleton sending `Authorization`, `X-Tenant-ID`, `X-Tenant-Slug`,
`X-Outlet-ID` (selected property). Callbacks `setOn401`, `setOnSubscription403`,
`setOnLimitReached` (402), `setOnServerError`. Domain files in `src/lib/api/<domain>.ts`, hooks in
`src/hooks/use<Domain>.ts`; pages never call `fetch` directly.

### Contract notes (checked against maskani-api handlers, 2026-10-08)

- Errors are `{error, code}`. `module_not_enabled` (with `module`) shows the shared `FeatureLock`;
  `feature_not_available` (with `feature`) shows the upgrade toast; permission failures add `required`.
- Growing lists page by keyset: `?limit=` (max 100) and `?cursor=`, response
  `{data, next_cursor, has_more}`. Small lists return `{data}`.
- Decimals arrive as strings (use `num()` and `kes()` in `lib/utils.ts`); Ent relations arrive under
  `edges`. Request bodies reject unknown fields, so send only the documented keys.
- Photos: `POST /media/upload` (multipart `file` + `kind`, JPEG or PNG, max 8 MB) returns
  `{key, url}`; the key then goes into the record (for example a reading's `photo_key`). Signed
  links for stored keys come from `POST /media/sign {keys}`.
- Gate tablet: `X-Device-Key` header; `GET /gate/sync` for the cache, `POST /gate/events` for
  queued entries (walk-ins are events of kind `walk_in_request`).
- Work order lifecycle: one endpoint, `POST /work-orders/{id}/actions {action, ...}`.
- Phone sign-in: `POST {SSO}/api/v1/auth/phone/otp/request {tenant_slug, phone}` always answers
  `{sent, expires_in}` (it never reveals whether the phone exists); `/verify
  {tenant_slug, phone, code, client_id}` returns the standard token pair. `mfa_required` means the
  account must sign in with its password.

## Payments

The portal Pay button calls `POST /me/accounts/{id}/pay` (maskani creates the treasury
`account_payment` intent) and hands the intent to shared-ui-lib's `TreasuryPaymentModal`, which reads
`GET {TREASURY}/api/v1/pay/{tenant}/gateways` so only the tenant's configured rails appear. Status is
followed through the modal's existing polling; the balance refreshes when maskani's payment consumer
runs (TanStack invalidation on modal close plus a short refetch).

## Subscription gating

`/api/subscription` server route proxies `{SUBSCRIPTION_BASE_URL}/api/v1/tenants/{id}/subscription`
with `X-API-Key`. Gates fail open: last known good entitlements, otherwise "unknown" with retry, never a
hard lock on a fetch error. Feature codes are the `maskani_*` codes in `maskani-api/docs/integrations.md`.

## App switcher

shared-ui-lib `SERVICE_REGISTRY` gets `{ key: 'maskani', serviceTag: 'maskani', url: 'https://maskaniapp.codevertexafrica.com' }`.
Until that tag ships, maskani-ui keeps a local copy of the registry entry.
