import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MapPin, Sparkles } from "lucide-react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterChip, FilterChipsBar } from "@/components/ui/FilterChips";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SuggestedRouteHero } from "@/components/routes/SuggestedRouteHero";
import { SuggestedRouteRow } from "@/components/routes/SuggestedRouteRow";
import { MyRouteCard } from "@/components/routes/MyRouteCard";
import {
  useDeleteRoute,
  useMyRoutes,
  useSuggestedRoutes,
  useCloneSuggestedRoute,
  useStartRoute,
} from "@/hooks/useRoutes";
import type { UserRouteRow } from "@/services/userRoutes";
import { toast } from "sonner";

const FILTERS = ["Todos", "Curto", "1 dia", "2+ dias"] as const;
type Filter = (typeof FILTERS)[number];

function matchFilter(duration: string | null | undefined, f: Filter) {
  if (f === "Todos" || !duration) return f === "Todos";
  const d = duration.toLowerCase();
  if (f === "Curto") return d.includes("hora") || d.includes("min");
  if (f === "1 dia") return d.includes("1 dia") || d === "1 dia" || d.includes("hora");
  if (f === "2+ dias") return d.includes("2 dia") || d.includes("3 dia") || d.includes("dias");
  return true;
}

export default function Roteiros() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("suggested");
  const [filter, setFilter] = useState<Filter>("Todos");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const suggested = useSuggestedRoutes();
  const mine = useMyRoutes();
  const deleteRoute = useDeleteRoute();
  const cloneRoute = useCloneSuggestedRoute();

  const suggestedList = (suggested.data ?? []).filter((r: any) =>
    matchFilter(r.duration, filter),
  );

  const myList = (mine.data ?? []) as UserRouteRow[];

  const handleShare = async (route: UserRouteRow) => {
    const url = `${window.location.origin}/roteiros/${route.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: route.title, url });
        return;
      } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleDuplicate = async (suggestedId: string) => {
    try {
      const newId = await cloneRoute.mutateAsync(suggestedId);
      toast.success("Roteiro duplicado!");
      if (newId) navigate(`/roteiros/${newId}/editar`);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível duplicar");
    }
  };

  return (
    <div className="min-h-screen bg-background pt-14">
      <GlobalHeader title="Roteiros" />

      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full rounded-full bg-secondary p-1 h-10">
            <TabsTrigger
              value="suggested"
              className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              Sugeridos
            </TabsTrigger>
            <TabsTrigger
              value="mine"
              className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              Meus roteiros
            </TabsTrigger>
          </TabsList>

          {/* SUGGESTED */}
          <TabsContent value="suggested" className="mt-4 space-y-4">
            <FilterChipsBar>
              {FILTERS.map((f) => (
                <FilterChip
                  key={f}
                  label={f}
                  active={filter === f}
                  onClick={() => setFilter(f)}
                />
              ))}
            </FilterChipsBar>

            {suggested.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="aspect-[2/1] rounded-xl" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : suggestedList.length === 0 ? (
              <EmptyState
                icon={<MapPin className="w-7 h-7 text-muted-foreground" />}
                title="Nenhum roteiro sugerido"
                description="Tente outro filtro"
              />
            ) : (
              <>
                <SuggestedRouteHero
                  title={(suggestedList[0] as any).title}
                  imageUrl={(suggestedList[0] as any).image_url}
                  duration={(suggestedList[0] as any).duration}
                  difficulty={(suggestedList[0] as any).difficulty}
                  stopsCount={(suggestedList[0] as any).route_stops?.length ?? 0}
                  onClick={() => navigate(`/roteiros/${(suggestedList[0] as any).id}`)}
                />
                <div className="space-y-2">
                  {suggestedList.slice(1).map((r: any) => (
                    <SuggestedRouteRow
                      key={r.id}
                      title={r.title}
                      subtitle={r.subtitle}
                      duration={r.duration}
                      stopsCount={r.route_stops?.length ?? 0}
                      imageUrl={r.image_url}
                      onClick={() => navigate(`/roteiros/${r.id}`)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* MINE */}
          <TabsContent value="mine" className="mt-4 space-y-3">
            {mine.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            ) : myList.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="w-7 h-7 text-muted-foreground" />}
                title="Crie seu primeiro roteiro"
                description="Personalize sua viagem com seus lugares favoritos"
                action={
                  <div className="flex flex-col gap-2 w-full max-w-xs mx-auto">
                    <Button
                      className="rounded-full gap-2"
                      onClick={() => navigate("/roteiros/novo")}
                    >
                      <Plus className="w-4 h-4" />
                      Criar roteiro
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setTab("suggested")}
                    >
                      Personalizar um sugerido
                    </Button>
                  </div>
                }
              />
            ) : (
              myList.map((r) => (
                <MyRouteCard
                  key={r.id}
                  route={r}
                  onOpen={() => navigate(`/roteiros/${r.id}?type=user`)}
                  onEdit={() => navigate(`/roteiros/${r.id}/editar`)}
                  onDuplicate={() => navigate(`/roteiros/novo?clone=${r.id}`)}
                  onShare={() => handleShare(r)}
                  onDelete={() => setDeleteId(r.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* FAB always available */}
      <button
        onClick={() => navigate("/roteiros/novo")}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:shadow-xl"
        aria-label="Criar roteiro"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BottomNav />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-xs mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir roteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Suas paradas e progresso serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await deleteRoute.mutateAsync(deleteId);
                  toast.success("Roteiro excluído");
                } catch {
                  toast.error("Erro ao excluir");
                }
                setDeleteId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>
      {action}
    </div>
  );
}
