# Fechar brechas de segurança

A análise encontrou 17 alertas (nenhum crítico). Plano por prioridade:

## 1. Corrigir (riscos reais)
- **Uploads de mídia (`media_uploads`) legíveis por qualquer pessoa**: restringir leitura a administradores (só o painel admin usa esse registro; as imagens em si continuam visíveis no app).
- **Eventos do feed e buscas (`feed_events`, `search_queries`)**: hoje um usuário logado pode gravar registros em nome de outro. Exigir que o registro seja do próprio usuário (ou anônimo, sem usuário).
- **Funções internas que qualquer pessoa pode executar**: tirar a permissão pública das funções de uso administrativo/gatilhos (ex.: excluir usuário, contadores do admin, gatilhos de login), mantendo apenas o que o app realmente chama.
- **Curtidas (`user_reactions`, `photo_reactions`)**: você pediu que continuem visíveis; mantenho o comportamento, mas limito a leitura ao necessário para contagem e marco o alerta como intencional.

## 2. Manter e marcar como intencional (conteúdo público do app)
Lugares, fotos, posts, roteiros sugeridos, banners, selos, experiências, regras de cupons, contagem de reações e o registro do keep-alive são conteúdo público por natureza. O telefone dos estabelecimentos é comercial e público.

## 3. Depende de você
- **Senhas vazadas**: a proteção só pode ser ligada no painel do Supabase (plano Pro). Vou explicar o passo a passo.

## Detalhes técnicos
- Migration com novas policies: `media_uploads` SELECT via `is_admin()`; `feed_events`/`search_queries` INSERT com `user_id IS NULL OR user_id = auth.uid()`.
- `REVOKE EXECUTE ... FROM anon, authenticated` em funções SECURITY DEFINER não chamadas pelo cliente; conferir com `rg` quais RPCs o frontend usa antes de revogar.
- Rodar linter e novo scan; marcar corrigidos e ignorar os intencionais com justificativa.
- Verificar build e testes existentes.
