import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  Plus, Pencil, Trash2, Search, Star, MapPin as MapPinIcon, Eye, MousePointer,
  Heart, AlertTriangle, CheckCircle2, ExternalLink, Copy, TrendingUp, Lightbulb,
  Store, Image as ImageIcon, Percent,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listEstablishments, getEstablishmentsKPIs, getEstablishmentInsights,
  bulkUpdate, togglePopular, duplicateEstablishment,
  type Period, type Quality, type SortBy, type EstRow,
} from "../services/adminEstablishments";
import { EstablishmentDetailsDrawer } from "../components/EstablishmentDetailsDrawer";

const CATEGORIES = ["Todos", "Restaurantes", "Cafés", "Hotéis", "Atrações", "Compras", "Bares & Vinícolas"];

import { PeriodSelector } from "../components/ui/PeriodSelector";

function MiniKpi({ icon: Icon, label, value, hint }: { icon: any; label: string; value: any; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-0.5">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PAGE_SIZE = 25;

export default function Establishments() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [period, setPeriod] = useState<Period>(30);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [status, setStatus] = useState<"all" | "open" | "closed" | "popular">("all");
  const [quality, setQuality] = useState<Quality>((params.get("quality") as Quality) ?? "all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<EstRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof getEstablishmentsKPIs>> | null>(null);
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof getEstablishmentInsights>>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("quality") && quality !== params.get("quality")) {
      setQuality(params.get("quality") as Quality);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function load() {
    setLoading(true);
    const r = await listEstablishments({ search, category, status, quality, sortBy, period });
    setRows(r);
    setLoading(false);
    setSelected(new Set());
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category, status, quality, sortBy, period]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [search]);

  useEffect(() => {
    getEstablishmentsKPIs(period).then(setKpis);
    getEstablishmentInsights(period).then(setInsights);
  }, [period]);

  useEffect(() => { setPage(1); }, [search, category, status, quality, sortBy]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(pageRows.map(r => r.id)));
    else setSelected(new Set());
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("establishments").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Estabelecimento excluído");
    load();
  }

  async function handleBulk(action: "open" | "closed" | "popular" | "unpopular" | "delete") {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (action === "delete") {
      const { error } = await supabase.from("establishments").delete().in("id", ids);
      if (error) toast.error("Erro ao excluir"); else toast.success(`${ids.length} excluído(s)`);
    } else {
      const patch =
        action === "open" ? { is_open: true } :
        action === "closed" ? { is_open: false } :
        action === "popular" ? { is_popular: true } : { is_popular: false };
      const { error } = await bulkUpdate(ids, patch as any);
      if (error) toast.error("Erro"); else toast.success("Atualizado");
    }
    load();
  }

  async function handleDuplicate(id: string) {
    const r = await duplicateEstablishment(id);
    if ((r as any).error) toast.error("Erro ao duplicar"); else toast.success("Duplicado");
    load();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Estabelecimentos</h2>
          <p className="text-sm text-muted-foreground">Gestão completa do catálogo, qualidade e performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} onChange={setPeriod} />
          <Button onClick={() => navigate("/admin/estabelecimentos/novo")}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniKpi icon={Store} label="Total" value={kpis?.total ?? 0} hint={`${kpis?.open ?? 0} abertos`} />
        <MiniKpi icon={Star} label="Rating médio" value={(kpis?.avgRating ?? 0).toFixed(1)} />
        <MiniKpi icon={TrendingUp} label="Populares" value={kpis?.populars ?? 0} />
        <MiniKpi icon={Percent} label="Com cupom" value={kpis?.withCoupon ?? 0} />
        <MiniKpi icon={AlertTriangle} label="Incompletos" value={kpis?.incomplete ?? 0} />
        <MiniKpi icon={Eye} label="Sem impressão" value={kpis?.noImpressions ?? 0} hint="no período" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou slug..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={v => setStatus(v as any)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="closed">Fechados</SelectItem>
            <SelectItem value="popular">Populares</SelectItem>
          </SelectContent>
        </Select>
        <Select value={quality} onValueChange={v => { setQuality(v as Quality); const np = new URLSearchParams(params); v === "all" ? np.delete("quality") : np.set("quality", v); setParams(np); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Qualidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda qualidade</SelectItem>
            <SelectItem value="no_photo">Sem foto</SelectItem>
            <SelectItem value="no_coords">Sem coordenadas</SelectItem>
            <SelectItem value="no_hours">Sem horário</SelectItem>
            <SelectItem value="no_category">Sem categoria</SelectItem>
            <SelectItem value="low_rating">Rating &lt; 3</SelectItem>
            <SelectItem value="no_impressions">Sem impressão</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome (A→Z)</SelectItem>
            <SelectItem value="rating">Melhor avaliado</SelectItem>
            <SelectItem value="impressions">Mais visualizado</SelectItem>
            <SelectItem value="favorites">Mais favoritado</SelectItem>
            <SelectItem value="checkins">Mais check-ins</SelectItem>
            <SelectItem value="recent">Mais recente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 px-3 rounded-2xl border bg-muted/30">
          <span className="text-sm">{selected.size} selecionado(s)</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => handleBulk("open")}>Ativar</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulk("closed")}>Desativar</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulk("popular")}>Marcar popular</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulk("unpopular")}>Tirar popular</Button>
          <Button size="sm" variant="destructive" onClick={() => handleBulk("delete")}>Excluir</Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={pageRows.length > 0 && selected.size === pageRows.length} onCheckedChange={(v) => toggleAll(!!v)} />
              </TableHead>
              <TableHead className="w-14">Img</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Saúde</TableHead>
              <TableHead className="text-right">Impr.</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Fav.</TableHead>
              <TableHead className="text-right">Check-ins</TableHead>
              <TableHead className="text-right w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Nenhum estabelecimento encontrado</TableCell></TableRow>
            ) : pageRows.map(est => (
              <TableRow key={est.id} className="cursor-pointer" onClick={() => setDrawerId(est.id)}>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox checked={selected.has(est.id)} onCheckedChange={() => toggleOne(est.id)} />
                </TableCell>
                <TableCell>
                  {est.image_url ? (
                    <img src={est.image_url} alt={`Foto de ${est.name}`} className="w-10 h-10 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium max-w-[200px]">
                  <div className="truncate">{est.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{est.slug}</div>
                </TableCell>
                <TableCell className="text-sm">{est.category}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-rating text-rating" />
                    {est.rating?.toFixed(1) ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <StatusBadge label={est.is_open ? "Aberto" : "Fechado"} variant={est.is_open ? "success" : "destructive"} />
                    {est.is_popular && <StatusBadge label="Popular" variant="info" />}
                  </div>
                </TableCell>
                <TableCell>
                  {est.health.complete ? (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-warning" title={est.health.issues.join(", ")}>
                      <AlertTriangle className="w-3.5 h-3.5" /> {est.health.issues.length} pendência{est.health.issues.length > 1 ? "s" : ""}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">{est.impressions}</TableCell>
                <TableCell className="text-right text-sm">{est.ctr}%</TableCell>
                <TableCell className="text-right text-sm">{est.favorites}</TableCell>
                <TableCell className="text-right text-sm">{est.checkins}</TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => navigate(`/admin/estabelecimentos/${est.id}`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Ver no app" onClick={() => window.open(`/estabelecimento/${est.slug}`, "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Duplicar" onClick={() => handleDuplicate(est.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title={est.is_popular ? "Tirar popular" : "Marcar popular"} onClick={async () => { await togglePopular(est.id, !est.is_popular); load(); }}>
                      <TrendingUp className={cn("h-4 w-4", est.is_popular && "text-primary")} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir estabelecimento?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita. O estabelecimento "{est.name}" será removido permanentemente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(est.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} de {rows.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="px-3 py-1.5">Página {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <Lightbulb className="w-4 h-4 text-warning" /> Insights do catálogo
            </div>
            {insights.map((i, idx) => (
              <div key={idx} className={cn(
                "flex items-start gap-2 p-2.5 rounded-2xl text-sm",
                i.type === "positive" && "bg-success/10",
                i.type === "warning" && "bg-warning/10",
                i.type === "info" && "bg-info/10",
              )}>
                <span className="mt-0.5">{i.type === "positive" ? "✓" : i.type === "warning" ? "⚠" : "ℹ"}</span>
                <span>{i.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <EstablishmentDetailsDrawer
        establishmentId={drawerId}
        period={period}
        onClose={() => setDrawerId(null)}
        onChanged={load}
      />
    </div>
  );
}
