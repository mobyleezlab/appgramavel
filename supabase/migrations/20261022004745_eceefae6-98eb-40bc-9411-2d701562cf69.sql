DO $$
DECLARE
  test_campaign uuid;
  recipient_count integer;
BEGIN
  INSERT INTO public.admin_notifications(title, body, sent) VALUES ('Verificação interna de exclusão', 'Verificação transacional', true) RETURNING id INTO test_campaign;
  INSERT INTO public.notifications(user_id, title, body, type, campaign_id)
    SELECT id, 'Verificação interna de exclusão', 'Verificação transacional', 'system', test_campaign FROM public.user_profiles;
  GET DIAGNOSTICS recipient_count = ROW_COUNT;
  IF recipient_count = 0 THEN RAISE EXCEPTION 'Não há destinatários para validar a exclusão'; END IF;
  DELETE FROM public.admin_notifications WHERE id = test_campaign;
  IF EXISTS (SELECT 1 FROM public.notifications WHERE campaign_id = test_campaign) THEN
    RAISE EXCEPTION 'A exclusão não removeu todas as entregas';
  END IF;
  BEGIN
    PERFORM public.dispatch_admin_notification(test_campaign);
    RAISE EXCEPTION 'Envio sem administrador não foi bloqueado';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;