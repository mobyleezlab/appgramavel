## Análise da página Admin Explorar hoje

A página atual (`src/admin/pages/Explore.tsx`) tem 4 blocos simples e estáticos:

1. **Categorias** — só badges com contagem de estabelecimentos por categoria
2. **Populares agora** — tabela com 6 estabelecimentos com `is_popular=true` + switch para alternar
3. **Buscas Frequentes** — top 20 da tabela `search_queries`, ordenado por `results` (nº de resultados retornados, não por frequência da busca)
4. **Experiências** — CRUD básico (sem reorder, sem editar, sem preview da imagem, sem descrição visível)

### Limitações principais

1. **Zero KPIs / overview** — não há números agregados sobre uso da página Explorar
2. **Sem dados de comportamento real** — a página Explorar do app dispara muitas ações (clique em categoria, uso de filtros, abrir mapa, busca, abrir card popular/recomendado/próximo) e nada disso é medido aqui
3. **"Buscas Frequentes" engana** — está ordenado por `results` (quantidade que a busca retornou), não por **frequência**. Buscas zero-resultados (oportunidade de conteúdo!) ficam invisíveis
4. **Categorias é só contagem estática** — não mostra qual categoria é mais clicada/buscada, qual converte para visita ao estabelecimento, se há categoria sub-representada vs. demanda
5. **Populares é manual e sem critério** — admin marca/desmarca no olho, sem ver impressões, cliques, reações ou rating médio do candidato
6. **Filtros do app são invisíveis** — "Perto de você", "Abertos agora", "Pet friendly" etc. não têm telemetria; admin não sabe qual filtro o público usa
7. **Experiências sem métricas** — não dá pra saber se a experiência X é vista/clicada
8. **Sem comparação temporal** — nada vs. semana/mês anterior
9. **Sem ações úteis ao lado do dado** — ex.: ver busca sem resultado e poder criar conteúdo/cupom/destaque a partir dali
10. **Sem "lugares Novo"** — categoria com many "Novo" (sem reviews) é onde precisa empurrar check-ins

---

## O que vou construir

Estrutura nova em 6 blocos, todos com seletor de período no topo (**7 / 30 / 90 dias / Tudo**), espelhando o padrão do Admin Feed.

### 1. KPIs do Explorar (6 cards com delta vs. período anterior)
- **Sessões na Explorar** (impressões da rota `/map`) — instrumentar
- **Buscas realizadas** (linhas em `search_queries` no período)
- **Buscas sem resultado** (`results = 0`) — destaque vermelho se >0
- **Cliques em categoria** (novo evento)
- **Cliques em estabelecimento via Explorar** (novo evento `explore_click`)
- **Conversão busca → clique** (% buscas que tiveram pelo menos 1 clique em resultado)

### 2. Performance por Categoria (substitui badges atuais)
Tabela rica com:
- Nome + ícone
- Total de estabelecimentos
- % com fotos / cupons ativos / reviews (sinal de saúde do catálogo)
- Cliques no chip de categoria (do app)
- Buscas relacionadas (match por LIKE no termo)
- CTA: "Ver estabelecimentos desta categoria" → filtra `/admin/estabelecimentos`

Insight gerado: "Categoria X tem alta demanda mas baixo catálogo".

### 3. Buscas — visão completa (substitui card atual)
Duas colunas:
- **Top buscas (frequência)** — agrupadas por `query`, com `count(*)` no período. Hoje a query usa `results desc` o que está semanticamente errado.
- **Buscas sem resultado** — `results = 0`, agrupadas, com botão "Criar conteúdo" (abre form de novo estabelecimento pré-preenchendo `name = query`)

Cada item mostra: termo, nº de vezes, última ocorrência, taxa de zero-resultado.

### 4. Filtros mais usados (novo)
Bar chart horizontal: cada `FILTER_CHIPS` da Explorar (Perto de você, Abertos agora, Mais bem avaliados, Em alta hoje, Pet friendly, Com cupons) com nº de ativações no período. Requer instrumentar `analytics.track('explore_filter', { label })` em `toggleFilter`.

