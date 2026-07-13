import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, MapPin, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ImageUploadCrop from "@/admin/components/ImageUploadCrop";
import LocationMap from "@/admin/components/LocationMap";

const CATEGORIES = ["Restaurantes", "Cafés", "Hotéis", "Atrações", "Compras", "Bares & Vinícolas"];
const GRAMADO_CENTER = { lat: -29.3789, lng: -50.8732 };

const DAYS = [
  { key: "hours_monday", label: "Segunda" },
  { key: "hours_tuesday", label: "Terça" },
  { key: "hours_wednesday", label: "Quarta" },
  { key: "hours_thursday", label: "Quinta" },
  { key: "hours_friday", label: "Sexta" },
  { key: "hours_saturday", label: "Sábado" },
  { key: "sunday_hours", label: "Domingo" },
] as const;

type DaySchedule = { open: boolean; from: string; to: string };
type Schedule = Record<string, DaySchedule>;

function slugify(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim();
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseHours(str: string | null): { open: boolean; from: string; to: string } {
  if (!str) return { open: false, from: "09:00", to: "22:00" };
  const match = str.match(/(\d{2}:\d{2})\s*(?:às|a|-)\s*(\d{2}:\d{2})/);
  if (match) return { open: true, from: match[1], to: match[2] };
  return { open: true, from: "09:00", to: "22:00" };
}

function getHoursString(d: DaySchedule): string | null {
  if (!d.open) return null;
  return `${d.from} às ${d.to}`;
}

const defaultSchedule = (): Schedule =>
  Object.fromEntries(DAYS.map(d => [d.key, { open: d.key !== "sunday_hours", from: "09:00", to: "22:00" }]));

export default function EstablishmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [saving, setSaving] = useState(false);
  const geocodeTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [form, setForm] = useState({
    name: "", slug: "", category: "Restaurantes", description: "",
    address: "", latitude: -29.3789, longitude: -50.8732, distance_km: 0,
    is_open: true, is_popular: false, pet_friendly: false,
    phone: "", whatsapp: "", website: "", instagram: "", tiktok: "", facebook: "",
    youtube: "", twitter: "",
    image_url: "",
  });

  const [schedule, setSchedule] = useState<Schedule>(defaultSchedule());
  const [photos, setPhotos] = useState<{ id?: string; url: string; caption: string; sort_order: number }[]>([]);

  useEffect(() => {
    if (!isEditing) return;
    supabase.from("establishments").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) return;
      setForm({
        name: data.name ?? "", slug: data.slug ?? "", category: data.category ?? "Restaurantes",
        description: data.description ?? "", address: data.address ?? "",
        latitude: Number(data.latitude) || -29.3789, longitude: Number(data.longitude) || -50.8732,
        distance_km: Number(data.distance_km) || 0,
        is_open: data.is_open ?? true, is_popular: data.is_popular ?? false, pet_friendly: data.pet_friendly ?? false,
        phone: data.phone ?? "", whatsapp: data.whatsapp ?? "", website: data.website ?? "",
        instagram: data.instagram ?? "", tiktok: data.tiktok ?? "", facebook: data.facebook ?? "",
        youtube: data.youtube ?? "", twitter: data.twitter ?? "",
        image_url: data.image_url ?? "",
      });
      // Parse schedule from DB
      const s: Schedule = {};
      for (const day of DAYS) {
        const val = (data as any)[day.key] as string | null;
        s[day.key] = val ? parseHours(val) : parseHours(day.key === "sunday_hours" ? data.sunday_hours : (data as any)[day.key]);
      }
      setSchedule(s);
    });
    supabase.from("establishment_photos").select("*").eq("establishment_id", id).order("sort_order").then(({ data }) => {
      setPhotos(data?.map(p => ({ id: p.id, url: p.url, caption: p.caption ?? "", sort_order: p.sort_order ?? 0 })) ?? []);
    });
  }, [id, isEditing]);

  function updateField(key: string, value: unknown) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "name") next.slug = slugify(value as string);
      if (key === "latitude" || key === "longitude") {
        const lat = key === "latitude" ? Number(value) : prev.latitude;
        const lng = key === "longitude" ? Number(value) : prev.longitude;
        if (!isNaN(lat) && !isNaN(lng)) {
          next.distance_km = Math.round(haversine(lat, lng, GRAMADO_CENTER.lat, GRAMADO_CENTER.lng) * 10) / 10;
        }
      }
      return next;
    });
  }

  const handleMarkerMove = useCallback((lat: number, lng: number) => {
    setForm(prev => ({
      ...prev,
      latitude: Math.round(lat * 1000000) / 1000000,
      longitude: Math.round(lng * 1000000) / 1000000,
      distance_km: Math.round(haversine(lat, lng, GRAMADO_CENTER.lat, GRAMADO_CENTER.lng) * 10) / 10,
    }));
  }, []);

  function handleAddressBlur() {
    if (!form.address.trim()) return;
    clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}&limit=1`);
        const [result] = await res.json();
        if (result) {
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          setForm(prev => ({
            ...prev,
            latitude: lat, longitude: lng,
            distance_km: Math.round(haversine(lat, lng, GRAMADO_CENTER.lat, GRAMADO_CENTER.lng) * 10) / 10,
          }));
          toast.success("Coordenadas encontradas pelo endereço");
        }
      } catch { /* ignore */ }
    }, 800);
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
      handleMarkerMove(pos.coords.latitude, pos.coords.longitude);
      toast.success("Localização obtida");
    }, () => toast.error("Erro ao obter localização"));
  }

  function updateScheduleDay(dayKey: string, field: keyof DaySchedule, value: string | boolean) {
    setSchedule(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], [field]: value } }));
  }

  function applyToAllDays() {
    const monday = schedule.hours_monday;
    setSchedule(prev => {
      const next = { ...prev };
      for (const day of DAYS) {
        if (next[day.key].open) {
          next[day.key] = { ...next[day.key], from: monday.from, to: monday.to };
        }
      }
      return next;
    });
    toast.success("Horário aplicado a todos os dias abertos");
  }

  function addPhotoFromUpload(url: string) {
    setPhotos(prev => [...prev, { url, caption: "", sort_order: prev.length }]);
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, sort_order: i })));
  }

  async function handleSave() {
    if (!form.name || !form.slug) { toast.error("Nome e slug são obrigatórios"); return; }
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: form.name, slug: form.slug, category: form.category,
      description: form.description || null, address: form.address || null,
      latitude: form.latitude, longitude: form.longitude, distance_km: form.distance_km,
      is_open: form.is_open, is_popular: form.is_popular, pet_friendly: form.pet_friendly,
      image_url: form.image_url || null,
      phone: form.phone || null, whatsapp: form.whatsapp || null, website: form.website || null,
      instagram: form.instagram || null, tiktok: form.tiktok || null, facebook: form.facebook || null,
      youtube: form.youtube || null, twitter: form.twitter || null,
      opening_hours: getHoursString(schedule.hours_monday),
    };
    for (const day of DAYS) {
      payload[day.key] = getHoursString(schedule[day.key]);
    }

    let estId = id;

    if (isEditing) {
      const { error } = await supabase.from("establishments").update(payload as never).eq("id", id);
      if (error) { toast.error("Erro ao salvar: " + error.message); setSaving(false); return; }
    } else {
      // Try slug, add numeric suffix if conflict
      let slug = payload.slug as string;
      let attempt = 0;
      let insertError: any = null;
      let insertData: any = null;

      while (attempt < 10) {
        const trySlug = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
        const { data, error } = await supabase.from("establishments").insert({ ...payload, slug: trySlug } as never).select().single();
        if (error && error.code === "23505") {
          attempt++;
          continue;
        }
        insertError = error;
        insertData = data;
        break;
      }

      if (insertError || !insertData) { toast.error("Erro ao criar: " + (insertError?.message || "")); setSaving(false); return; }
      estId = insertData.id;
    }

    // Delete removed photos (those with id that are no longer in photos array)
    if (isEditing) {
      const { data: existingPhotos } = await supabase.from("establishment_photos").select("id").eq("establishment_id", id!);
      const currentIds = new Set(photos.filter(p => p.id).map(p => p.id));
      const toDelete = existingPhotos?.filter(p => !currentIds.has(p.id)) ?? [];
      for (const p of toDelete) {
        await supabase.from("establishment_photos").delete().eq("id", p.id);
      }
    }

    // Save photos
    for (const photo of photos) {
      if (photo.id) {
        await supabase.from("establishment_photos").update({ caption: photo.caption, sort_order: photo.sort_order } as never).eq("id", photo.id);
      } else if (estId) {
        await supabase.from("establishment_photos").insert({
          establishment_id: estId, url: photo.url, caption: photo.caption, sort_order: photo.sort_order,
        });
      }
    }

    toast.success(isEditing ? "Estabelecimento atualizado" : "Estabelecimento criado");
    setSaving(false);
    navigate("/admin/estabelecimentos");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/estabelecimentos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{isEditing ? "Editar" : "Novo"} Estabelecimento</h2>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => updateField("name", e.target.value)} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={e => updateField("slug", e.target.value)} /></div>
          </div>
          <div><Label>Categoria</Label>
            <Select value={form.category} onValueChange={v => updateField("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => updateField("description", e.target.value)} rows={3} /></div>

          {/* Banner Upload */}
          <ImageUploadCrop
            value={form.image_url || null}
            onChange={(url) => updateField("image_url", url)}
            onRemove={() => updateField("image_url", "")}
            aspect={2}
            bucket="establishments"
            storagePath="banners/"
            label="Banner Principal"
            hint="Proporção 2:1 recomendada"
          />
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader><CardTitle>Localização</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Endereço</Label>
            <Input
              value={form.address}
              onChange={e => updateField("address", e.target.value)}
              onBlur={handleAddressBlur}
              placeholder="Digite o endereço para geocodificar automaticamente"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Latitude</Label><Input type="number" step="any" value={form.latitude} onChange={e => updateField("latitude", parseFloat(e.target.value) || 0)} /></div>
            <div><Label>Longitude</Label><Input type="number" step="any" value={form.longitude} onChange={e => updateField("longitude", parseFloat(e.target.value) || 0)} /></div>
            <div><Label>Distância (km)</Label><Input type="number" step="0.1" value={form.distance_km} onChange={e => updateField("distance_km", parseFloat(e.target.value) || 0)} /></div>
          </div>
          <Button variant="outline" size="sm" onClick={useMyLocation}><MapPin className="h-4 w-4 mr-2" /> Usar minha localização</Button>

          {form.latitude && form.longitude && (
            <LocationMap lat={form.latitude} lng={form.longitude} onMove={handleMarkerMove} />
          )}
        </CardContent>
      </Card>

      {/* Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Funcionamento</CardTitle>
            <Button variant="outline" size="sm" onClick={applyToAllDays}>Aplicar a todos</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2"><Switch checked={form.pet_friendly} onCheckedChange={v => updateField("pet_friendly", v)} /><Label>Pet Friendly</Label></div>
          </div>

          <div className="border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">Dia</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Horário</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => {
                  const d = schedule[day.key];
                  return (
                    <tr key={day.key} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{day.label}</td>
                      <td className="px-4 py-2">
                        <Select
                          value={d.open ? "open" : "closed"}
                          onValueChange={v => updateScheduleDay(day.key, "open", v === "open")}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">
                              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> Aberto</span>
                            </SelectItem>
                            <SelectItem value="closed">
                              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Fechado</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={d.from}
                            onChange={e => updateScheduleDay(day.key, "from", e.target.value)}
                            disabled={!d.open}
                            className="w-[110px] h-8"
                          />
                          <span className="text-muted-foreground text-xs">às</span>
                          <Input
                            type="time"
                            value={d.to}
                            onChange={e => updateScheduleDay(day.key, "to", e.target.value)}
                            disabled={!d.open}
                            className="w-[110px] h-8"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Telefone</Label><Input value={form.phone} onChange={e => updateField("phone", e.target.value)} /></div>
            <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => updateField("whatsapp", e.target.value)} /></div>
            <div><Label>Site</Label><Input value={form.website} onChange={e => updateField("website", e.target.value)} /></div>
            <div><Label>Instagram</Label><Input value={form.instagram} onChange={e => updateField("instagram", e.target.value)} placeholder="@usuario" /></div>
            <div><Label>TikTok</Label><Input value={form.tiktok} onChange={e => updateField("tiktok", e.target.value)} placeholder="@usuario" /></div>
            <div><Label>Facebook</Label><Input value={form.facebook} onChange={e => updateField("facebook", e.target.value)} /></div>
            <div><Label>YouTube</Label><Input value={form.youtube} onChange={e => updateField("youtube", e.target.value)} placeholder="@canal" /></div>
            <div><Label>X (Twitter)</Label><Input value={form.twitter} onChange={e => updateField("twitter", e.target.value)} placeholder="@usuario" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Galeria ({photos.length}/12)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="relative group" style={{ aspectRatio: "4/5" }}>
                <img src={photo.url} alt="" className="w-full h-full object-cover rounded-2xl" />
                {/* Order badge */}
                <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-background/80 text-foreground text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col justify-end p-2 gap-1.5">
                  <button
                    onClick={() => removePhoto(i)}
                    className="self-end w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <input
                    type="text"
                    placeholder="Legenda..."
                    value={photo.caption}
                    onChange={e => {
                      const next = [...photos];
                      next[i] = { ...next[i], caption: e.target.value };
                      setPhotos(next);
                    }}
                    className="text-xs bg-black/50 text-white placeholder-white/60 border-0 rounded px-2 py-1 w-full outline-none"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
            ))}

            {photos.length < 12 && (
              <ImageUploadCrop
                value={null}
                onChange={addPhotoFromUpload}
                aspect={4 / 5}
                bucket="establishments"
                storagePath="photos/"
                label="Foto"
                renderTrigger={() => (
                  <div
                    className="border-2 border-dashed border-muted-foreground/30 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors cursor-pointer"
                    style={{ aspectRatio: "4/5" }}
                  >
                    <Plus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Adicionar</span>
                  </div>
                )}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{photos.length}/12 fotos</p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate("/admin/estabelecimentos")}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4 mr-2" /> Salvar</>}
        </Button>
      </div>
    </div>
  );
}
