-- ⚠️ Execute este SQL no Supabase SQL Editor antes de usar a nova UI de Roteiros
-- Painel: https://supabase.com/dashboard/project/smbbeqvaesbkqygxnmxf/sql/new

ALTER TABLE public.user_routes
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS estimated_duration_min integer,
  ADD COLUMN IF NOT EXISTS estimated_distance_km numeric;

CREATE OR REPLACE FUNCTION public.start_user_route(p_route_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid);
  IF NOT EXISTS (
    SELECT 1 FROM public.user_routes
    WHERE id = p_route_id AND (user_id = v_user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Roteiro não encontrado');
  END IF;
  UPDATE public.user_routes
  SET status = 'in_progress',
      started_at = COALESCE(started_at, now()),
      completed_at = NULL,
      updated_at = now()
  WHERE id = p_route_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.clone_suggested_route(p_route_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_new_id  uuid;
  v_title   text;
  v_desc    text;
  v_cover   text;
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid);
  SELECT title, description, image_url INTO v_title, v_desc, v_cover
  FROM public.routes WHERE id = p_route_id;
  IF v_title IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Roteiro sugerido não encontrado');
  END IF;
  INSERT INTO public.user_routes (user_id, title, description, cover_url, status)
  VALUES (v_user_id, v_title || ' (cópia)', v_desc, v_cover, 'saved')
  RETURNING id INTO v_new_id;
  INSERT INTO public.user_route_stops (user_route_id, establishment_id, stop_order)
  SELECT v_new_id, rs.establishment_id, rs.stop_order
  FROM public.route_stops rs
  WHERE rs.route_id = p_route_id
  ORDER BY rs.stop_order;
  RETURN jsonb_build_object('success', true, 'user_route_id', v_new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_user_route_stops(
  p_user_route_id uuid,
  p_establishment_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_id      uuid;
  i         integer := 1;
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid);
  IF NOT EXISTS (
    SELECT 1 FROM public.user_routes
    WHERE id = p_user_route_id AND (user_id = v_user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Roteiro não encontrado');
  END IF;
  DELETE FROM public.user_route_stops WHERE user_route_id = p_user_route_id;
  FOREACH v_id IN ARRAY p_establishment_ids LOOP
    INSERT INTO public.user_route_stops (user_route_id, establishment_id, stop_order)
    VALUES (p_user_route_id, v_id, i);
    i := i + 1;
  END LOOP;
  UPDATE public.user_routes SET updated_at = now() WHERE id = p_user_route_id;
  RETURN jsonb_build_object('success', true, 'count', i - 1);
END;
$$;
