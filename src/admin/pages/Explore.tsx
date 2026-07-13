import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Pencil, ArrowUp, ArrowDown, Eye, MousePointer, Search as SearchIcon, AlertTriangle, Lightbulb, TrendingUp, TrendingDown, Filter as FilterIcon, FolderOpen, Star, Sparkles } from "lucide-react";
import {
  getExploreKPIs, getExploreFilterUsage, getCategoryExplorePerformance,
  getSearchInsights, getPopularCandidates, getExperiencesPerformance, getExploreInsights,
} from "../services/adminAnalytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { KpiCard } from "../components/ui/KpiCard";
import { PeriodSelector, type Period } from "../components/ui/PeriodSelector";

type Experience = { id: string; title: string; description: string | null; image_url: string | null; sort_order: number; views?: number; clicks?: number; ctr?: number };

export default function ExplorePage() {
  const [period, setPeriod] = useState<Period>(7);

  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof getExploreKPIs>> | null>(null);
  const [filters, setFilters] = useState<Awaited<ReturnType<typeof getExploreFilterUsage>>>([]);
  const [cats, setCats] = useState<Awaited<ReturnType<typeof getCategoryExplorePerformance>>>([]);
  const [searches, setSearches] = useState<Awaited<ReturnType<typeof getSearchInsights>> | null>(null);
  const [popular, setPopular] = useState<Awaited<ReturnType<typeof getPopularCandidates>>>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof getExploreInsights>>>([]);

  // Experience form state
  const [newExp, setNewExp] = useState({ title: "", description: "", image_url: "", sort_order: 0 });
  const [editing, setEditing] = useState<Experience | null>(null);

  async function loadAll() {
    const [k, f, c, s, p, e, i] = await Promise.all([
      getExploreKPIs(period),
      getExploreFilterUsage(period),
      getCategoryExplorePerformance(period),
      getSearchInsights(period, 10),
      getPopularCandidates(period === "all" ? 90 : period, 10),
      getExperiencesPerformance(period),
      getExploreInsights(period),
    ]);
    setKpis(k); setFilters(f); setCats(c); setSearches(s); setPopular(p);
    setExperiences(e as Experience[]); setInsights(i);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [period]);

  async function togglePopular(id: string, current: boolean) {
    await supabase.from("establishments").update({ is_popular: !current } as never).eq("id", id);
    toast.success(!current ? "Marcado como popular" : "Removido de populares");
    loadAll();
  }

  async function saveExperience() {
    if (!newExp.title) { toast.error("Título é obrigatório"); return; }
    await supabase.from("experiences").insert({
      ...newExp,
      sort_order: experiences.length,
    } as never);
    setNewExp({ title: "", description: "", image_url: "", sort_order: 0 });
    toast.success("Experiência adicionada");
    loadAll();
  }

  async function updateExperience() {
    if (!editing) return;
    await supabase.from("experiences").update({
      title: editing.title,
      description: editing.description,
      image_url: editing.image_url,
      sort_order: editing.sort_order,
    } as never).eq("id", editing.id);
    toast.success("Experiência atualizada");
    setEditing(null);
    loadAll();
  }

  async function deleteExperience(id: string) {
    await supabase.from("experiences").delete().eq("id", id);
    toast.success("Experiência removida");
    loadAll();
  }

  async function reorderExperience(id: string, dir: "up" | "down") {
    const sorted = [...experiences].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(e => e.id === id);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= sorted.length) return;
    const a = sorted[idx], b = sorted[swap];
    await Promise.all([
      supabase.from("experiences").update({ sort_order: b.sort_order } as never).eq("id", a.id),
      supabase.from("experiences").update({ sort_order: a.sort_order } as never).eq("id", b.id),
    ]);
    loadAll();
  }

  const sortedExperiences = useMemo(
    () => [...experiences].sort((a, b) => a.sort_order - b.sort_order),
    [experiences]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Análise do Explorar</h2>
          <p className="text-sm text-muted-foreground">Descoberta, busca, categorias e curadoria de conteúdo.</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Sessões Explorar" value={kpis?.sessions ?? 0} icon={Eye} delta={kpis?.deltas.sessions} />
        <KpiCard title="Buscas" value={kpis?.searches ?? 0} icon={SearchIcon} delta={kpis?.deltas.searches} />
        <KpiCard title="Buscas s/ resultado" value={kpis?.zeroResultSearches ?? 0} icon={AlertTriangle} delta={kpis?.deltas.zeroResultSearches} danger />
        <KpiCard title="Cliques em categoria" value={kpis?.categoryClicks ?? 0} icon={FolderOpen} delta={kpis?.deltas.categoryClicks} />
        <KpiCard title="Cliques em estab." value={kpis?.cardClicks ?? 0} icon={MousePointer} delta={kpis?.deltas.cardClicks} />
        <KpiCard title="Filtros usados" value={kpis?.filtersUsed ?? 0} icon={FilterIcon} delta={kpis?.deltas.filtersUsed} />
      </div>

      {/* Categorias + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {cats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Estab.</TableHead>
                    <TableHead className="text-right">Avaliados</TableHead>
                    <TableHead className="text-right">Com cupom</TableHead>
                    <TableHead className="text-right">Cliques chip</TableHead>
                    <TableHead className="text-right">Buscas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cats.map(c => (
                    <TableRow key={c.category}>
                      <TableCell className="font-medium">{c.category}</TableCell>
                      <TableCell className="text-right">{c.total}</TableCell>
                      <TableCell className="text-right">{c.pctReviews}%</TableCell>
                      <TableCell className="text-right">{c.pctCoupons}%</TableCell>
                      <TableCell className="text-right font-semibold">{c.clicks}</TableCell>
                      <TableCell className="text-right">{c.searches}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" /> Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem insights no período.</p>
            )}
            {insights.map((i, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-2 p-3 rounded-2xl text-sm",
                  i.type === "positive" && "bg-success/10 text-success",
                  i.type === "warning" && "bg-destructive/10 text-destructive",
                  i.type === "info" && "bg-primary/10 text-primary",
                )}
              >
                {i.type === "warning" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{i.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Top buscas (frequência)</CardTitle></CardHeader>
          <CardContent>
            {!searches?.top.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem buscas no período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Termo</TableHead>
                    <TableHead className="text-right">Vezes</TableHead>
                    <TableHead className="text-right">Resultados (média)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searches.top.map(t => (
                    <TableRow key={t.query}>
                      <TableCell className="font-medium">{t.query}</TableCell>
                      <TableCell className="text-right">{t.count}</TableCell>
                      <TableCell className="text-right">{t.avgResults}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Buscas sem resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!searches?.zeroResults.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma busca sem resultado 🎉</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Termo</TableHead>
                    <TableHead className="text-right">Sem resultado</TableHead>
                    <TableHead className="text-right">% zero</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searches.zeroResults.map(t => (
                    <TableRow key={t.query}>
                      <TableCell className="font-medium">{t.query}</TableCell>
                      <TableCell className="text-right">{t.zero}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={t.zeroPct === 100 ? "destructive" : "secondary"}>{t.zeroPct}%</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <a href={`/admin/estabelecimentos/novo?name=${encodeURIComponent(t.query)}`}>Cadastrar</a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter usage */}
      <Card>
        <CardHeader><CardTitle>Filtros mais usados</CardTitle></CardHeader>
        <CardContent>
          {filters.every(f => f.count === 0) ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum filtro acionado no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filters} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="label" width={140} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular curation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Curadoria de "Populares"
          </CardTitle>
        </CardHeader>
        <CardContent>
          {popular.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem dados suficientes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estabelecimento</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Reações</TableHead>
                  <TableHead className="text-right">Check-ins</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Popular</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popular.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-10 h-10 rounded-2xl object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-muted" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.category}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 fill-rating text-rating" />
                        {p.rating?.toFixed(1) ?? "0.0"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{p.clicks}</TableCell>
                    <TableCell className="text-right">{p.reactions}</TableCell>
                    <TableCell className="text-right">{p.checkins}</TableCell>
                    <TableCell className="text-right font-semibold">{p.score}</TableCell>
                    <TableCell>
                      {p.suggestion === "suggested" && <Badge className="bg-success/10 text-success hover:bg-success/10">Sugerido</Badge>}
                      {p.suggestion === "reevaluate" && <Badge variant="destructive">Reavaliar</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch checked={p.is_popular} onCheckedChange={() => togglePopular(p.id, p.is_popular)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Experiences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Experiências</span>
            <span className="text-xs text-muted-foreground font-normal">{sortedExperiences.length} total</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <Input placeholder="Título" value={newExp.title} onChange={e => setNewExp(p => ({ ...p, title: e.target.value }))} />
            <Input placeholder="URL da imagem" value={newExp.image_url} onChange={e => setNewExp(p => ({ ...p, image_url: e.target.value }))} />
            <Button onClick={saveExperience}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Visualizações</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Ordem</TableHead>
                <TableHead className="text-right w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExperiences.map((exp, idx) => (
                <TableRow key={exp.id}>
                  <TableCell>
                    {exp.image_url ? (
                      <img src={exp.image_url} alt="" className="w-10 h-10 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{exp.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{exp.description ?? "—"}</TableCell>
                  <TableCell className="text-right">{exp.views ?? 0}</TableCell>
                  <TableCell className="text-right">{exp.clicks ?? 0}</TableCell>
                  <TableCell className="text-right">{exp.ctr ?? 0}%</TableCell>
                  <TableCell className="text-right">{exp.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => reorderExperience(exp.id, "up")} disabled={idx === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => reorderExperience(exp.id, "down")} disabled={idx === sortedExperiences.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(exp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteExperience(exp.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit experience sheet */}
      <Sheet open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar experiência</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Título</Label>
                <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  value={editing.description ?? ""}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div>
                <Label>URL da imagem</Label>
                <Input value={editing.image_url ?? ""} onChange={e => setEditing({ ...editing, image_url: e.target.value })} />
                {editing.image_url && (
                  <img src={editing.image_url} alt="preview" className="mt-2 w-full h-40 object-cover rounded-2xl" />
                )}
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={updateExperience} className="flex-1">Salvar</Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
