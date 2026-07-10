import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Compass, MousePointer, MapPin, Ticket, UserPlus,
  TrendingUp, TrendingDown, Lightbulb, AlertTriangle, ImageOff,
  Clock, Tag, Plus, Bell, Route as RouteIcon, Activity, Star, MessageSquare, FileImage, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  getDashboardKPIs, getCatalogHealth, getRecentActivity,
  getCityDistribution, getEngagementTimeseries, getDashboardInsights,
  type Period, type ActivityItem,
} from "../services/adminDashboard";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: { label: string; value: Period }[] = [
    { label: "7 dias", value: 7 },
    { label: "30 dias", value: 30 },
    { label: "90 dias", value: 90 },
    { label: "Tudo", value: "all" },
  ];
  return (
    <div className="inline-flex rounded-lg border bg-card p-1">
      {opts.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition-colors",
            value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({
  title, value, icon: Icon, delta, onClick,
}: {
  title: string; value: string | number; icon: any; delta?: number | null; onClick?: () => void;
}) {
  const isUp = (delta ?? 0) > 0;
  const isDown = (delta ?? 0) < 0;
  return (
    <Card
      className={cn(onClick && "cursor-pointer hover:shadow-md transition-shadow")}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {delta !== undefined && delta !== null && (
              <p className={cn(
                "text-xs mt-1 flex items-center gap-1",
                isUp && "text-success",
                isDown && "text-destructive",
                !isUp && !isDown && "text-muted-foreground",
              )}>
                {isUp && <TrendingUp className="w-3 h-3" />}
                {isDown && <TrendingDown className="w-3 h-3" />}
                {delta > 0 ? "+" : ""}{delta}% vs. anterior
              </p>
            )}
            {delta === null && (
              <p className="text-xs mt-1 text-muted-foreground">Sem dados anteriores</p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const ACTIVITY_ICONS = {
  user: UserPlus, checkin: MapPin, review: Star, post: FileImage, coupon: Ticket,
} as const;

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = ACTIVITY_ICONS[item.type];
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>(7);
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof getDashboardKPIs>> | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getCatalogHealth>> | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [cities, setCities] = useState<Awaited<ReturnType<typeof getCityDistribution>>>([]);
  const [series, setSeries] = useState<Awaited<ReturnType<typeof getEngagementTimeseries>>>([]);
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof getDashboardInsights>>>([]);

  useEffect(() => {
    getDashboardKPIs(period).then(setKpis);
    getEngagementTimeseries(period).then(setSeries);
    getDashboardInsights(period).then(setInsights);
  }, [period]);

  useEffect(() => {
    getCatalogHealth().then(setHealth);
    getRecentActivity(8).then(setActivity);
    getCityDistribution().then(setCities);
  }, []);

  const healthIssues = health ? [
    { label: "Sem foto", count: health.noPhoto, icon: ImageOff, link: "/admin/estabelecimentos?quality=no_photo" },
    { label: "Sem coordenadas", count: health.noCoords, icon: MapPin, link: "/admin/estabelecimentos?quality=no_coords" },
    { label: "Sem horário", count: health.noHours, icon: Clock, link: "/admin/estabelecimentos?quality=no_hours" },
    { label: "Sem categoria", count: health.noCategory, icon: Tag, link: "/admin/estabelecimentos?quality=no_category" },
    { label: "Rating baixo (<3)", count: health.lowRating, icon: Star, link: "/admin/estabelecimentos?quality=low_rating" },
    { label: "Cupons expirando 7d", count: health.expiringCoupons, icon: Ticket, link: "/admin/cupons" },
  ].filter(i => i.count > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Visão Geral</h2>
          <p className="text-sm text-muted-foreground">Saúde do app, engajamento e atividade em tempo real.</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Usuários ativos" value={kpis?.activeUsers ?? 0} icon={Users} delta={kpis?.deltas.activeUsers} onClick={() => navigate("/admin/usuarios")} />
        <KpiCard title="Sessões Explorar" value={kpis?.exploreSessions ?? 0} icon={Compass} delta={kpis?.deltas.exploreSessions} onClick={() => navigate("/admin/explorar")} />
        <KpiCard title="Cliques no Feed" value={kpis?.feedClicks ?? 0} icon={MousePointer} delta={kpis?.deltas.feedClicks} onClick={() => navigate("/admin/feed")} />
        <KpiCard title="Check-ins" value={kpis?.checkIns ?? 0} icon={MapPin} delta={kpis?.deltas.checkIns} />
        <KpiCard title="Cupons resgatados" value={kpis?.couponsRedeemed ?? 0} icon={Ticket} delta={kpis?.deltas.couponsRedeemed} onClick={() => navigate("/admin/cupons")} />
        <KpiCard title="Novos cadastros" value={kpis?.newUsers ?? 0} icon={UserPlus} delta={kpis?.deltas.newUsers} onClick={() => navigate("/admin/usuarios")} />
      </div>

      {/* Health + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-warning" /> Saúde do catálogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!health ? (
              <Skeleton className="h-32" />
            ) : healthIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Tudo em ordem. Catálogo completo ✓</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {healthIssues.map(i => (
                  <button
                    key={i.label}
                    onClick={() => navigate(i.link)}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <i.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{i.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold">{i.count}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-primary" /> Atividade ao vivo
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem atividade recente.</p>
            ) : activity.map(a => <ActivityRow key={a.id} item={a} />)}
          </CardContent>
        </Card>
      </div>

      {/* Engagement timeseries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engajamento ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="impressions" name="Impressões" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clicks" name="Cliques" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="checkins" name="Check-ins" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cities + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de usuários por cidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cities.length === 0 ? (
              <Skeleton className="h-24" />
            ) : cities.slice(0, 5).map(c => (
              <div key={c.city}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{c.city}</span>
                  <span className="text-muted-foreground">{c.count} ({c.pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-4 h-4 text-warning" /> Insights automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem insights no momento.</p>
            ) : insights.map((i, idx) => (
              <div key={idx} className={cn(
                "flex items-start gap-2 p-3 rounded-lg text-sm",
                i.type === "positive" && "bg-success/10 text-success-foreground",
                i.type === "warning" && "bg-warning/10",
                i.type === "info" && "bg-info/10",
              )}>
                <span className="mt-0.5">{i.type === "positive" ? "✓" : i.type === "warning" ? "⚠" : "ℹ"}</span>
                <span>{i.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/admin/estabelecimentos/novo")}>
              <Plus className="w-4 h-4 mr-1" /> Novo estabelecimento
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/cupons")}>
              <Ticket className="w-4 h-4 mr-1" /> Novo cupom
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/notificacoes")}>
              <Bell className="w-4 h-4 mr-1" /> Nova notificação
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/roteiros")}>
              <RouteIcon className="w-4 h-4 mr-1" /> Novo roteiro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
