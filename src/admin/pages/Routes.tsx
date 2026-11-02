import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  Plus, Pencil, Copy, Trash2, MapPin, Star,
  Map, Sparkles, Lightbulb, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getRouteKPIs,
  getSuggestedRoutesPerformance,
  getPersonalizedSuggestions,
  getRouteAdminInsights,
  deleteRoute,
  duplicateRoute,
  type Period,
} from "../services/adminRoutes";
import RouteEditorSheet from "../components/RouteEditorSheet";

import { KpiCard } from "../components/ui/KpiCard";
import { PeriodSelector } from "../components/ui/PeriodSelector";

export default function RoutesPage() {
  const [period, setPeriod] = useState<Period>(30);
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof getRouteKPIs>> | null>(null);
  const [perf, setPerf] = useState<Awaited<ReturnType<typeof getSuggestedRoutesPerformance>>>([]);
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof getPersonalizedSuggestions>>>([]);
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof getRouteAdminInsights>>>([]);
  const [banners, setBanners] = useState<any[]>([]);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<{ title?: string; stops?: { establishment_id: string }[] } | null>(null);

  async function loadAll() {
    try {
    const [k, p, sg, ins, b] = await Promise.all([
      getRouteKPIs(period),
      getSuggestedRoutesPerformance(period),
      getPersonalizedSuggestions(period),
      getRouteAdminInsights(period),
      supabase.from("route_banners").select("*").order("sort_order"),
    ]);
    setKpis(k); setPerf(p); setSuggestions(sg);
    setInsights(ins); setBanners(b.data ?? []);
    } catch {
      toast.error("Não foi possível carregar os roteiros");
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [period]);

  const openCreate = () => { setEditId(null); setPrefill(null); setEditorOpen(true); };
  const openEdit = (id: string) => { setEditId(id); setPrefill(null); setEditorOpen(true); };
  const openFromSuggestion = (sug: typeof suggestions[number]) => {
    setEditId(null);
    setPrefill({ title: sug.title, stops: sug.stops.map(s => ({ establishment_id: s.id })) });
    setEditorOpen(true);
  };

  async function toggleFeatured(id: string, current: boolean) {
    const { error } = await supabase.from("routes").update({ is_featured: !current } as never).eq("id", id);
    if (error) { toast.error("Não foi possível alterar o destaque. Tente novamente."); return; }
    loadAll();
  }
  async function handleDelete(id: string) {
    try { await deleteRoute(id); } catch { toast.error("Não foi possível excluir o roteiro. Tente novamente."); return; }
    toast.success("Roteiro excluído");
    loadAll();
  }
  async function handleDuplicate(id: string) {
    try { await duplicateRoute(id); } catch { toast.error("Não foi possível duplicar o roteiro. Tente novamente."); return; }
    toast.success("Roteiro duplicado");
    loadAll();
  }
  async function toggleBanner(id: string, current: boolean) {
    const { error } = await supabase.from("route_banners").update({ active: !current } as never).eq("id", id);
    if (error) { toast.error("Não foi possível alterar o banner. Tente novamente."); return; }
    loadAll();
  }
  async function deleteBanner(id: string) {
    const { error } = await supabase.from("route_banners").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover o banner. Tente novamente."); return; }
    toast.success("Banner removido"); loadAll();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Roteiros</h2>
          <p className="text-sm text-muted-foreground">CRUD, performance e sugestões personalizadas.</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard title="Roteiros sugeridos" value={kpis?.totalSuggested ?? 0} icon={Map} />
        <KpiCard title="Em destaque" value={kpis?.featured ?? 0} icon={Star} />
        <KpiCard title="Paradas" value={kpis?.totalStops ?? 0} icon={MapPin} />
        <KpiCard title="Média de paradas" value={kpis?.avgStops ?? 0} icon={Sparkles} />
      </div>

      {/* Performance + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Roteiros sugeridos</CardTitle>
            <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="w-4 h-4" /> Novo roteiro</Button>
          </CardHeader>
          <CardContent>
            {perf.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum roteiro cadastrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roteiro</TableHead>
                    <TableHead className="text-center">Paradas</TableHead>
                    <TableHead className="text-center">Destaque</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perf.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {r.image_url ? (
                            <img src={r.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : <div className="w-10 h-10 rounded bg-muted" />}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{r.title}</p>
                            <p className="text-xs text-muted-foreground">{r.duration} · {r.difficulty}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{r.stops}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={r.is_featured} onCheckedChange={() => toggleFeatured(r.id, r.is_featured)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r.id)} title="Editar" aria-label="Editar"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(r.id)} title="Duplicar" aria-label="Duplicar"><Copy className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Excluir" aria-label="Excluir"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir roteiro?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita. O roteiro "{r.title}" será removido permanentemente.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(r.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" />Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.length === 0 && <p className="text-sm text-muted-foreground">Sem insights no período.</p>}
            {insights.map((i, idx) => (
              <div key={idx} className={cn("flex gap-2 p-3 rounded-2xl text-sm",
                i.type === "positive" && "bg-success/10 text-success",
                i.type === "warning" && "bg-destructive/10 text-destructive",
                i.type === "info" && "bg-primary/10 text-primary")}>
                {i.type === "warning" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{i.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Sugestões personalizadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Sugestões personalizadas <span className="text-xs font-normal text-muted-foreground">geradas pelo engajamento real</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem sinal suficiente no período para gerar sugestões.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestions.map((s, i) => (
                <div key={i} className="rounded-2xl border p-4 space-y-3">
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.stops.length} paradas · {s.category}</p>
                  </div>
                  <div className="space-y-1">
                    {s.stops.slice(0, 5).map(st => (
                      <div key={st.id} className="flex items-center gap-2 text-xs">
                        {st.logo_url ? <img src={st.logo_url} className="w-5 h-5 rounded-full object-cover" alt="" /> : <div className="w-5 h-5 rounded-full bg-muted" />}
                        <span className="truncate">{st.name}</span>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => openFromSuggestion(s)}>
                    <Plus className="w-3 h-3" /> Criar este roteiro
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banners */}
      <Card>
        <CardHeader><CardTitle>Banners de Destaque</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell><Switch checked={b.active} onCheckedChange={() => toggleBanner(b.id, b.active)} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteBanner(b.id)} aria-label="Excluir banner">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {banners.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Nenhum banner</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RouteEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        routeId={editId}
        prefill={prefill}
        onSaved={loadAll}
      />
    </div>
  );
}
