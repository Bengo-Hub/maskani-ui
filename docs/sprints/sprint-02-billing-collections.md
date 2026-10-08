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

- [ ] Screens not started (2026-10-08). The API for this sprint is mostly done; see maskani-api `docs/sprints/sprint-02-billing-utilities-collections.md`.

## Rules to apply

Standing rules in [README.md](README.md), plus:

| Scenario | Rule | Memory file |
|---|---|---|
| Payment modal | Reuse shared `TreasuryPaymentModal`; gateways from treasury public endpoint; fail closed when none; no unguarded fetches that toast 403 | `pos-payment-bar-gateways-payhero-c2b-room-gate-2026-10-03.md` |
| Provider logos | Only from shared-ui-lib | `pos-payment-bar-gateways-payhero-c2b-room-gate-2026-10-03.md` |
| Charts | Follow the dataviz skill; recharts store loops cause React #185, keep chart props stable | `pos-split-tender-treasury-reference-and-dashboard-185-2026-10-04.md` |
| Money display | Full KES figures where parts and totals appear together; never rounded parts that mis-add | `feedback_exact_figures_in_client_docs.md` |
| Camera capture | `<input type="file" accept="image/*" capture="environment">`, resize to WebP before upload | NFR-03 |
