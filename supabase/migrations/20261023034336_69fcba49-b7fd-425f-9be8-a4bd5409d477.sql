DROP POLICY IF EXISTS media_uploads_select ON public.media_uploads;

DROP POLICY IF EXISTS feed_events_insert ON public.feed_events;
CREATE POLICY feed_events_insert ON public.feed_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS search_queries_insert ON public.search_queries;
CREATE POLICY search_queries_insert ON public.search_queries FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Internal trigger functions: nobody should call them directly
REVOKE EXECUTE ON FUNCTION public.auto_grant_admin_on_login() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_login() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_check_in_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_avatar_url_from_storage() FROM PUBLIC, anon, authenticated;

-- Admin-only functions: signed-out visitors cannot call them
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_user_activity_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_activity_counts(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';