import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  Send, Bell, Eye, MousePointer, Clock, Users, Sparkles, TrendingUp, TrendingDown,
  Calendar, Copy, Trash2, RefreshCw, AlertTriangle, Lightbulb, Image as ImageIcon, Beaker, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type Period, type AudienceSegment, type NotificationPayload, NOTIFICATION_TEMPLATES,
  getNotificationKPIs, listNotificationsWithPerformance, getNotificationInsights,
  createNotification, updateNotification, deleteNotification, duplicateNotification,
  sendNotification, sendTestToCurrentUser, cancelScheduled, resendToUnread,
  estimateAudience, processDueScheduled,
} from "../services/adminNotifications";
import ImageUploadCrop from "../components/ImageUploadCrop";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "../components/ui/KpiCard";

// ---------- Mobile preview ----------
function NotificationPreview({ p }: { p: NotificationPayload }) {
  return (
    <div className="bg-muted/40 rounded-2xl p-4">
      <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5" /> Pré-visualização (mobile)
      </p>
      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden max-w-sm mx-auto">
        <div className="p-3 border-b border-border/50 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">Notificações</span>
        </div>
        <div className="flex items-start gap-3 p-4 border-l-4 border-l-primary bg-primary/5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {p.title || "Título da notificação"}
            </p>
            {p.body && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">{p.body}</p>
            )}
            {p.image_url && (
              <img src={p.image_url} alt="" className="mt-2 rounded-2xl w-full max-h-32 object-cover" />
            )}
            <p className="text-xs text-muted-foreground/70 mt-1.5">Agora</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-primary mt-1.5" />
        </div>
      </div>
    </div>
  );
}

// ---------- Composer ----------
const INTERNAL_ROUTES = [
  { v: "/", label: "Feed" },
  { v: "/map", label: "Explorar (mapa)" },
  { v: "/coupons", label: "Cupons" },
  { v: "/roteiros", label: "Roteiros" },
  { v: "/perfil", label: "Perfil" },
  { v: "/perfil/badges", label: "Badges" },
];

const TYPES = [
  { v: "system", label: "Sistema" },
  { v: "promo", label: "Promoção" },
  { v: "coupon", label: "Cupom" },
  { v: "badge", label: "Badge" },
  { v: "nearby", label: "Próximo" },
  { v: "trending", label: "Em alta" },
];

