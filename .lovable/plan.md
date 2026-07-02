## Diagnóstico

No preview atual o app **carrega** o Feed corretamente (Supabase respondendo 200, sessão válida, posts renderizando). O sintoma "carrega e depois some após alguns segundos" indica que algo é lançado *depois* do primeiro render — e como **não existe nenhum ErrorBoundary no projeto**, qualquer `throw` em componente / hook / render derruba a árvore inteira para uma tela em branco silenciosa (React 18 unmount total).

Candidatos que já identifiquei no código lendo os arquivos:

1. **Sem ErrorBoundary raiz** (`src/App.tsx`). Um único erro em `PostCard`, `LocationContext`, `useRoutes`, etc. apaga o app sem log visível ao usuário.
2. **Chunks lazy que falham a importar** (`lazy(() => import(...))` em `App.tsx`). Quando o Vite/preview troca de build o import antigo devolve 404 e o Suspense estoura → tela branca. Isso é a causa clássica de "some após alguns segundos" enquanto o usuário navega.
3. **Warning ruidoso `fetchPriority` em `PostCard.tsx:132`** — não derruba sozinho, mas polui o console e mostra que a atribuição de props de imagem não está limpa.
4. Nenhum tratamento de erro em `queryFn` (React Query com `retry: 1`) — se um `throw` chegar a componente pai sem boundary, mesma consequência.

Nada disso exige mudança de backend/regra de negócio — é resiliência de front-end.

## O que vou fazer

### 1. Adicionar `ErrorBoundary` global (novo arquivo)
`src/components/ErrorBoundary.tsx` — classe React clássica com `componentDidCatch` que:
- loga o erro completo no `console.error` (para aparecer nos logs que consigo ler);
- detecta erros de chunk (`ChunkLoadError`, mensagem contendo `Failed to fetch dynamically imported module` / `Importing a module script failed`) e, nesses casos, faz `window.location.reload()` **uma única vez** (usando `sessionStorage` como guarda) — resolve a causa #2 automaticamente;
- caso contrário renderiza um fallback amigável no padrão do design system (card centralizado, botão "Tentar novamente" que reseta o boundary, botão "Voltar ao início").

### 2. Envolver a árvore em `App.tsx`
Colocar `<ErrorBoundary>` como filho de `QueryClientProvider` e envolvendo `<BrowserRouter>`, para capturar erros em qualquer rota, provider ou lazy chunk sem quebrar o SW/toaster.

### 3. Suspense por rota com fallback resiliente
Trocar o `Suspense` único que hoje engloba todas as `<Routes>` por um `<Suspense>` interno + `<ErrorBoundary>` local dentro da árvore, para que uma falha de import de uma página não apague o header/nav — o usuário continua vendo o shell e recebe "não foi possível carregar esta página, recarregar?".

### 4. Corrigir warning `fetchPriority` no `PostCard`
Em `src/components/feed/PostCard.tsx:132` trocar o spread `{...(isFirst ? { fetchPriority: "high" } : {})}` pelo atributo lower-case aceito pelo React DOM (`fetchpriority`) — remove o warning e evita reprocessamento de props em cada render.

### 5. Verificação
- `bunx tsgo --noEmit` para garantir tipos.
- Playwright headless: abrir `/`, esperar 15s ociosos, capturar screenshot e conferir que o Feed continua montado; forçar um throw temporário em dev *só localmente durante o teste* para confirmar que o boundary aparece em vez da tela branca (revertido antes de terminar).
- Ler console logs pós-mudança para confirmar que o warning `fetchPriority` sumiu.

## Arquivos afetados

```text
src/components/ErrorBoundary.tsx   (novo)
src/App.tsx                        (edit: envolve com ErrorBoundary + suspense por rota)
src/components/feed/PostCard.tsx   (edit: fetchpriority lowercase)
```

## O que NÃO vou mexer

- Supabase, RLS, schema, edge functions — o backend está respondendo 200.
- Design system, cores, layout, rotas existentes.
- Service Worker (`public/sw.js`) — no preview ele nem registra; em produção o cache-first de assets é intencional.
- Lógica das páginas de Roteiros / Feed / Mapa.

## Observação

Se depois desse fix o boundary começar a aparecer com uma mensagem específica, essa mensagem vira o próximo bug a corrigir — mas primeiro precisamos parar a tela branca silenciosa para conseguir enxergar o erro real.
