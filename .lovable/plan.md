## Situação atual

`src/admin/pages/Notifications.tsx` tem só duas abas: **Manual** (form simples: título/corpo/imagem/target) e **Histórico** (tabela básica com botão "Enviar"). O serviço (`adminNotifications.ts`) cria registro em `admin_notifications` e, ao enviar, faz fan-out copiando para `notifications` de cada usuário em `user_profiles`. Limitações:

- Sem KPIs (alcance, leitura, CTR, falhas)
- Sem segmentação real (apenas `all`)
- Sem agendamento (`scheduled_at` existe na tabela mas não é usado)
- Sem deep link configurável (campos `redirect_url`/`redirect_type` existem mas não são preenchidos)
- Sem preview, sem templates, sem teste para si mesmo
- Sem push real — só notificação in-app via tabela `notifications`
- Histórico não mostra desempenho da notificação enviada
- Sem padrão visual (Período, KPIs, Insights) das outras telas admin (Feed, Explore, Routes)

## O que vou construir

Mantendo o padrão visual do admin (Período + KPIs + cards):

### 1. Cabeçalho com seletor de período (7 / 30 / 90 / Tudo)

### 2. KPIs (6 cards com delta)
- Notificações enviadas no período
- Alcance total (linhas em `notifications` resultantes de envios admin)
- Taxa de leitura (% `read=true` / alcance)
- CTR — clique em deep link (instrumentado via `feed_events`: `notification_click:<id>`)
- Agendadas pendentes (`scheduled_at > now() AND sent=false`)
- Usuários ativos elegíveis (perfis com `last_seen_at` ≤ 30d)

### 3. Composer (substitui "Manual") — Sheet/Card com layout 2 colunas

**Coluna esquerda (formulário em seções)**:
- **Conteúdo**: tipo (system/promo/badge/coupon/nearby/trending), título (máx 60), corpo (máx 180), upload de imagem (`establishments` bucket via `ImageUploadCrop`)
- **Ação ao tocar**: select com opções
  - Nenhuma
  - Abrir tela interna (select de rotas: Feed, Explorar, Cupons, Roteiros, Estabelecimento específico, Cupom específico)
  - Abrir URL externa
  → preenche `redirect_type` + `redirect_url`
- **Audiência**:
  - Todos
  - Por cidade (Gramado/Canela — usa `user_profiles.city`)
  - Por engajamento (ativos 7d, ativos 30d, inativos 30d+)
  - Por interesse (categorias com mais favoritos/check-ins do usuário — query em `user_favorites` + `check_ins`)
  - Lista manual (multi-select com busca de usuários)
  → preenchimento de `segment` + `target_ids[]`, mostra contagem **estimada** em tempo real
- **Quando enviar**:
  - Agora
  - Agendar (date+time picker → grava `scheduled_at`)
- **Canal** (chips):
  - In-app (sempre)
  - Push Web (se `web-push` habilitado — ver seção 7)
- Botões: **Enviar teste para mim**, **Salvar rascunho**, **Agendar/Enviar**

**Coluna direita — Preview ao vivo**:
- Mock do `NotificationsSheet` mobile com avatar/icon + título + corpo + tempo "agora" — atualiza enquanto digita
- Avisos: "Título muito longo", "Sem ação configurada", "Audiência estimada: 312 usuários"

### 4. Templates (NOVO)
Card com 5-6 templates pré-prontos clicáveis que pré-preenchem o composer:
- "Novo cupom disponível" (tipo coupon, deep link /coupons)
- "Você tem badge novo" (tipo badge)
- "Eventos no fim de semana" (promo, agenda)
- "Lugar próximo a você" (nearby — usa segmento por cidade)
- "Em alta esta semana" (trending, link Feed)

Salvos em `admin_notifications` como rascunhos com flag `type='template'` (reusa tabela existente, sem migration).

### 5. Histórico com performance (substitui tabela atual)
Tabela rica:
- Imagem mini + título
- Tipo (StatusBadge colorido)
- Audiência (texto: "Todos · 1.240" / "Gramado · 312")
- Status: Rascunho / Agendada (com data) / Enviando / Enviada / Falhou
- **Alcance / Lidas / CTR** (3 colunas com %)
- Agendada para / Enviada em
- Ações: **Ver detalhes**, **Duplicar**, **Cancelar agendamento**, **Reenviar para não-lidos**, **Excluir**

