import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, X, ArrowUp, ArrowDown, MapPin, Loader2 } from "lucide-react";
import ImageUploadCrop from "@/admin/components/ImageUploadCrop";
import { toast } from "sonner";
import {
  createRoute,
  updateRoute,
  getRouteWithStops,
  listEstablishmentsLite,
} from "@/admin/services/adminRoutes";

type Stop = { establishment_id: string; note?: string | null };
type Establishment = { id: string; name: string; category: string; logo_url: string | null };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  routeId?: string | null;
  prefill?: { title?: string; stops?: Stop[] } | null;
  onSaved: () => void;
}

const DIFFICULTIES = ["Fácil", "Moderado", "Difícil"];

export default function RouteEditorSheet({ open, onOpenChange, routeId, prefill, onSaved }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [difficulty, setDifficulty] = useState("Fácil");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);

  const [stops, setStops] = useState<Stop[]>([]);
  const [allEsts, setAllEsts] = useState<Establishment[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);

  // Reset / load on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    listEstablishmentsLite().then(d => setAllEsts(d as Establishment[]));

    if (routeId) {
      getRouteWithStops(routeId).then((r: any) => {
        if (!r) return;
        setTitle(r.title ?? "");
        setSubtitle(r.subtitle ?? "");
        setDescription(r.description ?? "");
        setDuration(r.duration ?? "");
        setDifficulty(r.difficulty ?? "Fácil");
        setImageUrl(r.image_url ?? null);
        setIsFeatured(!!r.is_featured);
        const sortedStops = ((r.route_stops as any[]) ?? [])
          .sort((a, b) => a.stop_order - b.stop_order)
          .map(s => ({ establishment_id: s.establishment_id, note: s.note }));
        setStops(sortedStops);
      });
    } else {
      setTitle(prefill?.title ?? "");
      setSubtitle("");
      setDescription("");
      setDuration("");
      setDifficulty("Fácil");
      setImageUrl(null);
      setIsFeatured(false);
      setStops(prefill?.stops ?? []);
    }
  }, [open, routeId, prefill]);

  const categories = useMemo(
    () => Array.from(new Set(allEsts.map(e => e.category))).sort(),
    [allEsts]
  );

  const filtered = useMemo(() => {
    return allEsts.filter(e => {
      const ms = !search || e.name.toLowerCase().includes(search.toLowerCase());
      const mc = !catFilter || e.category === catFilter;
      return ms && mc;
    });
  }, [allEsts, search, catFilter]);

  const toggleStop = (id: string) => {
    setStops(prev =>
      prev.find(s => s.establishment_id === id)
        ? prev.filter(s => s.establishment_id !== id)
        : [...prev, { establishment_id: id }]
    );
  };

  const move = (idx: number, dir: -1 | 1) => {
    setStops(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateNote = (idx: number, note: string) => {
    setStops(prev => prev.map((s, i) => (i === idx ? { ...s, note } : s)));
  };

  const handleSave = async () => {
    if (!title.trim() || !duration.trim() || stops.length === 0) {
      toast.error("Preencha título, duração e adicione ao menos 1 parada.");
      return;
    }
    setSaving(true);
    try {
      if (routeId) {
        await updateRoute(
          routeId,
          { title, subtitle, description, duration, difficulty, image_url: imageUrl, is_featured: isFeatured },
          stops
        );
        toast.success("Roteiro atualizado");
      } else {
        await createRoute(
          { title, subtitle, description, duration, difficulty, image_url: imageUrl, is_featured: isFeatured },
          stops
        );
        toast.success("Roteiro criado");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const stopsDetailed = stops
    .map(s => ({ ...s, est: allEsts.find(e => e.id === s.establishment_id) }))
    .filter(s => s.est);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{routeId ? "Editar roteiro" : "Novo roteiro"}</SheetTitle>
        </SheetHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 my-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => setStep(s)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </button>
              {s < 3 && <div className={`h-0.5 w-8 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
          <span className="text-sm text-muted-foreground ml-2">
            {step === 1 ? "Dados" : step === 2 ? "Paradas" : "Revisão"}
          </span>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Tour Cafés Especiais" />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Curto, exibido nos cards" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duração *</Label>
                <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ex: 2 horas, 1 dia" />
              </div>
              <div>
                <Label>Dificuldade</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Capa</Label>
              <ImageUploadCrop
                value={imageUrl}
                onChange={setImageUrl}
                onRemove={() => setImageUrl(null)}
                aspect={2}
                bucket="establishments"
                storagePath="routes"
                label="Capa do roteiro (2:1)"
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div>
                <p className="text-sm font-medium">Destacar no app</p>
                <p className="text-xs text-muted-foreground">Aparece em destaque na página de roteiros</p>
              </div>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!title.trim() || !duration.trim()}>Próximo</Button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-4">
            {/* Catálogo */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
              </div>
              <Select value={catFilter ?? "_all"} onValueChange={v => setCatFilter(v === "_all" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                {filtered.map(e => {
                  const sel = !!stops.find(s => s.establishment_id === e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleStop(e.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-2xl border text-left ${
                        sel ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {e.logo_url ? (
                        <img src={e.logo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground">{e.category}</p>
                      </div>
                      {sel ? <X className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selecionados ordenáveis */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Paradas ({stops.length})</p>
              {stopsDetailed.length === 0 && (
                <p className="text-xs text-muted-foreground py-8 text-center border border-dashed rounded-2xl">
                  Nenhuma parada — selecione à esquerda
                </p>
              )}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {stopsDetailed.map((s, i) => (
                  <div key={s.establishment_id} className="border rounded-2xl p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {s.est!.logo_url && <img src={s.est!.logo_url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.est!.name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.est!.category}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === stops.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toggleStop(s.establishment_id)}><X className="w-3 h-3" /></Button>
                    </div>
                    <Input
                      placeholder="Nota da parada (opcional)"
                      value={s.note ?? ""}
                      onChange={e => updateNote(i, e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} disabled={stops.length === 0}>Próximo</Button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border p-4">
              <div className="flex gap-3">
                {imageUrl && <img src={imageUrl} className="w-24 h-12 rounded object-cover" alt="" />}
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-xs text-muted-foreground">{duration} · {difficulty} · {stops.length} paradas</p>
                  {description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>}
                </div>
              </div>
            </div>

            <div className="relative pl-6 space-y-2">
              <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-primary/20" />
              {stopsDetailed.map((s, i) => (
                <div key={s.establishment_id} className="relative flex items-center gap-2 p-2 rounded-2xl border bg-card">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="text-sm">{s.est!.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{s.est!.category}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {routeId ? "Salvar alterações" : "Publicar roteiro"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
