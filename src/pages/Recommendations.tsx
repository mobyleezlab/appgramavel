import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowUpRight, MapPin, Star, Loader2, Search, Coffee, Trees, Heart } from "lucide-react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/Seo";
import { recommendPlaces, type RecommendedPlace } from "@/services/recommendations";

const IDEAS = [
  { icon: Coffee, label: "Café tranquilo", text: "Procuro um café tranquilo para relaxar em Gramado ou Canela." },
  { icon: Trees, label: "Natureza em família", text: "Quero passear na natureza com minha família em Gramado ou Canela." },
  { icon: Heart, label: "Encontro a dois", text: "Procuro um lugar romântico para um encontro a dois em Gramado ou Canela." },
];

export default function Recommendations() {
  const [preferences, setPreferences] = useState("");
  const [results, setResults] = useState<RecommendedPlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || preferences.trim().length < 5) return;
    const request = new AbortController();
    controller.current = request;
    setLoading(true); setError(""); setResults(null);
    try {
      const places = await recommendPlaces(preferences.trim(), request.signal);
      if (!request.signal.aborted) setResults(places);
    } catch (err) {
      if (!request.signal.aborted) setError(err instanceof Error ? err.message : "Não foi possível gerar sugestões.");
    } finally {
      if (controller.current === request) { setLoading(false); controller.current = null; }
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Seo title="Lugares para você — Gramável" description="Encontre lugares de Gramado e Canela que combinam com suas preferências." path="/map/para-voce" />
      <GlobalHeader showBack title="Para você" />
      <main className="max-w-2xl mx-auto px-4 pt-28 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary text-sm font-medium"><Sparkles className="h-5 w-5" /> Para você · IA</div>
          <h1 className="text-2xl font-bold">O que você quer descobrir?</h1>
          <p className="text-muted-foreground text-sm">Um café tranquilo, um passeio em família ou um encontro a dois em Gramado e Canela.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Label htmlFor="preferences">O que você procura?</Label>
          <Textarea id="preferences" value={preferences} onChange={(e) => setPreferences(e.target.value)} maxLength={1000} rows={5} disabled={loading} placeholder="Quero um café em Canela para ir com meu cachorro, em um lugar tranquilo…" className="bg-card text-base" />
          <div className="flex justify-between gap-4 text-xs text-muted-foreground"><span>Não inclua informações pessoais.</span><span>{preferences.length}/1000</span></div>
          <div className="flex flex-wrap gap-2">
            {IDEAS.map(({ icon: Icon, label, text }) => <Button key={label} type="button" variant="outline" disabled={loading} className="min-h-12 whitespace-normal" onClick={() => setPreferences(text)}><Icon />{label}</Button>)}
          </div>
          {loading ? <div className="flex gap-2">
            <Button disabled className="min-h-12 flex-1"><Loader2 className="animate-spin" /> Buscando lugares…</Button>
            <Button type="button" variant="outline" className="min-h-12" onClick={() => { controller.current?.abort(); controller.current = null; setLoading(false); }}>Cancelar</Button>
          </div> : <Button type="submit" disabled={preferences.trim().length < 5} className="w-full min-h-12"><Sparkles /> Encontrar lugares</Button>}
        </form>
        {error && <div role="alert" className="space-y-3 border-l-4 border-destructive pl-4"><p className="text-sm text-destructive">{error}</p><Button asChild variant="outline" className="min-h-12"><Link to="/map"><MapPin />Explorar no mapa</Link></Button></div>}
        <section aria-live="polite" aria-busy={loading} className="space-y-4">
          {loading && <><p className="text-sm text-muted-foreground" role="status">Encontrando combinações para você…</p>{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</>}
          {results && results.length > 0 && <>
            <h2 className="text-xl font-semibold">Lugares que combinam com você</h2>
            {results.map((place) => <article key={place.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
              <div className="flex gap-4 p-4">
                {place.image_url ? <img src={place.image_url} alt={place.name} width={80} height={80} loading="lazy" className="w-20 h-20 shrink-0 rounded-2xl object-cover" /> : <div className="w-20 h-20 shrink-0 bg-secondary rounded-2xl flex items-center justify-center"><MapPin className="text-primary" /></div>}
                <div className="min-w-0 space-y-1"><h3 className="font-semibold break-words">{place.name}</h3><p className="text-xs text-muted-foreground">{place.category}</p>{(place.total_reviews ?? 0) > 0 ? <p className="flex items-center gap-1 text-sm"><Star className="w-4 h-4 text-rating fill-rating" />{place.rating} <span className="text-muted-foreground text-xs">({place.total_reviews})</span></p> : <p className="text-xs text-muted-foreground">Sem avaliações ainda</p>}</div>
              </div>
              <div className="px-4 pb-4 space-y-3"><p className="text-sm break-words">{place.reason}</p><Button asChild variant="outline" className="w-full min-h-12"><Link to={`/estabelecimento/${encodeURIComponent(place.slug)}`}>Conhecer o lugar<ArrowUpRight /></Link></Button></div>
            </article>)}
            <p className="text-xs text-muted-foreground pb-4">Sugestões geradas por IA com os lugares cadastrados. Confirme preços e disponibilidade com o estabelecimento.</p>
          </>}
          {results?.length === 0 && <div className="py-12 text-center text-muted-foreground"><Search className="w-12 h-12 mx-auto mb-3" /><h2 className="text-base font-semibold text-foreground">Nenhuma combinação encontrada</h2><p className="text-sm mt-2">Tente outras preferências ou outra categoria de lugar.</p></div>}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}