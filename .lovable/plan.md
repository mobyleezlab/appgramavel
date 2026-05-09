## Correções nos roteiros

### 1. Botão "Iniciar" ausente na página /roteiros

Hoje, na lista, só é possível abrir o detalhe para então iniciar. Falta um atalho direto.

**`src/components/routes/MyRouteCard.tsx`**
- Reorganizar layout em duas linhas: a área de toque atual (capa + título + progresso) e uma barra de ação ancorada na base do card com um botão primário:
  - Se `status === "in_progress"` → "Continuar" (ícone `Play`).
  - Se `status === "completed"` → "Refazer" (ícone `RotateCcw`).
  - Caso contrário → "Iniciar" (ícone `Navigation`).
- O botão dispara `onStart(route)` (nova prop). O clique não pode propagar para o `onOpen` do card.
- Manter o menu `MoreVertical` (Editar / Duplicar / Compartilhar / Excluir).

**`src/components/routes/SuggestedRouteHero.tsx` e `SuggestedRouteRow.tsx`**
- Adicionar uma prop opcional `onStart` e um botão pequeno "Iniciar" (pill, `bg-white/90 text-foreground` no hero / `variant="secondary"` na row) ao lado do `ChevronRight`. `stopPropagation` no clique.

**`src/pages/Roteiros.tsx`**
- Adicionar handler `handleStart`:
  - Para "Meus roteiros": chamar `useStartRoute().mutateAsync(id)` e navegar para `/roteiros/:id/navegar?type=user`.
  - Para sugeridos: navegar direto para `/roteiros/:id/navegar`.
- Passar `onStart` para `MyRouteCard`, `SuggestedRouteHero` e `SuggestedRouteRow`.

### 2. AddStopSheet — locais não aparecem corretamente

O sheet usa `h-[85vh] flex flex-col` com `Tabs` aninhado e `TabsContent` com `overflow-y-auto`. Em viewports pequenos (390×632) a área útil fica ~280 px e os cartões parecem cortados/ocultos por scroll aninhado.

**`src/components/routes/AddStopSheet.tsx`**
- Trocar para sheet quase fullscreen mobile:
  `h-[100dvh] max-h-[100dvh] rounded-t-none sm:rounded-t-2xl sm:h-[92vh]`.
- Header sticky (`sticky top-0 bg-background z-10`) com botão fechar visível (manter o `SheetPrimitive.Close` padrão funciona).
- Estrutura interna em coluna: `header` (auto) → `TabsList` (auto) → barra de busca (sticky no tab "search") → área de lista única com `overflow-y-auto overscroll-contain` ocupando o restante via `flex-1 min-h-0`.
- Garantir que apenas UMA camada role: remover o `flex-1 overflow-y-auto` interno aninhado e usar um `<div ref className="flex-1 min-h-0 overflow-y-auto">` direto sob `TabsContent` (sem flex-col extras).
- Resetar `search` quando o sheet abre (`useEffect open → setSearch("")`).
- Footer de confirmação fixo com `pb-[env(safe-area-inset-bottom)]`.
- Aumentar limite inicial de busca de 50 para 100 e adicionar skeleton enquanto `allEsts` está vazio.
- Adicionar contagem visível por aba (ex.: "Favoritos (12)").

### 3. Outras inconsistências

**`src/pages/RoteiroDetail.tsx`**
- Remover import não usado `HowToGetThereButton`.
- Em `handleStart`, quando `isUser` for `false` mas o usuário estiver logado, manter o comportamento atual (sugeridos navegam para `/navegar` sem `?type=user`).
- Garantir que `validStops` e `stops` derivem de uma cópia ordenada para evitar mutação.

**`src/components/routes/MyRouteCard.tsx`**
- Substituir `stops.sort(...)` por `[...stops].sort(...)` para não mutar o array do React Query (causa de reordenações imprevisíveis ao refetchar).

**`src/pages/RoteiroNavigation.tsx`**
- Adicionar `pt-14` no wrapper raiz (hoje só há no `<main>` em alguns retornos; o caminho principal não tem) para o conteúdo não ficar sob o `GlobalHeader` fixo.
- No view "map", destacar a parada atual passando `currentIndex={localCursor}` ao `RoutePreviewMap` (se a prop não existir, adicionar realce simples por número).
- Quando `validStops.length === 0` mostrar um aviso amigável em vez de mapa vazio.

**`src/pages/Roteiros.tsx`**
- Remover o import não usado `MapPin` se sobrar após mudanças (verificar).
- O FAB sobrepõe o último card; aumentar `pb-24` → `pb-28` no `<main>` quando houver itens em "Meus roteiros".

### Fora de escopo
- Mudanças no schema/RPCs do Supabase.
- Redesign do mapa de navegação ou integração com geolocalização em tempo real.
- Edição da capa manual.

### Arquivos editados
- `src/pages/Roteiros.tsx`
- `src/pages/RoteiroDetail.tsx`
- `src/pages/RoteiroNavigation.tsx`
- `src/components/routes/MyRouteCard.tsx`
- `src/components/routes/SuggestedRouteHero.tsx`
- `src/components/routes/SuggestedRouteRow.tsx`
- `src/components/routes/AddStopSheet.tsx`
