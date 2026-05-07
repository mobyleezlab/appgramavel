
# Roteiros — UX/UI + Supabase + Navegação

Reescrever a experiência de roteiros em três frentes: **listagem**, **criação/edição** e **navegação até as paradas**, conectando tudo ao Supabase (`routes`, `route_stops`, `user_routes`, `user_route_stops`) e mantendo a identidade visual do app (gradient primary, `max-w-2xl`, FAB, sheets, FilterChips).

---

## 1. Persistência (Supabase como fonte única)

- Substituir `MOCK_ROUTES` em `Roteiros.tsx`, `RoteiroDetail.tsx` e `RoteiroNavigation.tsx` por queries reais.
- **Roteiros sugeridos:** ler `routes` + `route_stops` (join com `establishments` para imagem/coords/categoria/rating).
- **Meus roteiros:** ler `user_routes` + `user_route_stops` do usuário logado, com status (`saved`/`in_progress`/`completed`) e progresso (visited count).
- **Migrações necessárias** (nada destrutivo):
  - Adicionar coluna `cover_url text` em `user_routes` (capa opcional).
  - Adicionar coluna `estimated_duration_min int` em `user_routes` (calculado).
  - Trigger já existe (`on_check_in_insert`) que marca paradas como visitadas e conclui rotas — manter.
  - RPC `start_user_route(p_route_id uuid)`: muda status para `in_progress` e seta `started_at`.
  - RPC `clone_suggested_route(p_route_id uuid)`: cria `user_route` a partir de uma `route` sugerida (para "personalizar este roteiro").
- Camada de serviço unificada em `src/services/userRoutes.ts` e novo `src/services/routes.ts` com hooks React Query (`useSuggestedRoutes`, `useMyRoutes`, `useRouteDetail`, `useCreateRoute`, `useUpdateRoute`, `useDeleteRoute`, `useStartRoute`).

---

## 2. Página `/roteiros` (listagem) — redesign

Manter `GlobalHeader`, `BottomNav`, `max-w-2xl` e identidade. Mudanças:

- **Tabs no topo** (`Sugeridos` / `Meus roteiros`) substituindo as duas seções empilhadas — usa `Tabs` do shadcn estilizadas como pill com gradient quando ativo.
- **Sugeridos**:
  - Hero do destaque mantém-se, mas ganha chip de **dificuldade** + **distância total estimada**.
  - Lista vira **cards horizontais com imagem 64×64 rounded-xl**, badges de duração + nº paradas, e ChevronRight.
  - `FilterChipsBar` reorganizado: `Todos`, `Curto (<3h)`, `1 dia`, `2+ dias`, `Família`, `Romântico`, `Aventura` (mapeados por `difficulty`/categoria principal das paradas).
- **Meus roteiros**:
  - Cada card mostra **mini progress bar** (`x/y paradas concluídas`) e badge de status (`Em andamento` / `Concluído` / `Salvo`).
  - Swipe-action via long-press OU botão `MoreVertical` — opções: Editar, Duplicar, Compartilhar, Excluir (com confirm).
  - Empty state mantém CTA, mas adiciona segunda CTA: **"Personalizar um roteiro sugerido"** que abre lista filtrada.
- **FAB** (Plus) sempre visível na aba "Meus roteiros" → leva para `/roteiros/novo` (tela cheia).

---

## 3. Criação/edição — `/roteiros/novo` e `/roteiros/:id/editar`

Substituir o sheet de 3 passos por **página dedicada em tela cheia**, mais ergonômica no mobile e com melhor controle:

```text
┌─────────────────────────────┐
│ ← Novo roteiro       Salvar │  GlobalHeader showBack + ação primária
├─────────────────────────────┤
│ [ Capa: tap para escolher ] │  (auto = imagem da 1ª parada)
│ Título *                    │
│ Descrição                   │
├─────────────────────────────┤
│ Paradas (3)         + Add ▾ │  menu: Buscar / Favoritos / No mapa / Check-ins
│ ┌──────────────────────────┐│
│ │ ⠿ 1 ▢ Mini Mundo  ✕      ││  drag-handle (dnd-kit), reordenar
│ │ ⠿ 2 ▢ Lago Negro  ✕      ││
│ │ ⠿ 3 ▢ Rua Coberta ✕      ││
│ └──────────────────────────┘│
│ Duração estimada: ~4h 20min │  calculado via OSRM (soma trajetos)
│ Distância total: 8,4 km     │
├─────────────────────────────┤
│ [ Pré-visualizar no mapa ]  │  abre sheet com polyline OSRM
└─────────────────────────────┘
```

- **Drag-and-drop**: `@dnd-kit/core` + `@dnd-kit/sortable` para reordenar paradas.
- **Adicionar paradas (bottom sheet com tabs)**:
  - **Buscar** estabelecimentos (input + chips de categoria).
  - **Favoritos** (lê `user_favorites`).
  - **No mapa** — abre `MapSheet` em modo seleção, tap nos pins para incluir.
  - **Próximos check-ins** — sugere baseado em `check_ins` recentes.
- **Cálculo automático**: ao reordenar/adicionar/remover, dispara debounced fetch ao OSRM (`NavigationView` já tem helpers) para recalcular `distance` + `duration` por trecho. Persiste em `estimated_duration_min`.
- **Capa**: padrão = imagem do 1º estabelecimento; usuário pode trocar abrindo seletor (favorito ou upload futuro — escopo desta entrega: apenas auto + escolha entre as paradas).
- **Salvar como rascunho** automático em `localStorage` (chave `route_draft_<id|new>`) para evitar perda de dados ao voltar.

