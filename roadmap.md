# Notification tasks
- [x] Remove existing delivered notifications requested by the administrator (3 removed).
- [x] Persist test and regular sends in complete admin history, linked to deliveries.
- [x] Ensure deleting a history entry atomically removes every delivery (database verified).
- [x] Run service tests (4 passed) and check preview errors (build OK).
- [ ] Verify authenticated sending and history readback through the UI — blocked by externally managed Supabase without an available authenticated browser session.