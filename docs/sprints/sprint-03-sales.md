# UI sprint 3: sales and instalments

| Item | Detail | Demo |
|---|---|---|
| Availability board | Units by block coloured by sale status, price on hover or tap | Yes |
| Price lists | By unit type and phase with effective dates | Yes |
| Reservations | Reserve with fee and expiry countdown | Yes |
| Sale contracts | Wizard: unit, buyers, price and discount, payment option, deposit, term, advocates; activate | Yes |
| Schedule | Generated schedule table with status per instalment; restructure proposal | Yes |
| Purchase statement | Price, payments with receipts, balance, schedule; PDF | Yes |
| Handover and title | Checklist, snags, readings, keys; title stages | Yes |
| Portal | Purchase plan card and statement for buyers | Yes |

## Progress

- [x] Availability board by block with sales position
- [x] Reservations with a buyer and hold days
- [x] Contract wizard (price, discount, deposit, payment option, term) and contract page with activation and schedule
- [x] Portal purchase plan and schedule
- [x] Price lists page: lists by property with their lines, a new list starts from the one in force and can retire it (lists are never edited in place)
- [x] Reservations list with buyer, fee paid or not, days left on the hold and a status filter
- [x] Milestone release from the contract schedule, behind a confirmation
- [x] Payment plan changes on the contract page: propose a new plan (instalments or one balance payment), approval through the central inbox, buyer acceptance by code at the office; plan history
- [x] Portal: the buyer sees an approved new plan and accepts it; handover date and snag status on the purchase card
- [x] Handover panel: book, keys and items, walk-through checklist, snags (closable after completion), completion with the unit's meter readings
- [x] Title panel: the estate's stages in order with status, date, reference and notes
- [ ] Purchase and completion statements as PDF (waits on the API export, wave 2.1)
- [ ] Gaps from the 2026-10-09 audit: see "Gaps found by the 2026-10-09 audit" in [README.md](README.md) (S3 line)

## Rules to apply

Standing rules in [README.md](README.md), plus:

| Scenario | Rule | Memory file |
|---|---|---|
| Multi-step wizards | Modal or sheet width scales with content; keep step state in one place | `feedback_modal_width_scales_with_content.md` |
| Money figures | Exact figures, the schedule total always equals net price | `feedback_exact_figures_in_client_docs.md` |
| Dates | Calendar-day arithmetic, never hours divided by 24 | `boi-guest-house-hotel-live-bugs-lost-found-bi-2026-09-19.md` |
