# UI sprint 4: works, vendors and gate tablet

| Item | Detail | Demo |
|---|---|---|
| Work orders | Board by status and list; create from console or portal; assign vendor or ERP staff; SLA countdown; photos; complete; resident confirm or reopen | Yes |
| Vendors | List, detail, documents with expiry badges, personnel badges, contracts | Yes |
| Gate tablet | Kiosk route, device registration, guard PIN, verify (keypad and QR), walk-in approval with countdown, exit, offline queue and cache | Yes |
| Passes and log | Console list of passes and gate events with filters | Yes |
| Incidents | Report from tablet and console; occurrence book | Yes |
| Portal | Create visitor passes (gate code sent to the visitor on WhatsApp), requests with photos | Yes |

## Progress

- [ ] Screens and gate tablet app not started (2026-10-08). The API is mostly done; see maskani-api `docs/sprints/sprint-04-providers-works-gate.md`.

## Rules to apply

Standing rules in [README.md](README.md), plus:

| Scenario | Rule | Memory file |
|---|---|---|
| Offline mutations | `networkMode: 'always'`; queue in IndexedDB with `client_event_id`; `OfflineBar getPendingCount` | `feedback_ui_architecture_uniformity.md`, `pwa-offline-uniform-pattern.md` |
| Kiosk sign-in | One silent SSO probe per session; PIN lock never bounces a signed-in device | `sso-silent-probe-prompt-none.md`, `inventory-ui-idle-screensaver-bounce-and-auth-refresh-2026-09-24.md` |
| Realtime | Server-sent updates through the shared fan-out; reconnect with backoff | `realtime-efficiency-pwa-2026-07-24.md` |
| Sharing pass codes | WhatsApp sharing as a button, never raw link text | `feedback_whatsapp_links_as_buttons.md` |
