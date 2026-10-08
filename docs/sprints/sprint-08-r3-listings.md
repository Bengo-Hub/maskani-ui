# UI sprint 8: Release 3, listings console

Development June to August 2027, launch September 2027 (SRDD 23.4). The public site is
maskani-commerce (`docs/sprints/sprint-08-marketplace.md`); this sprint is the console side.
API: maskani-api `docs/sprints/sprint-08-r3-marketplace.md`. Requirements FR-68 to FR-76.

| Item | Detail |
|---|---|
| Publish a unit | One action on a vacant managed unit or a unit for sale: photos, video link, description, price; listing closes when a lease or sale is signed |
| Listing management | List of the tenant's listings with status, views, enquiries; edit, pause, close |
| Lister verification | Identity by OTP and document upload; EARB number for agents; title or owner authority for sale listings; verified badge with date |
| Enquiries and viewings | Enquiry inbox (the R1 enquiries list grows into this), viewing slots from a calendar, reminders, attended or missed |
| Applications and offers | Rental applications into the sprint 7 workflow; offers into sales reservations |
| Moderation (platform owner) | Reported listings, duplicate photos, price outliers, takedown with reason |
| Featured placement | Buy featured slots through TreasuryPaymentModal |

## Progress

- [ ] Not started. R1 already ships the estate showcase and enquiry capture.

## Rules to apply

Standing rules in [README.md](README.md), plus: contacts stay masked until the lister replies; listing
photos are public media (a separate public bucket or projection), never the private signed media used
for readings and works.
