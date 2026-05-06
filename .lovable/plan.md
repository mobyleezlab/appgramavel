## Diagnóstico

### Dashboard (`src/admin/pages/Dashboard.tsx`)
Hoje é uma tela "olá mundo": 6 contadores totais sem contexto temporal e um card placeholder ("Painel de atividade em tempo real será exibido aqui"). Problemas:
- Nenhum delta, tendência ou comparação entre períodos
- Não diferencia o que é importante (KPI primário) do que é estrutural (contagem total)
- Sem séries temporais, sem distribuição por cidade, sem alertas
- Não conversa com o trabalho já feito em Feed/Explore/Routes/Notifications (que têm seletor de período + KPIs + insights)
- "Atividade Recente" está vazia, mesmo já existindo dados em `feed_events`, `check_ins`, `reviews`, `posts`, `notifications`
- Grid `grid-cols-3` quebra com 6 itens no desktop largo (2 linhas com sobra)
- Sem navegação contextual: clicar num card não leva para a seção correspondente

### Estabelecimentos (`src/admin/pages/Establishments.tsx`)
É um CRUD funcional, mas raso para o que esta entidade representa no app:
- Sem KPIs do catálogo (total ativos/inativos, sem foto, sem coordenadas, sem horário, sem cupom, rating médio, % populares)
- Filtros pobres: só categoria + busca por nome. Falta cidade, status (aberto/fechado), popular, com/sem cupom, com/sem foto, faixa de rating, ordenação (mais visualizados, melhor avaliado, recente)
- Tabela sem ordenação por coluna, sem paginação, sem seleção em massa
- Sem performance por estabelecimento (impressões / cliques / CTR / favoritos / check-ins / avaliações / cupons usados) — dados que já existem em `feed_events`, `user_favorites`, `check_ins`, `reviews`, `coupon_redemptions`
- Ações por linha limitadas a editar/excluir. Falta: duplicar, abrir no app (preview), ativar/desativar, marcar popular, ver analytics
- Sem detecção de problemas de qualidade (estabelecimentos sem coordenadas, sem foto, sem horário, sem categoria, com rating < 3, sem nenhuma impressão no período)
- `category` está hardcoded em string PT-BR, sem normalização — quebra quando o catálogo cresce
- Sem indicador visual rápido de saúde (badges de "incompleto", "sem foto", "sem coords")
- Imagem 40×40 sem alt acessível claro; sem fallback semântico

## O que vou construir

### Dashboard (reescrita seguindo padrão admin)

```text
[ Período: 7 / 30 / 90 / Tudo ]

[ Hero KPIs primários ]
[ Usuários ativos | Sessões Explorar | Cliques no Feed | Check-ins | Cupons resgatados | Novos cadastros ]
   (cada um com delta vs período anterior + sparkline mini)

[ Saúde do catálogo (card largo)               ] [ Atividade ao vivo (card lateral)          ]
[ • Estabelecimentos sem foto: 4               ] [ últimos eventos: novo cadastro,           ]
[ • Sem coordenadas: 2                         ] [ check-in, avaliação, post, redenção       ]
[ • Sem horário: 7                             ]                                              
[ • Sem categoria: 1                           ]
[ • Cupons expirando em 7d: 3                  ]
[ → cada linha vira link para o filtro correspondente em /admin/estabelecimentos | /admin/cupons ]

[ Engajamento ao longo do tempo (LineChart impressions vs clicks vs check-ins) ]

[ Distribuição por cidade   ] [ Top 5 estabelecimentos no período          ]
[ Donut Gramado/Canela/...  ] [ logo + nome + impressões + CTR             ]

[ Insights automáticos (até 3 frases)                                                  ]
[ "Quinta tem 38% mais cliques que a média" / "Categoria Cafés cresceu 22%" / etc.    ]

[ Atalhos de ação rápida ]
[ + Novo estabelecimento ] [ + Novo cupom ] [ + Nova notificação ] [ + Novo roteiro ]
```

Tudo navegável: cards com `onClick` que direcionam para a página/filtro correspondente. Reusa funções já existentes em `adminAnalytics.ts` (`getFeedKPIs`, `getExploreKPIs`, `getEngagementByWeekday`, `getTopEstablishmentsInFeed`) + novos helpers para "saúde do catálogo" e "atividade ao vivo".

### Estabelecimentos (upgrade para gestão e analytics)

