# UI sprint 3: sales and instalments

| Item | Detail | Demo |
|---|---|---|
| Availability board | Units by block coloured by sale status, price on hover or tap | Yes |
| Price lists | By unit type and phase with effective dates | Yes |
| Reservations | Reserve with fee and expiry countdown | Yes |
| Sale contracts | Wizard: unit, buyers, price and discount, payment option, deposit, term, advocates; activate | Yes |
| Schedule | Generated schedule table with status per instalment; restructure proposal | Schedule only |
| Purchase statement | Price, payments with receipts, balance, schedule; PDF | Yes |
| Handover and title | Checklist, snags, readings, keys; title stages | After demo |
| Portal | Purchase plan card and statement for buyers | Yes |

## Progress

- [x] Availability board by block with sales position
- [x] Reservations with a buyer and hold days
- [x] Contract wizard (price, discount, deposit, payment option, term) and contract page with activation and schedule
- [x] Portal purchase plan and schedule
- [ ] Price list editor (seeded for the demo), restructure, handover and title (after demo)

## Rules to apply

Standing rules in [README.md](README.md), plus:

| Scenario | Rule | Memory file |
|---|---|---|
| Multi-step wizards | Modal or sheet width scales with content; keep step state in one place | `feedback_modal_width_scales_with_content.md` |
| Money figures | Exact figures, the schedule total always equals net price | `feedback_exact_figures_in_client_docs.md` |
| Dates | Calendar-day arithmetic, never hours divided by 24 | `boi-guest-house-hotel-live-bugs-lost-found-bi-2026-09-19.md` |
