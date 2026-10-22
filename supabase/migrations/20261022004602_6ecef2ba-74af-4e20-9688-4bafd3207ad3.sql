DELETE FROM public.notifications;

ALTER TABLE public.notifications ADD COLUMN campaign_id uuid REFERENCES public.admin_notifications(id) ON DELETE CASCADE;
CREATE INDEX notifications_campaign_id_idx ON public.notifications(campaign_id);

CREATE OR REPLACE FUNCTION public.dispatch_admin_notification(p_notification_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  campaign public.admin_notifications%ROWTYPE;
  recipients integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente administradores podem enviar notificações' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO campaign FROM public.admin_notifications WHERE id = p_notification_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Notificação não encontrada'; END IF;
  IF campaign.sent THEN RAISE EXCEPTION 'Notificação já enviada'; END IF;

  INSERT INTO public.notifications(user_id, title, body, type, image_url, redirect_type, redirect_url, reference_id, campaign_id)
  SELECT profile.id, campaign.title, campaign.body, COALESCE(campaign.type, 'system'), campaign.image_url,
    campaign.redirect_type, campaign.redirect_url, COALESCE(campaign.reference_id, campaign.id), campaign.id
  FROM public.user_profiles profile
  WHERE
    COALESCE(campaign.target, 'all') = 'all'
    OR (campaign.target = 'ids' AND profile.id = ANY(campaign.target_ids))
    OR (campaign.target = 'segment' AND (
      (campaign.segment = 'city:Gramado' AND profile.city = 'Gramado')
      OR (campaign.segment = 'city:Canela' AND profile.city = 'Canela')
      OR (campaign.segment = 'engagement:active7' AND profile.last_seen_at >= now() - interval '7 days')
      OR (campaign.segment = 'engagement:active30' AND profile.last_seen_at >= now() - interval '30 days')
      OR (campaign.segment = 'engagement:inactive30' AND (profile.last_seen_at IS NULL OR profile.last_seen_at < now() - interval '30 days'))
    ));
  GET DIAGNOSTICS recipients = ROW_COUNT;
  IF recipients = 0 THEN RAISE EXCEPTION 'Nenhum usuário encontrado para este envio'; END IF;
  UPDATE public.admin_notifications SET sent = true, sent_at = now() WHERE id = campaign.id;
  RETURN recipients;
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_admin_notification(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_admin_notification(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';