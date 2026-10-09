# UI sprint 5: reports, notices, documents, privacy, vendor portal

| Item | Detail |
|---|---|
| Reports | Collections, arrears ageing, payment channels, sales position, instalment receivables, water balance, maintenance performance, vendor scorecard, security summary; CSV and PDF export |
| Budgets | Budget against actual and income and expenditure (Growth tier) |
| Notices | Compose with audience, channels, emergency flag; delivery status per recipient |
| Documents | Template library and editor with merge fields, generate, OTP acceptance, upload signed scan, verification page |
| Privacy | Requests queue with deadlines; export download |
| Vendor portal | Contracts, schedules, visit check-in with photos, roster upload, invoices |

## Progress

- [x] Notices: compose with audience and channels, send, delivery counts (built in round 3, 2026-10-08)
- [ ] Reports, budgets, documents, privacy and vendor portal screens. API state: maskani-api `docs/sprints/sprint-05-reports-erp-documents.md`
- [ ] Gaps from the 2026-10-09 audit: see "Gaps found by the 2026-10-09 audit" in [README.md](README.md) (S5 line)

## Rules to apply

Standing rules in [README.md](README.md), plus: charts follow the dataviz skill and keep props stable;
exports through the shared branded export pattern
(`treasury-customer-statement-datatable-pagination-export-2026-09-12.md`); the shared `/documents`
preview from shared-ui-lib for PDFs.
