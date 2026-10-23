CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN coalesce(auth.jwt()->>'aal', '') = 'aal2' AND EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN coalesce(auth.jwt()->>'aal', '') = 'aal2' AND EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
  );
END;
$$;

DROP POLICY IF EXISTS admin_roles_select_own ON public.admin_roles;
CREATE POLICY admin_roles_select_own ON public.admin_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());