import { useEffect, useMemo, useState } from "react";
import {
  Eye, MousePointer, Percent, Heart, Bookmark, FileImage,
  TrendingUp, TrendingDown, ArrowUpRight, Lightbulb, AlertTriangle, Users,
} from "lucide-react";
import {
  getFeedKPIs,
  getPostsPerformance,
  getImpressionsAndClicksByDay,
  getEngagementByWeekday,
  getReactionsBreakdown,
  getTopEstablishmentsInFeed,
  getCategoriesPerformance,
  getFeedInsights,
} from "../services/adminAnalytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

type Period = 7 | 30 | 90 | "all";

// ---------- Local KPI card with delta ----------
function KpiCard({
  title, value, icon: Icon, delta, suffix,
}: {
  title: string;
  value: string | number;
  icon: any;
  delta?: number | null;
  suffix?: string;
}) {
  const isUp = (delta ?? 0) > 0;
  const isDown = (delta ?? 0) < 0;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1 truncate">
              {value}{suffix ?? ""}
            </p>
            {delta !== undefined && delta !== null && (
              <p className={cn(
                "text-xs mt-1 flex items-center gap-1",
                isUp && "text-success",
                isDown && "text-destructive",
                !isUp && !isDown && "text-muted-foreground",
              )}>
                {isUp && <TrendingUp className="w-3 h-3" />}
                {isDown && <TrendingDown className="w-3 h-3" />}
                {delta > 0 ? "+" : ""}{delta}% vs. período anterior
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

// ---------- Period selector ----------
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

function ctrVariant(ctr: number): "success" | "info" | "destructive" {
  if (ctr >= 5) return "success";
  if (ctr >= 2) return "info";
  return "destructive";
}

export default function FeedPage() {
  const [period, setPeriod] = useState<Period>(7);

  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof getFeedKPIs>> | null>(null);
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof getPostsPerformance>>>([]);
  const [chartData, setChartData] = useState<{ date: string; impressions: number; clicks: number }[]>([]);
  const [weekday, setWeekday] = useState<Awaited<ReturnType<typeof getEngagementByWeekday>>>([]);
  const [reactions, setReactions] = useState<Awaited<ReturnType<typeof getReactionsBreakdown>>>([]);
  const [topEst, setTopEst] = useState<Awaited<ReturnType<typeof getTopEstablishmentsInFeed>>>([]);
  const [cats, setCats] = useState<Awaited<ReturnType<typeof getCategoriesPerformance>>>([]);
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof getFeedInsights>>>([]);

  useEffect(() => {
    const chartDays = period === "all" ? 90 : period;
    getFeedKPIs(period).then(setKpis);
    getPostsPerformance(period).then(setPosts);
    getImpressionsAndClicksByDay(chartDays).then(setChartData);
    getEngagementByWeekday(period).then(setWeekday);
    getReactionsBreakdown(period).then(setReactions);
    getTopEstablishmentsInFeed(period, 5).then(setTopEst);
    getCategoriesPerformance(period).then(setCats);
    getFeedInsights(period).then(setInsights);
  }, [period]);

  const topPosts = useMemo(() => posts.slice(0, 10), [posts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Análise do Feed</h2>
          <p className="text-sm text-muted-foreground">Visão completa de performance, engajamento e conteúdo.</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Impressões" value={kpis?.impressions ?? 0} icon={Eye} delta={kpis?.deltas.impressions} />
        <KpiCard title="Cliques" value={kpis?.clicks ?? 0} icon={MousePointer} delta={kpis?.deltas.clicks} />
        <KpiCard title="Cliques únicos" value={kpis?.uniqueClickUsers ?? 0} icon={Users} delta={kpis?.deltas.uniqueClickUsers} />
        <KpiCard title="CTR" value={kpis?.ctr ?? "0"} suffix="%" icon={Percent} delta={kpis?.deltas.ctr} />
        <KpiCard title="Reações" value={kpis?.totalReactions ?? 0} icon={Heart} delta={kpis?.deltas.totalReactions} />
        <KpiCard title="Salvamentos" value={kpis?.savedCount ?? 0} icon={Bookmark} delta={kpis?.deltas.savedCount} />
      </div>

      {/* Chart + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Impressões vs. Cliques</span>
              <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                <FileImage className="w-3.5 h-3.5" />
                {kpis?.activePosts ?? 0} posts ativos
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={v => v.slice(5)} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" name="Impressões" dataKey="impressions" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" name="Cliques" dataKey="clicks" stroke="hsl(var(--destructive))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Insights
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
                  "flex gap-2 p-3 rounded-lg text-sm",
                  i.type === "positive" && "bg-success/10 text-success",
                  i.type === "warning" && "bg-destructive/10 text-destructive",
                  i.type === "info" && "bg-primary/10 text-primary"
                )}
              >
                {i.type === "warning" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{i.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Weekday + Reactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Engajamento por dia da semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekday}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="weekday" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar name="Impressões" dataKey="impressions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar name="Cliques" dataKey="clicks" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de reações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reactions.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma reação no período.</p>
            )}
            {reactions.map(r => (
              <div key={r.emoji} className="flex items-center gap-3">
                <span className="text-2xl w-8 text-center">{r.emoji}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{r.count} reações</span>
                    <span className="text-muted-foreground">{r.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top posts */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 posts (por impressões)</CardTitle>
        </CardHeader>
        <CardContent>
          {topPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem posts no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead>Estabelecimento</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Reações</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPosts.map(p => (
                  <TableRow key={p.postId}>
                    <TableCell>
                      {p.image ? (
                        <img src={p.image} alt="" className="w-10 h-10 rounded-md object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{p.establishmentName}</div>
                      <div className="text-xs text-muted-foreground">{p.establishmentCategory}</div>
                    </TableCell>
                    <TableCell className="text-right">{p.impressions}</TableCell>
                    <TableCell className="text-right">{p.clicks}</TableCell>
                    <TableCell className="text-right">
                      <StatusBadge label={`${p.ctr}%`} variant={ctrVariant(parseFloat(p.ctr))} />
                    </TableCell>
                    <TableCell className="text-right">{p.reactions}</TableCell>
                    <TableCell>
                      {p.establishmentSlug && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label="Abrir no app"
                        >
                          <a href={`/estabelecimento/${p.establishmentSlug}`} target="_blank" rel="noreferrer">
                            <ArrowUpRight className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top establishments + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 estabelecimentos no feed</CardTitle>
          </CardHeader>
          <CardContent>
            {topEst.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
            ) : (
              <div className="space-y-3">
                {topEst.map((e, i) => (
                  <div key={e.establishmentId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                    {e.logo_url ? (
                      <img src={e.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{e.impressions}</div>
                      <div className="text-xs text-muted-foreground">CTR {e.ctr}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CTR médio por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {cats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cats} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" unit="%" />
                    <YAxis type="category" dataKey="category" width={90} />
                    <Tooltip />
                    <Bar dataKey="ctr" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