```text
[ Período: 7 / 30 / 90 / Tudo ]                       [ + Novo estabelecimento ]

[ KPIs do catálogo ]
[ Total ativos | Rating médio | Com cupom | Populares | Incompletos | Sem impressão no período ]

[ Toolbar avançada ]
[ Busca | Categoria | Cidade | Status | Qualidade ▾ | Ordenar por ▾ | Visualização: Lista | Mapa ]
   (Qualidade: sem foto, sem coords, sem horário, rating < 3, sem cupom)
   (Ordenar: nome, mais visualizado, melhor avaliado, mais favoritado, mais check-ins, recente)

[ Ações em massa quando há seleção: Ativar | Desativar | Marcar popular | Excluir ]

[ Tabela enriquecida com colunas ordenáveis ]
[ ☐ | Img | Nome (+ slug) | Categoria | Cidade | Rating | Status | Saúde | Impressões | CTR | Favoritos | Check-ins | Ações ]
   (badges Saúde: ✓ Completo / ⚠ Sem foto / ⚠ Sem coords / ⚠ Sem horário)
   (Ações: Editar, Ver no app, Duplicar, Toggle popular, Excluir)

[ Paginação 25/50/100 + total ]

[ Drawer "Detalhes & Performance" ao clicar na linha ]
   • Header: foto + nome + categoria + status + rating
   • KPIs do período: impressões, cliques, CTR, favoritos novos, check-ins, avaliações novas, cupons resgatados
   • Mini-chart de impressões por dia
   • Última atividade (últimos 5 eventos)
   • Botões: Editar / Ver no app / Duplicar / Excluir

[ Insights do catálogo (card final) ]
   "3 estabelecimentos sem impressão há 30d", "Cafés tem o maior CTR (8,2%)", etc.
```

Visualização "Mapa" (toggle): Leaflet com pins coloridos por status (verde = ativo+saudável, amarelo = incompleto, cinza = inativo). Reusa `LocationMap`/Leaflet já no projeto.

## Mudanças técnicas

### Sem migrations
Usa apenas tabelas e colunas existentes: `establishments`, `feed_events`, `user_favorites`, `check_ins`, `reviews`, `coupon_redemptions`, `coupons`, `user_profiles`, `notifications`.

### Arquivos
- `src/admin/services/adminDashboard.ts` (novo)
  - `getDashboardKPIs(period)` — usuários ativos, sessões Explorar, cliques Feed, check-ins, cupons resgatados, novos cadastros (com deltas)
  - `getCatalogHealth()` — contagens de estabelecimentos sem foto / sem coords / sem horário / sem categoria + cupons expirando
  - `getRecentActivity(limit)` — merge de eventos recentes (cadastro, check-in, avaliação, post, redenção)
  - `getCityDistribution()` — usuários e estabelecimentos por cidade
  - `getDashboardInsights(period)` — 2-3 frases automáticas
- `src/admin/services/adminEstablishments.ts` (novo)
  - `getEstablishmentsKPIs(period)`
  - `listEstablishments({ search, category, city, status, quality, sortBy, page, pageSize })`
  - `getEstablishmentPerformance(id, period)` — métricas para o drawer
  - `getEstablishmentInsights(period)`
  - `bulkUpdate(ids, patch)` / `duplicateEstablishment(id)` / `togglePopular(id)`
- `src/admin/pages/Dashboard.tsx` — reescrita
- `src/admin/pages/Establishments.tsx` — reescrita
- `src/admin/components/EstablishmentDetailsDrawer.tsx` (novo)
- `src/admin/components/EstablishmentMapView.tsx` (novo, opcional, reusa Leaflet)
- `src/admin/components/PeriodSelector.tsx` — extrair se ainda não estiver isolado, para reuso

### Padrão visual mantido
Mesmo header com seletor de período, `StatCard` com delta, `StatusBadge`, cards `bg-card border rounded-lg`, espaçamento `space-y-6`, grid responsivo. Admin segue desktop-only (`min-w-[1024px]`). Sem mudanças no app mobile.

### Performance
- Queries agregadas em paralelo com `Promise.all`
- Paginação server-side em estabelecimentos
- Cache em memória do período (recarrega só quando muda)

## Resultado

- **Dashboard** vira o "cockpit" real do admin: estado de saúde, tendência, atividade ao vivo, insights e atalhos.
- **Estabelecimentos** vira ferramenta de gestão e analytics, não só CRUD: filtros ricos, ordenação, qualidade do catálogo, drawer com performance individual, ações em massa e visualização em mapa.
