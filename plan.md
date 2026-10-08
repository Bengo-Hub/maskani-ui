# maskani-ui plan

Source: SRDD CVX-MASKANI-SRDD-001 sections 3.2 (user classes), 7.1 (components), 16 (workflows and
key screens). API contract: `maskani-api/docs/api-spec.md`.

## Surfaces and screens

### Management console

| Area | Screens | Module |
|---|---|---|
| Dashboard | Collections this month (billed vs collected), arrears over 60 days, open work orders and past SLA, water loss, vendors due for renewal, quick actions | always |
| Properties | Property list, property detail (blocks, units, staff, meters, documents), block editor | properties |
| Units | Unit list with filters (block, sale status, occupancy, arrears), unit detail with timeline, parties, accounts, readings, works | properties |
| Parties | Owners and occupants list, party detail, invite to portal, household and vehicles | properties |
| Import | Upload CSV, dry run report, commit progress | properties |
| Billing | Charge catalogue, rates editor, funds, billing runs (preview, issue, progress, retry), unit accounts and statements | billing |
| Collections | Payments feed, suspense queue with assign, arrears ageing, bill queries | billing |
| Utilities | Reading round (mobile first, camera capture, walking order), anomaly review, meters, water balance | utilities |
| Sales | Availability board, price lists, reservations, sale contracts, schedule, purchase statement, handover and title | sales |
| Works | Work order board and list, work order detail with timeline, preventive schedules | maintenance |
| Vendors | Vendors, documents and expiry, contracts, personnel badges, visits | providers |
| Gate | Passes, gate log, devices, posts and checkpoints, incidents and occurrence book | gate |
| Notices | Compose with audience and channels, delivery status | communication |
| Reports | Collections, arrears, sales position, instalment receivables, water balance, maintenance, vendor scorecard, security | per report |
| Settings | Tenant settings, modules and presets, catalogues, custom fields, approval rules, reminders, users and roles, staff per property, audit log | admin |

### Owner and occupant portal (phone first)

Home card per unit: balance per fund, due date, Pay now; purchase plan progress; last water reading
with photo; requests; visitor passes; notices; household (owners); documents; terms acceptance on
first sign-in.

### Gate tablet

Enter code or scan QR, pass result (valid, expired, used) with host and window, Admit; walk-in with
host approval and 5 minute timer; exit logging; patrol scan; incident report; offline indicator with
queued count; guard sign-on with badge and PIN.

### Vendor portal (after demo)

Contracts, schedules, visit check-in with photos, roster upload, personnel, invoices.

## Demo slice (Sunday 11 October 2026)

Console: dashboard, properties, units, parties, charges, billing runs, collections and suspense,
reading round, water balance, sales (availability, contracts, schedule, statement), works, vendors,
gate passes and log, notices, settings (modules, users). Portal: sign-in by phone OTP, balance,
pay, purchase plan, passes, requests. Gate tablet: verify, walk-in, offline queue.

## Sprint map

| Sprint | UI scope |
|---|---|
| [S0](docs/sprints/sprint-00-bootstrap.md) | Shell, auth, branding, PWA, module-driven navigation |
| [S1](docs/sprints/sprint-01-register-portal.md) | Properties, units, parties, import, staff, portal sign-in and home |
| [S2](docs/sprints/sprint-02-billing-collections.md) | Charges, funds, billing runs, collections, reading round, water balance, portal pay and statements |
| [S3](docs/sprints/sprint-03-sales.md) | Availability, price lists, reservations, contracts, schedules, purchase statement, handover |
| [S4](docs/sprints/sprint-04-works-vendors-gate.md) | Works, vendors, gate tablet, passes, incidents, portal requests and passes |
| [S5](docs/sprints/sprint-05-reports-documents.md) | Reports, notices, documents, privacy, vendor portal |
| [S6](docs/sprints/sprint-06-hardening.md) | Accessibility, performance budget, offline gate test, UAT fixes |
| S7, S8 | R2 leasing and landlord portal; R3 lives in maskani-commerce |
