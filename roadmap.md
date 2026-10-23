# Notification tasks
- [x] Add admin coupon visibility switch and apply visibility to user coupon lists.
- [x] Test coupon visibility persistence and filtering (4 tests passed).
- [ ] Verify coupon switch through authenticated admin UI — blocked by externally managed Supabase without an available authenticated browser session.
- [x] Remove existing delivered notifications requested by the administrator (3 removed).
- [x] Persist test and regular sends in complete admin history, linked to deliveries.
- [x] Ensure deleting a history entry atomically removes every delivery (database verified).
- [x] Run service tests (4 passed) and check preview errors (build OK).
- [ ] Verify authenticated sending and history readback through the UI — blocked by externally managed Supabase without an available authenticated browser session.