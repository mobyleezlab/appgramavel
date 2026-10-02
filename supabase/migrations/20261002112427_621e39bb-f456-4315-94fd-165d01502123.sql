DROP VIEW IF EXISTS public.admin_users_view;

CREATE VIEW public.admin_users_view AS
SELECT
  p.id, p.name, p.email, p.avatar_url, p.city, p.state, p.country, p.phone,
  p.birth_date, p.gender,
  CASE p.gender WHEN 'male' THEN 'Masculino' WHEN 'female' THEN 'Feminino'
                WHEN 'other' THEN 'Outro' WHEN 'prefer_not_to_say' THEN 'Prefiro não informar' ELSE 'Não informado' END AS gender_label,
  CASE WHEN p.birth_date IS NULL THEN NULL
       ELSE date_part('year', age(p.birth_date))::int END AS age,
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
  (SELECT count(*) FROM public.user_favorites f WHERE f.user_id = p.id)::int AS saved_places,
  (SELECT count(*) FROM public.check_ins c WHERE c.user_id = p.id)::int AS checkins,
  (SELECT count(*) FROM public.user_coupons uc WHERE uc.user_id = p.id)::int AS coupons,
  0::int AS routes,
  (SELECT count(*) FROM public.user_reactions r WHERE r.user_id = p.id)::int AS reactions,
  (SELECT count(*) FROM public.favorite_folders ff WHERE ff.user_id = p.id)::int AS favorite_folders,
  (SELECT count(*) FROM public.reviews rv WHERE rv.user_id = p.id)::int AS reviews_count
FROM public.user_profiles p
WHERE EXISTS (
  SELECT 1 FROM public.admin_roles a
  WHERE a.user_id = auth.uid() AND a.is_active = true
);

REVOKE ALL ON public.admin_users_view FROM anon;
GRANT SELECT ON public.admin_users_view TO authenticated;
GRANT ALL ON public.admin_users_view TO service_role;

NOTIFY pgrst, 'reload schema';