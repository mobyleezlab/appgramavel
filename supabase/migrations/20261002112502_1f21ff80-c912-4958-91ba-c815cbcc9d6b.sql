CREATE OR REPLACE FUNCTION public.admin_user_activity_counts(_uid uuid)
RETURNS TABLE(saved_places int, checkins int, coupons int, reactions int, favorite_folders int, reviews_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.user_favorites WHERE user_id = _uid)::int,
    (SELECT count(*) FROM public.check_ins WHERE user_id = _uid)::int,
    (SELECT count(*) FROM public.user_coupons WHERE user_id = _uid)::int,
    (SELECT count(*) FROM public.user_reactions WHERE user_id = _uid)::int,
    (SELECT count(*) FROM public.favorite_folders WHERE user_id = _uid)::int,
    (SELECT count(*) FROM public.reviews WHERE user_id = _uid)::int
  WHERE public.is_admin();
$$;
REVOKE ALL ON FUNCTION public.admin_user_activity_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_activity_counts(uuid) TO authenticated;

DROP VIEW IF EXISTS public.admin_users_view;
CREATE VIEW public.admin_users_view WITH (security_invoker = on) AS
SELECT
  p.id, p.name, p.email, p.avatar_url, p.city, p.state, p.country, p.phone,
  p.birth_date, p.gender,
  CASE p.gender WHEN 'male' THEN 'Masculino' WHEN 'female' THEN 'Feminino'
                WHEN 'other' THEN 'Outro' WHEN 'prefer_not_to_say' THEN 'Prefiro não informar' ELSE 'Não informado' END AS gender_label,
  CASE WHEN p.birth_date IS NULL THEN NULL ELSE date_part('year', age(p.birth_date))::int END AS age,
  CASE
    WHEN p.birth_date IS NULL THEN NULL
    WHEN date_part('year', age(p.birth_date)) < 18 THEN '<18'
    WHEN date_part('year', age(p.birth_date)) < 25 THEN '18-24'
    WHEN date_part('year', age(p.birth_date)) < 35 THEN '25-34'
    WHEN date_part('year', age(p.birth_date)) < 45 THEN '35-44'
    WHEN date_part('year', age(p.birth_date)) < 60 THEN '45-59'
    ELSE '60+' END AS age_group,
  p.is_active, p.created_at, p.last_seen_at,
  CASE
    WHEN p.last_seen_at >= now() - interval '1 day' THEN 'online_today'
    WHEN p.last_seen_at >= now() - interval '7 days' THEN 'active_week'
    WHEN p.last_seen_at >= now() - interval '30 days' THEN 'active_month'
    WHEN p.last_seen_at IS NULL THEN 'never'
    ELSE 'inactive' END AS activity_status,
  p.travel_since,
  c.saved_places, c.checkins, c.coupons, 0::int AS routes, c.reactions, c.favorite_folders, c.reviews_count
FROM public.user_profiles p
LEFT JOIN LATERAL public.admin_user_activity_counts(p.id) c ON true
WHERE public.is_admin();

REVOKE ALL ON public.admin_users_view FROM anon;
GRANT SELECT ON public.admin_users_view TO authenticated;
GRANT ALL ON public.admin_users_view TO service_role;
NOTIFY pgrst, 'reload schema';