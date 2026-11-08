# Notification tasks
## Visitor recommendations
- [x] Add a public preferences page linked from Explore and recommend only public, registered places using AI Gateway.
- [x] Validate preferences and model results; preserve input on errors and support cancellation.
- [x] Run recommendation tests (22 passed) and verify a real visitor request through the UI (HTTP 200, three recommendations and detail navigation).

## Monitoring
- [x] Add production-only Sentry with privacy filtering and a reload fallback.
- [x] Add Vercel Analytics and Speed Insights with sanitized URLs; allow Sentry in CSP.
- [x] Run monitoring privacy tests (15 passed) and verify preview health and reload recovery.
- [ ] Verify production telemetry delivery — requires VITE_SENTRY_DSN and Vercel Analytics/Speed Insights enabled in hosting.

- [x] Add admin coupon visibility switch and apply visibility to user coupon lists.
- [x] Test coupon visibility persistence and filtering (4 tests passed).
- [ ] Verify coupon switch through authenticated admin UI — blocked by externally managed Supabase without an available authenticated browser session.
- [x] Remove existing delivered notifications requested by the administrator (3 removed).
- [x] Persist test and regular sends in complete admin history, linked to deliveries.
- [x] Ensure deleting a history entry atomically removes every delivery (database verified).
- [x] Run service tests (4 passed) and check preview errors (build OK).
- [ ] Verify authenticated sending and history readback through the UI — blocked by externally managed Supabase without an available authenticated browser session.