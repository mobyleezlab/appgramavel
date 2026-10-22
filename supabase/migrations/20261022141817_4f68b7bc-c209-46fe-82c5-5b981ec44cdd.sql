ALTER TABLE public.coupons ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER POLICY coupons_select ON public.coupons USING (is_active OR public.is_admin());
NOTIFY pgrst, 'reload schema';