---

## 4. Detalhe — `/roteiros/:id` redesign

- Hero mantido, mas ganha:
  - **Stats row** abaixo do título: `🚶 8,4 km · ⏱ ~4h · ⛰ Fácil · 📍 6 paradas`.
  - Chip "Personalizar este roteiro" em sugeridos (clona via RPC e abre editor).
- **Mapa estático** (preview Leaflet não interativo, h-48 rounded-xl) acima do timeline mostrando polyline e pins numerados.
- **Timeline** mantém estilo, mas cada parada ganha:
  - Distância e tempo até a próxima (ex.: `→ 1,2 km · 18 min de carro`).
  - Mini menu por parada: `Como chegar` (abre `MapSheet`), `Ver lugar` (link `/estabelecimento/:slug`).
- **CTA principal sticky** no rodapé (sai do fluxo do scroll): `Iniciar roteiro` / `Continuar` / `Refazer`.

---

## 5. Navegação ativa — `/roteiros/:id/navegar` redesign (híbrido com toggle)

Formato definitivo: **toggle Mapa ⇄ Lista** sempre acessível, mantendo card-a-card mas com mapa real integrado.

**Layout padrão (modo Mapa):**

```text
┌──────────────────────────────┐
│ ← Sair         🗺/📋 toggle  │  GlobalHeader transparente sobre mapa
├──────────────────────────────┤
│                              │
│      MAPA LEAFLET            │
│   pins numerados + polyline  │  RouteMap c/ todos os pins,
│   destaque = parada atual    │  rota OSRM destacada até atual
│   pin do usuário (geoloc)    │
│                              │
├─ Bottom sheet (vaul) ───────┤
│ ━━━ swipe up                 │
│ Parada 2 de 6                │  badge progresso
│ Mini Mundo                   │  título
│ ⭐ 4.7 · 🐾 Pet · ⏱ 18min ↗  │  rating + tempo até lá
│                              │
│ [ Como chegar ▾ ]            │  abre menu:
│   – Navegação no app (OSRM)  │   • interna (NavigationView atual)
│   – Google Maps              │   • deep-link `https://www.google.com/maps/dir/?...`
│   – Apple Maps               │   • `https://maps.apple.com/?daddr=...`
│   – Waze                     │   • `https://waze.com/ul?ll=...&navigate=yes`
│ [ Pular ]    [ Já visitei ]  │
└──────────────────────────────┘
```

**Modo Lista** = visão atual (hero 4:5 + dots + info card + next preview), com botão para alternar de volta.

- **Auto-check-in opcional**: se `Geolocation watchPosition` detectar usuário a <200 m da parada atual por 30s, sugerir banner "Marcar como visitado?" (reaproveita lógica do contexto de check-in).
- **Persistência de progresso**: cada `Já visitei` insere em `user_route_stops.visited` (já dispara trigger que conclui rota). `Pular` apenas avança `currentStop` localmente.
- **Saída segura**: dialog de confirmação atual mantido, MAS progresso persiste no banco — então ao reabrir, retoma de onde parou (ler primeira parada com `visited=false`).
- **Compartilhar**: botão no header copia link `https://app.../roteiros/:id` (ou usa `navigator.share`).

---

## 6. Como chegar — política unificada

Componente novo `<HowToGetThereButton establishment={...} />` reutilizável em RoteiroDetail, RoteiroNavigation e EstablishmentDetails:

1. **Padrão**: abre `MapSheet` com OSRM (interno).
2. **Menu "Abrir em..."**: Google Maps / Apple Maps (iOS) / Waze, via deep-links universais.
3. Detecta plataforma (`navigator.userAgent`) para priorizar Apple Maps no iOS.

---

## Arquivos / mudanças técnicas

**Novos**
- `src/pages/RoteiroEditor.tsx` (cria + edita)
- `src/components/routes/RouteCard.tsx`, `SuggestedRouteHero.tsx`, `MyRouteCard.tsx`
- `src/components/routes/SortableStop.tsx` (dnd-kit)
- `src/components/routes/AddStopSheet.tsx` (tabs Buscar/Favoritos/Mapa/Check-ins)
- `src/components/routes/RoutePreviewMap.tsx` (Leaflet read-only com polyline)
- `src/components/routes/HowToGetThereButton.tsx`
- `src/services/routes.ts` (sugeridos)
- Hooks: `src/hooks/useRouteEstimates.ts` (OSRM batched)

**Editados**
- `src/pages/Roteiros.tsx`, `RoteiroDetail.tsx`, `RoteiroNavigation.tsx`
- `src/services/userRoutes.ts` (CRUD completo + RPCs)
- `src/App.tsx` (rotas `/roteiros/novo`, `/roteiros/:id/editar`)

**Migrações Supabase**
- ALTER `user_routes` ADD `cover_url`, `estimated_duration_min`.
- CREATE FUNCTION `start_user_route`, `clone_suggested_route`.

**Dependências**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

**Memória**
- Atualizar `mem://features/routes-system` e `mem://features/routes-navigation` com a nova arquitetura (editor full-screen, hybrid map/list, deep-links externos, persistência Supabase).

---

## Fora do escopo (para depois)

- Upload manual de capa do roteiro (usar storage `user-memories`).
- Compartilhamento social com OG image gerada.
- Roteiros colaborativos / multi-usuário.
- Notificações push "Sua próxima parada está perto".
