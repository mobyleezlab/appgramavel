# Plano: Roteiros como Planner Pessoal

Transforma a página de Roteiros num organizador de "o que visitar" — sem guia estilo Google Maps. Cada parada vira um item de checklist com nota pessoal, dia planejado e prioridade. Roteiros sugeridos continuam como inspiração e podem ser salvos como uma nova lista.

## Fluxo novo

1. `/roteiros` — duas tabs: **Sugeridos** (inspiração, igual hoje) e **Meus roteiros** (agora chamados "Minhas listas").
2. Ao abrir uma lista minha (`/roteiros/:id?type=user`): visualização de planner, agrupada por Dia (Sem dia, Dia 1, Dia 2...), com progresso `X/Y visitados`.
3. Cada parada: checkbox de visitado, badge de prioridade, chip de dia, botão de nota (abre sheet com textarea).
4. Roteiro sugerido: mantém preview + timeline + botão **"Salvar na minha lista"** (clona) — sem "Iniciar".

## Remoções

- Rota `/roteiros/:id/navegar` + arquivo `src/pages/RoteiroNavigation.tsx` (deletar do `App.tsx` também).
- Componentes só usados pela navegação guiada: `src/components/map/NavigationView.tsx`, `src/components/routes/HowToGetThereButton.tsx` (verificar uso antes; se usado em outro lugar, manter).
- CTA "Iniciar roteiro" / "Continuar" / "Refazer" em `RoteiroDetail.tsx`.
- `useStartRoute` das telas de listagem/detalhe (hook fica no service caso seja usado em outros lugares).
- Mini-mapa em `RoteiroDetail.tsx` permanece só como referência visual (pins), sem polilinha de rota nem `getMultiLegRoute`.

## Alterações por arquivo

### Banco (Supabase migration)
Adicionar em `user_route_stops`:
- `personal_note text`
- `planned_day smallint` (null = sem dia)
- `priority text check (priority in ('low','medium','high'))` default `'medium'`

Sem mudança em RLS (herdada). Incluir `GRANT` explícitos se a tabela ainda não tiver.

### `src/services/userRoutes.ts`
- Adicionar `updateUserRouteStop(stopId, { personal_note?, planned_day?, priority? })`.
- Tipar novos campos em `UserRouteRow.user_route_stops[]`.

### `src/hooks/useRoutes.ts`
- `useUpdateStop()` — mutation que invalida `mine`.
- Remover uso de `useStartRoute` das telas (hook em si pode ficar).

### `src/pages/Roteiros.tsx`
- Renomear rótulo da tab "Meus roteiros" → "Minhas listas".
- Remover `handleStartMine` e o botão "Iniciar" dentro do `MyRouteCard` (ajustar props).
- Mostrar no card: título, capa, `visitados/total` + barra de progresso, chips "N dias planejados" quando houver, ações: Abrir, Editar, Duplicar, Compartilhar, Excluir.

### `src/components/routes/MyRouteCard.tsx`
- Remover botão/estado de iniciar/continuar. Substituir por "Abrir lista".
- Progresso baseado em `visited/total`.

### `src/pages/RoteiroDetail.tsx` (planner mode quando `type=user`)
- Remover: `getMultiLegRoute`, estatísticas de tempo de carro, CTA sticky de iniciar.
- Manter: capa, descrição, mini-mapa só com pins, botão "Editar lista".
- Nova seção **Planner**:
  - Agrupamento por `planned_day` (Sem dia → Dia 1 → Dia 2 …).
  - Item de parada: checkbox (toggle `markStopVisited`), thumbnail, nome, categoria, chip de dia (Popover para escolher), chip de prioridade (Popover Alta/Média/Baixa com cor), botão nota (ícone StickyNote — abre `Sheet` com `Textarea`, salva via `useUpdateStop`).
  - Header do grupo mostra `X/Y visitados` do dia.
- Modo sugerido (`!isUser`): remove CTA "Iniciar", troca por "Salvar na minha lista" (usa clone existente, redireciona para `/roteiros/:novoId?type=user`).

### `src/pages/RoteiroEditor.tsx`
- Sem mudança funcional obrigatória; apenas garantir que salvar não dependa de iniciar.

### `src/App.tsx`
- Remover import e `<Route>` de `RoteiroNavigation`.

## Detalhes técnicos

- Optimistic update no checkbox (padrão do projeto): `queryClient.setQueryData` para `routesKeys.mineById(id)` antes do mutate; rollback em erro.
- Prioridade: cores por token — `high` usa `bg-destructive/10 text-destructive`, `medium` `bg-primary/10 text-primary`, `low` `bg-muted text-muted-foreground`.
- Dia planejado via `Popover` com botões 1..N + "Sem dia"; N = max(dias atuais)+1 (mínimo 3 opções).
- Nota em `Sheet` mobile-first, `Textarea` até 280 chars, botão Salvar sticky.
- Contagem de dias no card = `new Set(stops.map(s => s.planned_day).filter(Boolean)).size`.
- Manter `max-w-2xl`, `pb-20`, GlobalHeader e BottomNav conforme design system.

## Diagrama do detalhe (planner)

```text
┌─ Capa + título ─────────────────┐
│ 5/8 visitados · 2 dias planejados│
├─ mini-mapa (pins, sem rota) ────┤
├─ [Editar lista]                 │
│                                 │
│ Sem dia (2/3)                   │
│  ☐ Café Colonial   [Alta] [📝]  │
│  ☑ Mirante         [Média][📝•]│
│                                 │
│ Dia 1 (2/3)                     │
│  ...                            │
└─────────────────────────────────┘
```

## Fora de escopo

- Notificações/lembretes por data.
- Compartilhamento colaborativo da lista.
- Estimativas de tempo/distância entre paradas.
