# Architecture rules
- Keep coupon visibility separate from lifecycle status; filter user queries and enforce visibility in database access policies so disabling preserves expiration and usage history.
- Link delivered admin notifications to their campaign with a cascading foreign key; send campaigns through an admin-validated database function so history and deliveries remain consistent.