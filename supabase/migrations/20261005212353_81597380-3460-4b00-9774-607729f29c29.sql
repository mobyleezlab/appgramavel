DROP POLICY IF EXISTS reactions_select ON public.reactions;
CREATE POLICY reactions_select ON public.reactions FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = reactions.post_id));

DROP POLICY IF EXISTS reviews_select ON public.reviews;
CREATE POLICY reviews_select ON public.reviews FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = reviews.establishment_id));