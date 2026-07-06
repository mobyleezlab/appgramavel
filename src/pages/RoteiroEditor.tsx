import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Map as MapIcon, Save } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableStop } from "@/components/routes/SortableStop";
import { AddStopSheet } from "@/components/routes/AddStopSheet";
import RoutePreviewMap from "@/components/routes/RoutePreviewMap";
import { supabase } from "@/integrations/supabase/client";
import { useCreateRoute, useMyRoute, useUpdateRoute } from "@/hooks/useRoutes";
import { updateUserRouteStop } from "@/services/userRoutes";
import { getMultiLegRoute, formatKm, formatMin } from "@/lib/routeEstimates";
import type { Establishment } from "@/data/mock";
import { toast } from "sonner";

interface MiniEst {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function RoteiroEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const cloneFrom = searchParams.get("clone");
  const isEdit = !!id;

  const existing = useMyRoute(id);
  const createRoute = useCreateRoute();
  const updateRoute = useUpdateRoute();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stops, setStops] = useState<MiniEst[]>([]);
  const [dayByStop, setDayByStop] = useState<Record<string, number | null>>({});
  const [dayCount, setDayCount] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [estimate, setEstimate] = useState<{ km: number; min: number; coords: [number, number][] } | null>(null);

  // Hydrate from existing route
  useEffect(() => {
    if (!isEdit || !existing.data) return;
    const r: any = existing.data;
    setTitle(r.title);
    setDescription(r.description ?? "");
    const sorted = (r.user_route_stops ?? []).sort(
      (a: any, b: any) => a.stop_order - b.stop_order,
    );
    const ordered = sorted.map((s: any) => s.establishment as MiniEst).filter(Boolean);
    setStops(ordered);
    const days: Record<string, number | null> = {};
    let max = 1;
    for (const s of sorted) {
      if (s.establishment?.id) {
        days[s.establishment.id] = (s.planned_day as number | null) ?? null;
        if (typeof s.planned_day === "number" && s.planned_day > max) max = s.planned_day;
      }
    }
    setDayByStop(days);
    setDayCount(max);
  }, [isEdit, existing.data]);

  // Hydrate from clone
  useEffect(() => {
    if (!cloneFrom) return;
    supabase
      .from("user_routes")
      .select("title, description, user_route_stops(stop_order, planned_day, establishment:establishments(*))")
      .eq("id", cloneFrom)
      .single()
      .then(({ data }: any) => {
        if (!data) return;
        setTitle(`${data.title} (cópia)`);
        setDescription(data.description ?? "");
        const sorted = (data.user_route_stops ?? []).sort(
          (a: any, b: any) => a.stop_order - b.stop_order,
        );
        const ordered = sorted.map((s: any) => s.establishment as MiniEst).filter(Boolean);
        setStops(ordered);
        const days: Record<string, number | null> = {};
        let max = 1;
        for (const s of sorted) {
          if (s.establishment?.id) {
            days[s.establishment.id] = (s.planned_day as number | null) ?? null;
            if (typeof s.planned_day === "number" && s.planned_day > max) max = s.planned_day;
          }
        }
        setDayByStop(days);
        setDayCount(max);
      });
  }, [cloneFrom]);

  // Recalculate distance/duration on stops change
  useEffect(() => {
    const valid = stops.filter((s) => s.latitude != null && s.longitude != null);
    if (valid.length < 2) {
      setEstimate(null);
      return;
    }
    const points = valid.map((s) => ({ lat: s.latitude!, lng: s.longitude! }));
    const t = setTimeout(() => {
      getMultiLegRoute(points).then((r) => {
        if (!r) return;
        setEstimate({ km: r.totalDistanceKm, min: r.totalDurationMin, coords: r.fullCoordinates });
      });
    }, 400);
    return () => clearTimeout(t);
  }, [stops]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setStops((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === e.active.id);
      const newIdx = prev.findIndex((s) => s.id === e.over!.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleAddConfirm = async (ids: string[]) => {
    const existingIds = new Set(stops.map((s) => s.id));
    const newIds = ids.filter((i) => !existingIds.has(i));
    const removedIds = new Set(stops.filter((s) => !ids.includes(s.id)).map((s) => s.id));
    let next = stops.filter((s) => !removedIds.has(s.id));
    if (newIds.length > 0) {
      const { data } = await supabase
        .from("establishments")
        .select("id,name,category,logo_url,image_url,latitude,longitude")
        .in("id", newIds);
      next = [...next, ...((data as MiniEst[]) ?? [])];
    }
    const orderMap = new Map(ids.map((id, i) => [id, i]));
    next.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    setStops(next);

    // Assign the newly added stops to the currently highest day so the user
    // is nudged to think in day-buckets right away.
    if (newIds.length > 0) {
      setDayByStop((prev) => {
        const nextMap = { ...prev };
        for (const nid of newIds) {
          if (!(nid in nextMap)) nextMap[nid] = dayCount;
        }
        // drop removed
        for (const rid of removedIds) delete nextMap[rid];
        return nextMap;
      });
    } else if (removedIds.size > 0) {
      setDayByStop((prev) => {
        const nextMap = { ...prev };
        for (const rid of removedIds) delete nextMap[rid];
        return nextMap;
      });
    }
  };

  const cover = useMemo(
    () => stops[0]?.image_url || stops[0]?.logo_url || null,
    [stops],
  );

  const canSave = title.trim().length > 0 && stops.length > 0;

  const persistDays = async (routeId: string) => {
    // Re-fetch to get stop IDs, then update planned_day per stop.
    const { data } = await supabase
      .from("user_route_stops")
      .select("id, establishment_id, stop_order")
      .eq("user_route_id", routeId)
      .order("stop_order", { ascending: true });
    if (!data) return;
    await Promise.all(
      data.map((row: any) => {
        const day = dayByStop[row.establishment_id];
        if (day === undefined) return Promise.resolve();
        return updateUserRouteStop(row.id, { planned_day: day ?? null });
      }),
    );
  };

  const onSave = async () => {
    if (!canSave) return;
    try {
      if (isEdit && id) {
        await updateRoute.mutateAsync({
          id,
          input: {
            title: title.trim(),
            description: description.trim() || null,
            coverUrl: cover,
            estimatedDistanceKm: estimate?.km ?? null,
            estimatedDurationMin: estimate?.min ?? null,
          },
          stopIds: stops.map((s) => s.id),
        });
        await persistDays(id);
        toast.success("Roteiro atualizado!");
        navigate(`/roteiros/${id}?type=user`);
      } else {
        const created = await createRoute.mutateAsync({
          title: title.trim(),
          description: description.trim() || null,
          stopIds: stops.map((s) => s.id),
          coverUrl: cover,
          estimatedDistanceKm: estimate?.km ?? null,
          estimatedDurationMin: estimate?.min ?? null,
        });
        if (created?.id) {
          await persistDays(created.id);
          toast.success("Roteiro criado!");
          navigate(`/roteiros/${created.id}?type=user`);
        } else {
          toast.success("Roteiro criado!");
          navigate("/roteiros");
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    }
  };

  return (
    <div className="min-h-screen bg-background pt-14">
      <GlobalHeader showBack title={isEdit ? "Editar roteiro" : "Novo roteiro"} />

      <main className="max-w-2xl mx-auto px-4 pb-32 pt-4 space-y-5">
        {/* Cover preview */}
        <div className="aspect-[2/1] rounded-xl overflow-hidden bg-secondary">
          {cover ? (
            <img src={cover} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              A capa será a foto da primeira parada
            </div>
          )}
        </div>

        {/* Identity */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nome do roteiro *</label>
            <Input
              placeholder="Ex: Meu dia em Gramado"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Descrição</label>
            <Textarea
              placeholder="Conte sobre seu roteiro..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Stops */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Paradas <span className="text-muted-foreground">({stops.length})</span>
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>

          {stops.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma parada ainda</p>
              <Button onClick={() => setAddOpen(true)} className="rounded-full gap-1.5" size="sm">
                <Plus className="w-4 h-4" /> Adicionar paradas
              </Button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {stops.map((s, i) => (
                    <SortableStop
                      key={s.id}
                      id={s.id}
                      index={i}
                      establishment={s as unknown as Establishment}
                      onRemove={() => {
                        setStops((prev) => prev.filter((p) => p.id !== s.id));
                        setDayByStop((prev) => {
                          const next = { ...prev };
                          delete next[s.id];
                          return next;
                        });
                      }}
                      day={dayByStop[s.id] ?? null}
                      dayOptions={Array.from({ length: dayCount }, (_, k) => k + 1)}
                      onSetDay={(d) =>
                        setDayByStop((prev) => ({ ...prev, [s.id]: d }))
                      }
                      onAddDay={() => {
                        const nd = dayCount + 1;
                        setDayCount(nd);
                        setDayByStop((prev) => ({ ...prev, [s.id]: nd }));
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Estimate */}
        {estimate && (
          <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-around text-center">
            <div>
              <p className="text-xs text-muted-foreground">Distância</p>
              <p className="font-semibold text-foreground">{formatKm(estimate.km)}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Duração (carro)</p>
              <p className="font-semibold text-foreground">{formatMin(estimate.min)}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <button
              onClick={() => setPreviewOpen(true)}
              className="text-primary text-xs font-semibold inline-flex items-center gap-1"
            >
              <MapIcon className="w-4 h-4" /> Ver no mapa
            </button>
          </div>
        )}

        {previewOpen && estimate && (
          <RoutePreviewMap
            stops={stops
              .filter((s) => s.latitude != null && s.longitude != null)
              .map((s) => ({ lat: s.latitude!, lng: s.longitude!, name: s.name }))}
            polyline={estimate.coords}
            className="rounded-xl overflow-hidden border border-border"
            height={240}
          />
        )}
      </main>

      {/* Sticky save */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <Button
            className="w-full rounded-full gap-2"
            disabled={!canSave || createRoute.isPending || updateRoute.isPending}
            onClick={onSave}
          >
            <Save className="w-4 h-4" />
            {isEdit ? "Salvar alterações" : "Criar roteiro"}
          </Button>
        </div>
      </div>

      <AddStopSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        selectedIds={stops.map((s) => s.id)}
        onConfirm={handleAddConfirm}
      />
    </div>
  );
}
