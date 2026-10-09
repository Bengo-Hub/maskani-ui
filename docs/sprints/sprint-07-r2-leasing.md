# UI sprint 7: Release 2, leasing, landlord portal and self-service sign-up

Development March to May 2027, general availability June 2027 (SRDD 23.4). API side:
maskani-api `docs/sprints/sprint-07-r2-rentals.md`. Requirements FR-05, FR-16, FR-17, FR-36 to FR-45,
FR-59.

| Item | Detail |
|---|---|
| Sign-up wizard | Tenant type, trial, set-up steps only for the modules switched on |
| Landlord clients | Portfolio list and detail; mandate form (services, fees, expense limit, remittance account with OTP, remittance day, float) |
| Landlord portal | `/[orgSlug]/landlord`: occupancy, rent roll, arrears, expenses, statements, remittances, approvals above the mandate limit |
| Applications | Applicant form with consent and documents; manager and landlord approval queue |
| Leases | Lease wizard from templates, OTP acceptance or wet-signature upload, lease detail with schedule, escalation and renewal reminders |
| Deposits | Deposit ledger per lease, move-out deductions with photos, refund request into treasury approval |
| Inspections | Move-in and move-out checklist by room on a phone, photos, readings, keys, signatures |
| Rent | Rent invoices on the lease schedule in the unit account; `L-` paybill references shown to tenants |
| Turnover | Make-ready board (repaint, repair, clean as work orders) with ready date |
| Remittances | Remittance run preview, approval and statement PDF for the landlord |
| Short stays (user decision 2026-10-09) | Unit setting "Run as short stay" switches the unit to pos-api's hotel engine; the unit page then shows bookings, occupancy and owner income read from pos-api, with a link to manage bookings in pos-ui. No booking screens are built in Maskani |

## Progress

- [ ] Not started. Built in wave 4 of `.claude/plans/maskani-r1-completion-r2-rentals-2026-10-09.md`, after Release 1 is complete.

## Rules to apply

Standing rules in [README.md](README.md), plus: client money shows in its own fund and never mixes
with the manager's income on any screen; deposit figures are exact KES and itemised; remittance
statements reuse the shared document preview (`PdfPreview`) and the fleet PDF engine (sprint 5);
inspection capture follows the reading-round phone pattern (photos optional, resized JPEG).
