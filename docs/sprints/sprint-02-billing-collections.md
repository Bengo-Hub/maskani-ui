# UI sprint 2: billing, utilities, collections, portal pay

| Item | Detail | Demo |
|---|---|---|
| Funds | Estate and sales funds with paybill and account prefix | Yes |
| Charge catalogue | Seeded and custom charges, enable, rename; rate editor with effective dates and scope; block tariff editor | Yes |
| Billing runs | Preview, issue with progress, retry failed, history | Yes |
| Unit accounts | Balance per fund, statement (PDF and CSV) | Yes |
| Collections | Payments feed, suspense queue with assign dialog, arrears ageing | Yes |
| Reading round | Phone-first capture with camera, flags, progress | Yes |
| Water balance | Supplied vs billed vs common, loss trend chart | Yes |
| Portal | Pay now through `TreasuryPaymentModal`; statement; water reading with photo | Yes |

## Progress

- [x] Funds (paybill, account prefix) and charge catalogue (switch on or off, dated rates by scope, block water tariffs)
- [x] Billing runs: wizard with preview, issue, live progress, retry failed
- [x] Unit accounts and statements (live from treasury); staff collect payment via TreasuryPaymentModal
- [x] Collections: unmatched paybill payments with assign, arrears list
- [x] Reading round (phone-first, optional photo resized to JPEG, instant warnings, accept) and water balance
- [x] Charges and funds rebuilt: charge types, rates and funds tabs with filters, catalogue sheet, charge form (2026-10-08)
- [x] Collections, meter readings and water balance redesign with filters and drill-downs (2026-10-08): collections stat tiles from the dashboard, unmatched payments table with a lookback window and search, arrears with the shared ageing bars, minimum owing filter and account drill-down; readings with per-block progress, show and block filters, search, estimate, recheck and accept all clean; water balance chart (supplied against billed, one axis), loss against the estate's own alert setting
- [x] Portal pay (pending intent, gateway chosen in the modal, paybill fallback) and statement
- [ ] Statement PDF and CSV export (API not built yet)

## Rules to apply

Standing rules in [README.md](README.md), plus:

| Scenario | Rule | Memory file |
|---|---|---|
| Payment modal | Reuse shared `TreasuryPaymentModal`; gateways from treasury public endpoint; fail closed when none; no unguarded fetches that toast 403 | `pos-payment-bar-gateways-payhero-c2b-room-gate-2026-10-03.md` |
| Provider logos | Only from shared-ui-lib | `pos-payment-bar-gateways-payhero-c2b-room-gate-2026-10-03.md` |
| Charts | Follow the dataviz skill; recharts store loops cause React #185, keep chart props stable | `pos-split-tender-treasury-reference-and-dashboard-185-2026-10-04.md` |
| Money display | Full KES figures where parts and totals appear together; never rounded parts that mis-add | `feedback_exact_figures_in_client_docs.md` |
| Camera capture | `<input type="file" accept="image/*" capture="environment">`, resize to WebP before upload | NFR-03 |