### 6. Drawer "Detalhes da Notificação"
Ao clicar em uma linha:
- Preview real
- Métricas: alcance, lidos, cliques, % por hora desde o envio (sparkline simples)
- Lista paginada dos destinatários com status (Lida/Não lida/Clicou)

### 7. Push Web (opcional, com fallback gracioso)

**Mobile app (PWA)**:
- Hook `usePushSubscription` que pede permissão (`Notification.requestPermission()`), registra Service Worker (`/sw.js` já existe) e cria PushSubscription com VAPID public key
- Salva subscription em nova tabela `push_subscriptions` (user_id, endpoint, p256dh, auth, user_agent, created_at) — **única migration necessária**
- Componente `PushOptIn` em Configurações: switch "Receber notificações" + estado (granted/denied/default)
- Service Worker (`public/sw.js`): handler `push` que mostra notificação e `notificationclick` que abre `redirect_url`

**Backend (Edge Function nova `send-push`)**:
- Input: `{ admin_notification_id }`
- Busca destinatários conforme segmento, suas `push_subscriptions`, dispara via biblioteca `web-push` com `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (secrets a configurar)
- Atualiza `admin_notifications.sent_at`, conta entregas/falhas
- Mantém in-app insert (atual) em paralelo

**Admin**:
- Banner no topo se VAPID secrets ausentes: "Push Web não configurado. Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY para habilitar."
- Se ausente, canal "Push Web" fica desabilitado e composer roda só in-app — **tudo funciona sem push**

### 8. Agendador (Edge Function `process-scheduled-notifications`)
- Roda via cron (Supabase scheduled function ou trigger manual via Settings)
- Busca `admin_notifications` com `scheduled_at <= now() AND sent=false`
- Chama `sendNotification` (in-app) + `send-push` (se aplicável)

### 9. Insights automáticos (card final)
2-3 frases dinâmicas:
- "Notificações tipo 'coupon' têm 2,3× mais cliques que 'system'."
- "Melhor janela de envio: 18h–20h (CTR 14%)."
- "12% dos usuários ativos não têm push habilitado — considere campanha de opt-in."

### 10. Instrumentação
- `notification_open:<id>` quando o sheet abre uma notificação
- `notification_click:<id>` no `handleClick` em `NotificationsSheet.tsx`
- Push: `notification_push_click:<id>` no SW

## Mudanças técnicas

### Schema (1 migration)
```sql
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
-- policies: user gerencia o próprio; admin lê tudo
```

Reusa colunas existentes em `admin_notifications`: `scheduled_at`, `sent`, `sent_at`, `target`, `segment`, `target_ids`, `redirect_url`, `redirect_type`, `image_url`, `reference_id`, `type`.

### Arquivos
- `src/admin/pages/Notifications.tsx` — reescrita
- `src/admin/services/adminNotifications.ts` — novos métodos: `getNotificationKPIs`, `getNotificationPerformance(id)`, `estimateAudience(segment, target_ids)`, `scheduleNotification`, `cancelScheduled`, `duplicateNotification`, `resendToUnread(id)`, `getNotificationInsights`
- `src/admin/components/NotificationComposer.tsx` (novo) — formulário 2 colunas
- `src/admin/components/NotificationPreview.tsx` (novo) — mock mobile
- `src/admin/components/NotificationDetailsDrawer.tsx` (novo)
- `src/lib/notificationsTracking.ts` (novo) — `trackNotification(event, id)`
- `src/components/layout/NotificationsSheet.tsx` — adicionar tracking
- `src/services/pushSubscriptions.ts` (novo) — opt-in/opt-out
- `src/pages/profile/Settings.tsx` — adicionar `PushOptIn`
- `public/sw.js` — handlers `push` + `notificationclick`
- `supabase/functions/send-push/index.ts` (nova edge function)
- `supabase/functions/process-scheduled-notifications/index.ts` (nova edge function)
- Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (pedir ao usuário gerar; documentar com `npx web-push generate-vapid-keys`)

### Sem alteração visual no app mobile
Apenas adição do toggle de push em Configurações + tracking. Notificações in-app continuam idênticas.

## Layout final do admin

```text
[ Período: 7 / 30 / 90 / Tudo ]
[ KPI ][ KPI ][ KPI ][ KPI ][ KPI ][ KPI ]
[ Composer 2-col (form | preview)        ] [+ Nova]
[ Templates (chips de cards)             ]
[ Histórico com performance (full)       ]
[ Insights automáticos                   ]
```
