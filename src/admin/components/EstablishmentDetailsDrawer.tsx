import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./ui/StatusBadge";
import { Star, Eye, MousePointer, Heart, MapPin, MessageSquare, Ticket, Pencil, ExternalLink, Copy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getEstablishmentPerformance, duplicateEstablishment, type Period } from "../services/adminEstablishments";
import { toast } from "sonner";

interface Props {
  establishmentId: string | null;
  period: Period;
  onClose: () => void;
  onChanged?: () => void;
}

export function EstablishmentDetailsDrawer({ establishmentId, period, onClose, onChanged }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof getEstablishmentPerformance>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!establishmentId) return;
    setLoading(true);
    getEstablishmentPerformance(establishmentId, period)
      .then(setData)
      .finally(() => setLoading(false));
  }, [establishmentId, period]);

  const e = data?.establishment;

  async function handleDuplicate() {
    if (!establishmentId) return;
    const res = await duplicateEstablishment(establishmentId);
    if ((res as any).error) { toast.error("Erro ao duplicar"); return; }
    toast.success("Duplicado com sucesso");
    onChanged?.();
  }

  return (
    <Sheet open={!!establishmentId} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes & Performance</SheetTitle>
        </SheetHeader>

        {loading || !data ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !e ? (
          <p className="mt-6 text-sm text-muted-foreground">Estabelecimento não encontrado.</p>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Header */}
            <div className="flex gap-4">
              {e.image_url ? (
                <img src={e.image_url} alt={e.name} className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{e.name}</h3>
                <p className="text-sm text-muted-foreground">{e.category}</p>
                <div className="flex gap-2 mt-2">
                  <StatusBadge label={e.is_open ? "Aberto" : "Fechado"} variant={e.is_open ? "success" : "destructive"} />
                  {e.is_popular && <StatusBadge label="Popular" variant="info" />}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3.5 h-3.5 fill-rating text-rating" />
                    {(e.rating ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <Kpi icon={Eye} label="Impressões" value={data.impressions} />
              <Kpi icon={MousePointer} label="Cliques" value={data.clicks} />
              <Kpi icon={() => <span className="text-xs font-bold">%</span>} label="CTR" value={`${data.ctr}%`} />
              <Kpi icon={Heart} label="Favoritos" value={data.favorites} />
              <Kpi icon={MapPin} label="Check-ins" value={data.checkins} />
              <Kpi icon={MessageSquare} label="Avaliações" value={data.reviews} />
              <Kpi icon={Ticket} label="Cupons usados" value={data.couponsRedeemed} />
              <Kpi icon={Star} label="Nota média" value={data.avgRating || "—"} />
            </div>

            {/* Chart */}
            <div className="border rounded-2xl p-4">
              <p className="text-sm font-medium mb-3">Impressões e cliques por dia</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.series}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="clicks" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="default" onClick={() => navigate(`/admin/estabelecimentos/${e.id}`)}>
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
              <Button variant="outline" onClick={() => window.open(`/estabelecimento/${e.slug}`, "_blank", "noopener,noreferrer")}>
                <ExternalLink className="w-4 h-4 mr-1" /> Ver no app
              </Button>
              <Button variant="outline" onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-1" /> Duplicar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="border rounded-2xl p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-base font-bold mt-0.5">{value}</p>
    </div>
  );
}
