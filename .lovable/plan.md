## Situação atual

`src/admin/pages/Routes.tsx` é uma tela passiva: lista os `routes` sugeridos com switch de destaque, lista banners e mostra um único insight ("mais completados"). Não permite **criar/editar roteiros**, não tem **paradas editáveis**, não mostra **engajamento real** (cliques, salvamentos, conclusões, taxa de abandono) e não há **personalização** por gosto do usuário. O app já consome `routes` + `route_stops` (tabelas com RLS de admin), e os usuários geram dados em `user_routes` / `user_route_stops` — fonte rica e ainda não explorada no admin.

## O que vou construir

Mesma estrutura visual do Admin Feed/Explore (seletor de período + grid de KPIs + cards), em 6 blocos:

### 1. Cabeçalho com período (7 / 30 / 90 / Tudo)
Idêntico ao padrão do Feed para consistência.

### 2. KPIs (6 cards com delta vs. período anterior)
- Roteiros sugeridos ativos (total `routes`)
- Roteiros iniciados pelos usuários (`user_routes` no período)
- Taxa de conclusão (% `completed` / iniciados)
- Tempo médio para concluir (started_at → completed_at)
- Roteiros personalizados criados (user_routes sem vínculo a `routes` sugerido)
- Paradas visitadas via roteiro (check-ins disparados durante roteiro ativo)

### 3. Performance dos Roteiros Sugeridos (substitui tabela atual)
Tabela rica com:
- Thumbnail + título + duração + dificuldade
- Nº de paradas
- **Iniciados** / **Concluídos** / **Taxa de conclusão**
- **Abandonos** (status `in_progress` há >7 dias)
- Switch destaque
- Ações: **Editar** (abre Sheet), **Duplicar**, **Excluir**

### 4. Editor de Roteiros (NOVO — Sheet/dialog)
Botão "+ Novo Roteiro" no cabeçalho do bloco 3. Sheet em 3 etapas espelhando o wizard do app, mas em layout desktop:

1. **Dados básicos**: título, subtítulo, descrição, duração, dificuldade (Fácil/Moderado/Difícil), ícone (lucide picker), upload de capa (`establishments` bucket, reaproveitando `ImageUploadCrop`), `is_featured`.
2. **Paradas**: busca de estabelecimentos (mesma lista usada em Establishments), painel esquerdo = catálogo com filtro por categoria, painel direito = paradas selecionadas com **drag-and-drop** (`@dnd-kit/core` já presente) para definir `stop_order` e campo `note` por parada.
3. **Revisão + publicar**: preview da ordem, mapa estático das paradas (mini Leaflet read-only), botão Salvar.

Salva em transação: `routes` + `route_stops` (delete+insert no edit).

### 5. Roteiros Personalizados dos Usuários (NOVO)
Tabela read-only com `user_routes` no período:
- Usuário (avatar + nome)
- Título do roteiro personalizado
- Nº de paradas / visitadas
- Status (saved / in_progress / completed) com `StatusBadge`
- Data criação / conclusão
- Ação: "Promover a sugerido" → cria um `routes` espelho com mesmas paradas

Insight extra: as **combinações de categorias** mais escolhidas pelos usuários (ex: "Café + Mirante + Restaurante" — 18 vezes), surfacing oportunidades de roteiros oficiais.

### 6. Sugestões Personalizadas por Gosto (NOVO — engine simples)
Card com **roteiros sugeridos automaticamente** baseados em sinais reais:
- Top categorias por cliques/check-ins/favoritos no período
- Estabelecimentos com maior score (cliques + reações + reviews)
- Agrupa por proximidade geográfica (≤2km entre paradas) usando lat/lng
- Output: 3 sugestões prontas ("Tour Cafés Especiais — Centro de Gramado", 4 paradas) com botão **"Criar este roteiro"** que abre o editor pré-preenchido

### 7. Banners de Destaque (mantém atual + melhorias)
- Adicionar **upload de imagem**, vínculo opcional a `routes` (FK `route_id` já existe), reorder via drag-and-drop e contador de cliques (instrumentar `track('route_banner_click', { id })` em `Roteiros.tsx`).

### 8. Insights Automáticos (card final)
2-3 frases dinâmicas, ex.:
- "Roteiro X tem 80% de abandono — revise duração ou paradas."
- "12 usuários criaram roteiros com 'Cafés + Mirantes' — considere oficializar."
- "Roteiro Y nunca foi iniciado nos últimos 30 dias."

## Mudanças técnicas

### Instrumentação no app (`src/pages/Roteiros.tsx`, `RoteiroDetail.tsx`, `RoteiroNavigation.tsx`)
Eventos via `feed_events` (mesmo padrão do Explore):
- `route_view:<route_id>`, `route_start:<route_id>`, `route_complete:<route_id>`, `route_banner_click:<id>`, `route_stop_visited:<route_id>`

Sem alteração visual.

### `src/admin/services/adminRoutes.ts` (NOVO)
- `listRoutesPerformance(period)` — joins `routes` + `route_stops` + agregação `user_routes` por título
- `listUserRoutes(period)` — `user_routes` + `user_route_stops` + perfil
- `createRoute(payload, stops[])` / `updateRoute(id, payload, stops[])` / `deleteRoute(id)` / `duplicateRoute(id)`
- `promoteUserRouteToSuggested(user_route_id)`
- `getPersonalizedSuggestions(period)` — algoritmo de score+proximidade
- `getRouteKPIs(period)` com deltas
- `getRouteAdminInsights(period)` — gera as frases

### `src/admin/pages/Routes.tsx` — reescrita
Layout desktop:
```text
[ Período ]
[ KPI ][ KPI ][ KPI ][ KPI ][ KPI ][ KPI ]
[ Performance dos Roteiros (full)            ]   [+ Novo]
[ Sugestões personalizadas ][ Insights        ]
[ Roteiros dos usuários (full)                ]
[ Banners (com upload + reorder)              ]
```

### Sem mudanças no schema
Reusa `routes`, `route_stops`, `user_routes`, `user_route_stops`, `feed_events`, `route_banners`. Nenhuma migration necessária.

### Sem alterações no app mobile
Apenas adição de chamadas `track()` (sem mudança visual).