function NotificationComposer({
  initial, onSaved,
}: { initial?: NotificationPayload; onSaved: () => void }) {
  const [p, setP] = useState<NotificationPayload>(
    initial ?? {
      title: "", body: "", type: "system",
      image_url: null, redirect_type: null, redirect_url: null,
      segment: { kind: "all" }, scheduled_at: null,
    }
  );
  const [actionMode, setActionMode] = useState<"none" | "internal" | "external">(
    initial?.redirect_type ?? "none" as any
  );
  const [audience, setAudience] = useState<string>(() => {
    const s = initial?.segment;
    if (!s || s.kind === "all") return "all";
    if (s.kind === "city") return `city:${s.city}`;
    if (s.kind === "engagement") return `engagement:${s.bucket}`;
    return "all";
  });
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">(initial?.scheduled_at ? "later" : "now");
  const [scheduledAt, setScheduledAt] = useState<string>(initial?.scheduled_at?.slice(0, 16) ?? "");
  const [estimate, setEstimate] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const segment: AudienceSegment = useMemo(() => {
    if (audience === "all") return { kind: "all" };
    if (audience.startsWith("city:")) return { kind: "city", city: audience.split(":")[1] as any };
    if (audience.startsWith("engagement:")) return { kind: "engagement", bucket: audience.split(":")[1] as any };
    return { kind: "all" };
  }, [audience]);

  useEffect(() => {
    let cancelled = false;
    estimateAudience(segment).then(n => { if (!cancelled) setEstimate(n); });
    return () => { cancelled = true; };
  }, [audience]);

  const titleLen = p.title.length;
  const bodyLen = p.body.length;
  const titleOver = titleLen > 60;
  const bodyOver = bodyLen > 180;

  function buildPayload(): NotificationPayload {
    return {
      ...p,
      segment,
      redirect_type: actionMode === "none" ? null : actionMode,
      redirect_url: actionMode === "none" ? null : (p.redirect_url ?? ""),
      scheduled_at: scheduleMode === "later" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    };
  }

  async function handleSendOrSchedule() {
    if (!p.title || !p.body) { toast.error("Título e corpo são obrigatórios"); return; }
    if (titleOver || bodyOver) { toast.error("Texto excede o limite recomendado"); return; }
    setBusy(true);
    try {
      const payload = buildPayload();
      const { data, error } = await createNotification(payload);
      if (error || !data) { toast.error("Erro ao criar"); return; }
      if (scheduleMode === "now") {
        const res = await sendNotification((data as any).id);
        if (res.error) toast.error("Criada, mas falhou ao enviar");
        else toast.success(`Enviada para ${res.recipients} usuário(s)`);
      } else {
        toast.success(`Agendada para ${new Date(scheduledAt).toLocaleString("pt-BR")}`);
      }
      onSaved();
      setP({ title: "", body: "", type: "system", image_url: null, redirect_type: null, redirect_url: null, segment: { kind: "all" }, scheduled_at: null });
      setActionMode("none"); setAudience("all"); setScheduleMode("now"); setScheduledAt("");
    } finally { setBusy(false); }
  }

  async function handleTest() {
    if (!p.title || !p.body) { toast.error("Preencha título e corpo"); return; }
    const { error } = await sendTestToCurrentUser(buildPayload());
    if (error) toast.error("Erro ao enviar teste");
    else toast.success("Teste enviado para você");
  }

  function applyTemplate(key: string) {
    const t = NOTIFICATION_TEMPLATES.find(x => x.key === key);
    if (!t) return;
    setP(prev => ({ ...prev, title: t.title, body: t.body, type: t.type, redirect_type: t.redirect_type, redirect_url: t.redirect_url }));
    setActionMode((t.redirect_type ?? "none") as any);
    toast.success(`Template "${t.label}" aplicado`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
      <div className="space-y-6">
        {/* Templates row */}
        <div className="flex flex-wrap gap-2">
          {NOTIFICATION_TEMPLATES.map(t => (
            <Button key={t.key} variant="outline" size="sm" onClick={() => applyTemplate(t.key)}>
              <FileText className="h-3.5 w-3.5" /> {t.label}
            </Button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Conteúdo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={p.type} onValueChange={v => setP(s => ({ ...s, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center justify-between">
                Título <span className={cn("text-xs", titleOver ? "text-destructive" : "text-muted-foreground")}>{titleLen}/60</span>
              </Label>
              <Input value={p.title} onChange={e => setP(s => ({ ...s, title: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="flex items-center justify-between">
              Corpo <span className={cn("text-xs", bodyOver ? "text-destructive" : "text-muted-foreground")}>{bodyLen}/180</span>
            </Label>
            <Textarea rows={3} value={p.body} onChange={e => setP(s => ({ ...s, body: e.target.value }))} />
          </div>
          <div>
            <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Imagem (opcional)</Label>
            <ImageUploadCrop
              value={p.image_url ?? null}
              onChange={(url) => setP(s => ({ ...s, image_url: url }))}
              aspect={2}
              bucket="establishments"
              storagePath="notifications/banner_"
              label="Banner"
            />
          </div>
        </div>

        {/* Ação */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><MousePointer className="w-4 h-4 text-primary" /> Ação ao tocar</h3>
          <Select value={actionMode} onValueChange={(v: any) => setActionMode(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              <SelectItem value="internal">Abrir tela do app</SelectItem>
              <SelectItem value="external">Abrir URL externa</SelectItem>
            </SelectContent>
          </Select>
          {actionMode === "internal" && (
            <Select value={p.redirect_url ?? ""} onValueChange={v => setP(s => ({ ...s, redirect_url: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione a tela" /></SelectTrigger>
              <SelectContent>{INTERNAL_ROUTES.map(r => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {actionMode === "external" && (
            <Input placeholder="https://..." value={p.redirect_url ?? ""} onChange={e => setP(s => ({ ...s, redirect_url: e.target.value }))} />
          )}
        </div>

        {/* Audiência */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Audiência</h3>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              <SelectItem value="city:Gramado">Cidade · Gramado</SelectItem>
              <SelectItem value="city:Canela">Cidade · Canela</SelectItem>
              <SelectItem value="engagement:active7">Ativos nos últimos 7 dias</SelectItem>
              <SelectItem value="engagement:active30">Ativos nos últimos 30 dias</SelectItem>
              <SelectItem value="engagement:inactive30">Inativos há mais de 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {estimate === null ? "Estimando…" : <>Audiência estimada: <strong>{estimate}</strong> usuário(s)</>}
          </p>
        </div>

        {/* Quando */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Quando enviar</h3>
          <div className="flex items-center gap-3">
            <Button variant={scheduleMode === "now" ? "default" : "outline"} size="sm" onClick={() => setScheduleMode("now")}>Agora</Button>
            <Button variant={scheduleMode === "later" ? "default" : "outline"} size="sm" onClick={() => setScheduleMode("later")}>
              <Calendar className="h-3.5 w-3.5" /> Agendar
            </Button>
            {scheduleMode === "later" && (
              <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="max-w-[220px]" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleTest}>
            <Beaker className="h-4 w-4" /> Enviar teste para mim
          </Button>
          <Button onClick={handleSendOrSchedule} disabled={busy}>
            <Send className="h-4 w-4" />
            {scheduleMode === "now" ? "Enviar agora" : "Agendar envio"}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 self-start">
        <NotificationPreview p={{ ...p, redirect_type: actionMode === "none" ? null : actionMode }} />
        <div className="mt-3 space-y-1 text-xs">
          {titleOver && <p className="text-destructive">⚠ Título acima do recomendado</p>}
          {bodyOver && <p className="text-destructive">⚠ Corpo acima do recomendado</p>}
          {actionMode === "none" && <p className="text-muted-foreground">ℹ Sem ação configurada — tocar não abrirá nada</p>}
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function NotificationsPage() {
  const [period, setPeriod] = useState<Period>(7);
  const [kpis, setKpis] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [insights, setInsights] = useState<{ type: string; text: string }[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [k, l, i] = await Promise.all([
      getNotificationKPIs(period),
      listNotificationsWithPerformance(period),
      getNotificationInsights(period),
    ]);
    setKpis(k); setList(l); setInsights(i);
    setLoading(false);
  }
  useEffect(() => { load(); }, [period]);

  async function handleProcessDue() {
    const r = await processDueScheduled();
    toast.success(`${r.sent}/${r.processed} envio(s) processado(s)`);
    load();
  }

  async function handleDelete(id: string) {
    const { error } = await deleteNotification(id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluída"); load(); }
  }

  async function handleDuplicate(id: string) {
    const { error } = await duplicateNotification(id);
    if (error) toast.error("Erro ao duplicar");
    else { toast.success("Duplicada como rascunho"); load(); }
  }

  async function handleCancel(id: string) {
    const { error } = await cancelScheduled(id);
    if (error) toast.error("Erro ao cancelar");
    else { toast.success("Agendamento cancelado"); load(); }
  }

  async function handleResend(id: string) {
    const r = await resendToUnread(id);
    if (r.error) toast.error("Erro");
    else toast.success(`Reenviada para ${r.recipients} não-lidos`);
    load();
  }

  async function handleSendNow(id: string) {
    const r = await sendNotification(id);
    if (r.error) toast.error("Erro ao enviar");
    else toast.success(`Enviada para ${r.recipients} usuário(s)`);
    load();
  }

  function statusOf(n: any) {
    if (n.sent) return { label: "Enviada", variant: "success" as const };
    if (n.scheduled_at && new Date(n.scheduled_at) > new Date()) return { label: "Agendada", variant: "warning" as const };
    return { label: "Rascunho", variant: "info" as const };
  }

  function audienceLabel(n: any): string {
    if (n.target === "ids") return `Lista · ${(n.target_ids?.length ?? 0)}`;
    if (n.segment?.startsWith("city:")) return `Cidade · ${n.segment.split(":")[1]}`;
    if (n.segment?.startsWith("engagement:")) return `Engajamento · ${n.segment.split(":")[1]}`;
    return "Todos";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notificações</h2>
        <div className="flex items-center gap-2">
          <Tabs value={String(period)} onValueChange={v => setPeriod(v === "all" ? "all" : Number(v) as Period)}>
            <TabsList>
              <TabsTrigger value="7">7d</TabsTrigger>
              <TabsTrigger value="30">30d</TabsTrigger>
              <TabsTrigger value="90">90d</TabsTrigger>
              <TabsTrigger value="all">Tudo</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={handleProcessDue}>
            <RefreshCw className="h-4 w-4" /> Processar agendadas
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard title="Enviadas" value={kpis?.sent.value ?? "—"} delta={kpis?.sent.delta} icon={Send} />
        <KpiCard title="Alcance" value={kpis?.reach.value ?? "—"} delta={kpis?.reach.delta} icon={Users} />
        <KpiCard title="Taxa de leitura" value={kpis?.readRate.value ?? "—"} suffix="%" delta={kpis?.readRate.delta} icon={Eye} />
        <KpiCard title="CTR" value={kpis?.ctr.value ?? "—"} suffix="%" delta={kpis?.ctr.delta} icon={MousePointer} />
        <KpiCard title="Agendadas" value={kpis?.scheduledPending.value ?? "—"} icon={Clock} />
        <KpiCard title="Usuários ativos (30d)" value={kpis?.activeUsers.value ?? "—"} icon={Bell} />
      </div>

      {/* Composer */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Nova notificação</CardTitle></CardHeader>
        <CardContent><NotificationComposer onSaved={load} /></CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> Insights automáticos</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((i, idx) => (
                <li key={idx} className={cn("text-sm flex items-start gap-2 p-3 rounded-2xl",
                  i.type === "warning" && "bg-destructive/10 text-destructive",
                  i.type === "positive" && "bg-success/10 text-success",
                  i.type === "info" && "bg-muted")}>
                  {i.type === "warning" ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                   : i.type === "positive" ? <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                   : <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />}
                  <span>{i.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Histórico e desempenho</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notificação</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Audiência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Alcance</TableHead>
                <TableHead className="text-right">Lidas</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sem notificações no período</TableCell></TableRow>
              ) : list.map((n: any) => {
                const s = statusOf(n);
                const when = n.sent_at ? new Date(n.sent_at).toLocaleString("pt-BR")
                  : n.scheduled_at ? `→ ${new Date(n.scheduled_at).toLocaleString("pt-BR")}`
                  : "—";
                return (
                  <TableRow key={n.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {n.image_url
                          ? <img src={n.image_url} className="w-8 h-8 rounded object-cover" alt="" />
                          : <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center"><Bell className="w-4 h-4 text-primary" /></div>}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[260px]">{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[260px]">{n.body}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs">{n.type}</span></TableCell>
                    <TableCell><span className="text-xs">{audienceLabel(n)}</span></TableCell>
                    <TableCell><StatusBadge label={s.label} variant={s.variant} /></TableCell>
                    <TableCell className="text-right tabular-nums">{n.reach}</TableCell>
                    <TableCell className="text-right tabular-nums">{n.read} <span className="text-xs text-muted-foreground">({n.readRate}%)</span></TableCell>
                    <TableCell className="text-right tabular-nums">{n.ctr}%</TableCell>
                    <TableCell className="text-xs">{when}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!n.sent && (
                          <Button variant="outline" size="sm" onClick={() => handleSendNow(n.id)}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {n.sent && (
                          <Button variant="outline" size="sm" onClick={() => handleResend(n.id)} title="Reenviar para não-lidos">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {!n.sent && n.scheduled_at && (
                          <Button variant="outline" size="sm" onClick={() => handleCancel(n.id)} title="Cancelar agendamento">
                            <Clock className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDuplicate(n.id)} title="Duplicar">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(n.id)} title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
