# Repaginação visual — Roteiros (checklist estilo TripIt/Apple Notes)

Escopo estritamente visual. Nenhum hook, mutation, service, RLS, rota ou estrutura de dados é tocado. Comportamento (drag, toggle visitado, popovers de prioridade/dia, sheet de nota, clone) permanece idêntico — só muda o markup/classes.

## Arquivos afetados

1. `src/pages/RoteiroDetail.tsx` — lista de paradas + section headers por dia
2. `src/components/routes/MyRouteCard.tsx` — item da aba "Minhas listas"
3. `src/pages/Roteiros.tsx` — trocar `space-y-3` da aba mine por container de lista com divisores (sem cards flutuando)

Não mexer: `Roteiros.tsx` aba "Sugeridos", `SortableStop.tsx` (é do editor, não da tela de detalhe), `useRoutes.ts`, `userRoutes.ts`, `App.tsx`, RLS, SQL.

## 1) Linha de parada (RoteiroDetail)

Estrutura da linha (sem card, sem shadow, sem rounded forte):

```text
│ ▢  Nome da parada                    ⋮⋮
│    categoria · nota pessoal em cinza
└── border-b border-border/50 ──────────
```

- Container da linha: `flex items-start gap-3 py-3 pl-3 pr-2 border-b border-border/40`, sem `bg`, sem `shadow`, sem `rounded`.
- **Barra de prioridade**: `<span>` absoluto na borda esquerda, `w-[3px] h-full`, cor por prioridade (`bg-destructive` / `bg-primary` / `bg-emerald-500`). Sem barra visível quando `priority` está ausente (fica só um espaço equivalente para alinhar). Clique na barra abre o Popover de prioridade que já existe — apenas troca o trigger.
- **Checkbox de visitado**: mantém `Checkbox` shadcn tamanho grande (`h-5 w-5`), único elemento com cor primária forte. Continua chamando o mesmo `useUpdateStop`.
- **Nome**: `text-[15px] text-foreground`, `line-through text-muted-foreground` quando visitado.
- **Categoria**: mesma linha após nome como `· categoria` em `text-xs text-muted-foreground`, OU quebra pra linha 2 se não couber. Remover imagem/avatar do estabelecimento.
- **Nota pessoal**: se existir, `<p class="text-xs text-muted-foreground mt-0.5">` abaixo do nome. Sem ícone sticky, sem itálico. Toque na área da nota abre o Sheet de edição já existente.
- **Grip**: ícone `GripVertical w-4 h-4 text-muted-foreground/40` alinhado à direita. Continua sendo o handle do dnd-kit (mesmos listeners/attributes).
- **Sem badges** "Alta/Média/Baixa" com texto/fundo. O rótulo textual só aparece dentro do Popover ao abrir.

Remover da linha atual: fundo do card, borda arredondada, sombra, foto do estabelecimento, chip colorido de prioridade, ícone de nota.

## 2) Section header por dia

Trocar o header atual (grande/bold/possivelmente com badge) por header estilo iOS Contacts:

```tsx
<div className="px-3 pt-6 pb-2">
  <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
    Dia {n}
  </h2>
</div>
```

- Sem card, sem fundo, sem badge de contagem inline.
- Contagem `x/y visitados` só como rodapé opcional da seção em `text-[11px] text-muted-foreground/70 px-3 pt-2 pb-1`, alinhada à direita. Se ficar poluído, remove.
- Paradas sem `planned_day` vão em seção final com header `SEM DIA DEFINIDO`.

## 3) MyRouteCard → MyRouteRow

Transformar de card com imagem em linha compacta densa:

```text
│ [thumb 40px opc.]  Nome do roteiro                     ⋯
│                    3 de 8 visitados · 2 dias      · · ·
└── border-b border-border/40 ────────────────────────────
```

- Wrapper: `flex items-center gap-3 py-3 px-3 border-b border-border/40`, sem `rounded-2xl`, sem `shadow-card`, sem `bg-card`, sem `overflow-hidden`.
- **Thumb**: manter opcional — círculo `w-9 h-9 rounded-full bg-secondary` com iniciais do título (sem imagem de capa banner). Se preferir mais limpo, remover completamente e ficar só texto.
- **Título**: `text-[15px] font-medium truncate`.
- **Meta**: linha 2 em `text-xs text-muted-foreground` — "`{visited} de {total} visitados · {maxDay} dias`". Sem Progress bar (a razão x/y já comunica).
- **Prioridades**: 3 pontinhos `w-1.5 h-1.5 rounded-full` (só as prioridades presentes, sem número ao lado) alinhados à direita antes do menu.
- **Menu ⋯**: mantém `DropdownMenu` com Editar/Duplicar/Compartilhar/Excluir — só reduz padding e cor do ícone (`text-muted-foreground/60`).
- Toda a linha continua clicável → `onOpen`.

## 4) Container da lista em `Roteiros.tsx` (aba mine)

- Remover `space-y-3` entre itens.
- Envolver a lista em `<div className="rounded-2xl border border-border/40 bg-card divide-y divide-border/40 overflow-hidden">` para dar sensação de "um bloco de lista" (estilo iOS grouped list) em vez de N cards flutuando.
- O CTA "Planejar outro passeio" quando `length === 1` vira uma linha dentro do mesmo bloco (última row com texto discreto + ícone `+`), mantendo o mesmo `onClick`.
- Empty state e aba "Sugeridos" ficam intocados.

## 5) Paleta / tokens

- Nenhum hex novo. Usar apenas tokens existentes: `foreground`, `muted-foreground`, `border`, `primary`, `destructive`, `emerald-500` (já em uso), `secondary`.
- Zero `shadow-card`, zero gradientes nas linhas afetadas.
- Ícones decorativos removidos: `CalendarDays`, `CheckCircle2` do MyRouteCard, ícone de nota da linha, avatar do estabelecimento. Manter só: Checkbox, GripVertical, MoreVertical, ChevronRight/Popover triggers funcionais.

## Verificação após implementar

- Preview `/roteiros` aba "Minhas listas" e uma `/roteiros/:id?type=user` com paradas em ≥2 dias, com prioridades e notas.
- Confirmar visualmente: nenhum card com sombra, divisores finos, prioridade como traço/ponto colorido, nota como texto cinza, headers "DIA N" em caps pequenos.
- Confirmar funcional: toggle visitado persiste, drag reordena, popover de prioridade/dia abre, sheet de nota abre e salva, menu ⋯ funciona, clique na linha abre detalhe.
