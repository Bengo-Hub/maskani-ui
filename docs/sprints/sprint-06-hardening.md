# UI sprint 6: hardening and launch

| Item | Detail |
|---|---|
| Accessibility | WCAG 2.2 AA automated (axe) and manual checks on console, portal and gate |
| Performance | Portal initial transfer under 200 KB excluding images, LCP under 2.5 s on a mid-range Android over 3G |
| Offline gate test | Network removed for 2 hours; verify from cache, queue, sync without loss |
| Cross-browser | Android Chrome, iOS Safari, desktop for owner, buyer, caretaker, guard, vendor and finance journeys (Playwright) |
| UAT fixes | From Shaba staff and pilot owners |
| Docs capture | Service guide screenshots following the established docs-capture pattern |

## Progress

- [ ] Not started (2026-10-08).

## Rules to apply

Standing rules in [README.md](README.md), plus `pos-service-guide-2026-09-10.md` for docs capture and
`e2e-testing-and-data-cleanup.md` for reusing demo fixtures instead of creating throwaway data.
