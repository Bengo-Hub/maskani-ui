# UI sprint 1: register, parties, import, portal sign-in

| Item | Detail | Demo |
|---|---|---|
| Properties | List, create (type, use case, location), detail with blocks, staff and meters tabs | Yes |
| Units | DataTable with server pagination and filters; create and edit sheet; detail with tabs | Yes |
| Parties | List and detail; add owner or occupant to a unit with dates and bill-to; invite to portal | Yes |
| Import | CSV upload, dry run report table, commit progress | Units and owners |
| Settings | Modules and preset, catalogues, users and staff per property | Modules, users |
| Portal | Phone sign-in (request and verify OTP), terms acceptance, home with unit cards | Yes |

## Progress

- [ ] Screens not started (2026-10-08). The API for this sprint is mostly done; see maskani-api `docs/sprints/sprint-01-register-parties-portal.md`.

## Rules to apply

Standing rules in [README.md](README.md), plus:

| Scenario | Rule | Memory file |
|---|---|---|
| Lists | Shared `DataTable` with server pagination and branded export; never client-paginate a growing list | `treasury-customer-statement-datatable-pagination-export-2026-09-12.md` |
| Party and unit lookup | Scanned input triggers lookup; typed input needs Enter, never on blur | global `feedback_scan_vs_type_lookup_ux.md` |
| Forms for disabled modules | Sale and lease fields hidden unless the module is on | SRDD 4.4 |
| Portal OTP | Clear errors for wrong code and rate limit; never reveal whether a phone exists | SRDD 16.2 |