### 5. Curadoria de "Populares agora" (substitui tabela atual, mantém switch)
Tabela com candidatos ranqueados por **score real** = (cliques + reações + check-ins, normalizados) nos últimos 30d, mostrando:
- Thumbnail + nome + categoria
- Rating + nº reviews
- Cliques (Explorar) / Reações / Check-ins no período
- Score
- Switch `is_popular` (mantém comportamento atual)
- Indicador: "Sugerido" se score alto e não-popular; "Reavaliar" se popular e score baixo

### 6. Experiências com métricas + UX melhor
Manter CRUD, mas adicionar:
- **Preview** da imagem (40x40) na tabela
- Coluna **descrição** truncada
- Coluna **impressões/cliques** (instrumentar `experience_view` / `experience_click`)
- Botões reorder ↑↓ (alterando `sort_order`)
- Botão **editar** (abre Sheet com formulário completo: title, description, image_url, sort_order)
- Form de criação atual: adicionar campo descrição; preview ao colar URL

### 7. Insights automáticos (card final, padrão do Feed)
Até 3 frases dinâmicas, ex.:
- "12 buscas por 'fondue' sem resultado nos últimos 30 dias — considere cadastrar."
- "Filtro 'Pet friendly' ativado 240×, mas só 4 estabelecimentos são pet friendly."
- "Categoria 'Cafés' lidera em cliques mas tem rating médio abaixo da média."

---

## Mudanças técnicas

### Instrumentação (em `src/lib/analytics.ts` já existe `track()`)
Disparar novos eventos na **app mobile** (chamadas pequenas, sem alterar visual):
- `src/pages/Explore.tsx` — `track('explore_filter', { label })` no `toggleFilter`; `track('explore_view')` no mount; `track('explore_card_click', { id, source: 'popular'|'recomendado'|'nearby'|'search' })` nos cliques de card
- `src/pages/ExploreCategory.tsx` — `track('explore_category_click', { category })` no mount/navegação
- `src/components/feed/PostCard` ou onde já existe — não tocar
- Para experiências: `track('experience_view'|'experience_click', { id })`

Eventos vão para tabela existente `feed_events` (reutilizando `event_type` + payload em `metadata` jsonb se existir) **ou** criar nova tabela `explore_events(id, event_type, metadata jsonb, user_id, created_at)` se `feed_events` não comportar. Verificarei o schema antes; preferência: reusar `feed_events` adicionando os novos `event_type`.

### `src/admin/services/adminAnalytics.ts` — novas funções
- `getExploreKPIs(period)` — sessões, buscas, zero-resultados, cliques categoria, cliques estab via explorar, taxa conversão; com deltas
- `getCategoryPerformance(period)` — agrega clicks de categoria + match com search_queries + saúde do catálogo (cupons/fotos/reviews)
- `getSearchInsights(period)` — top frequência (group by query) + zero-result list
- `getExploreFilterUsage(period)` — group by `metadata->>label` em eventos `explore_filter`
- `getPopularCandidates(days=30)` — score por estabelecimento (cliques+reações+check-ins normalizados), com `is_popular` atual
- `getExperiencesPerformance(period)` — joinwith eventos `experience_*`
- `getExploreInsights(period)` — gera as 2-3 frases

### `src/admin/pages/Explore.tsx` — reescrita completa
- Header com seletor de período (mesma UX do Admin Feed)
- Grid 6 KPIs com `StatCard` + delta (mesmo wrapper usado no Feed)
- Seções 2–7 conforme acima
- Manter `togglePopular` e CRUD de experiências; melhorar form (Sheet com `description` + `image_url` preview)
- Reordenação de experiências via setas (update `sort_order` em transação)

### Layout (desktop, `min-w-[1024px]`)
```text
[ Filtro de período ]
[ KPI ][ KPI ][ KPI ][ KPI ][ KPI ][ KPI ]
[ Performance por Categoria (col-span-2) ][ Insights ]
[ Top buscas ][ Buscas sem resultado ]
[ Filtros mais usados (full width bar chart) ]
[ Curadoria de Populares (full width) ]
[ Experiências (full width, com métricas + edit Sheet) ]
```

### Sem alterações em
- Schema do banco (a menos que `feed_events.metadata` não exista — nesse caso, migration mínima adicionando coluna `metadata jsonb`)
- Visual da página Explorar do app — apenas instrumentação de eventos
- Outras páginas do admin
