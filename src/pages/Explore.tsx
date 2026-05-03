import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Search, X, MapPin, Clock, Star, TrendingUp, Dog, Ticket } from "lucide-react";
import { FilterChip, FilterChipsBar } from "@/components/ui/FilterChips";
import { useNavigate } from "react-router-dom";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES, MOCK_ESTABLISHMENTS, EXPERIENCES, type Establishment } from "@/data/mock";
import { fetchEstablishments, fetchExperiences, queryKeys } from "@/lib/queries";
import { isOpenNow } from "@/lib/utils";
import ExploreMap from "@/components/map/ExploreMap";
import "@/components/map/map-styles.css";
import { trackExplore } from "@/lib/exploreTracking";

const FILTER_CHIPS = [
  { label: "Perto de você", icon: MapPin },
  { label: "Abertos agora", icon: Clock },
  { label: "Mais bem avaliados", icon: Star },
  { label: "Em alta hoje", icon: TrendingUp },
  { label: "Pet friendly", icon: Dog },
  { label: "Com cupons", icon: Ticket },
];

export default function Explore() {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(true);
  const navigate = useNavigate();

  const { data: estData, isLoading: loading } = useQuery({
    queryKey: queryKeys.establishments(),
    queryFn: fetchEstablishments,
    refetchOnWindowFocus: true, // refresh after admin edits
  });

  const { data: expData } = useQuery({
    queryKey: queryKeys.experiences(),
    queryFn: fetchExperiences,
    staleTime: 10 * 60 * 1000,
  });

  const establishments: Establishment[] = useMemo(() => {
    if (!estData || estData.length === 0) return MOCK_ESTABLISHMENTS;
    return estData.map((e: any) => ({
      ...e,
      city: "Gramado",
      is_active: true,
      is_verified: true,
      gallery: e.gallery || [],
      sunday_hours: e.sunday_hours || null,
    })) as Establishment[];
  }, [estData]);

  const experiences = useMemo(() => {
    if (!expData || expData.length === 0) return EXPERIENCES;
    return expData.map((e: any) => ({
      id: e.id,
      title: e.title,
      image: e.image_url || "",
    }));
  }, [expData]);

  const isSearching = search.length > 0 || activeFilters.length > 0;

  useEffect(() => {
    trackExplore("explore_view");
  }, []);

  const toggleFilter = (label: string) => {
    setActiveFilters((prev) => {
      const next = prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label];
      if (!prev.includes(label)) trackExplore("explore_filter", label);
      return next;
    });
    setShowMap(false);
  };

  const goToEstablishment = (slug: string, source: string, id?: string) => {
    trackExplore("explore_card_click", source, { establishmentId: id ?? null });
    navigate(`/estabelecimento/${slug}`);
  };

  const goToCategory = (label: string) => {
    trackExplore("explore_category_click", label);
    navigate(`/map/categoria/${encodeURIComponent(label)}`);
  };

  const filteredEstablishments = useMemo(() => {
    let result = [...establishments];

    if (activeFilters.includes("Abertos agora"))
      result = result.filter((e) => isOpenNow(e as any));
    if (activeFilters.includes("Em alta hoje"))
      result = result.filter((e) => e.is_popular);
    if (activeFilters.includes("Pet friendly"))
      result = result.filter((e) => e.pet_friendly);

    if (search)
      result = result.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase())
      );

    if (activeFilters.includes("Mais bem avaliados")) {
      result = result.slice().sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (activeFilters.includes("Perto de você")) {
      result = result.slice().sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
    }

    return result;
  }, [activeFilters, search, establishments]);

  const popularPlaces = useMemo(() =>
    establishments.filter(e => e.is_popular).slice(0, 3),
    [establishments]
  );

  const recommendedPlaces = useMemo(() =>
    [...establishments].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3),
    [establishments]
  );

  const nearbyPlaces = useMemo(() =>
    [...establishments].sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0)).slice(0, 3),
    [establishments]
  );

  return (
    <div className="min-h-screen bg-background pt-14">
      <GlobalHeader title="Explorar" />

      <main className="max-w-2xl mx-auto px-4 pb-20 pt-[44px] space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-10 pl-9 pr-9 bg-card border-border shadow-card"
            placeholder="Buscar locais, categorias..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (e.target.value) setShowMap(false); }}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setSearch(""); if (activeFilters.length === 0) setShowMap(true); }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <FilterChipsBar>
          {FILTER_CHIPS.map(({ label, icon }) => (
            <FilterChip
              key={label}
              label={label}
              icon={icon}
              active={activeFilters.includes(label)}
              onClick={() => toggleFilter(label)}
            />
          ))}
        </FilterChipsBar>

        {/* Map or Results */}
        {showMap && !isSearching ? (
          <>
            <ExploreMap />

            {/* Category Grid */}
            <div className="space-y-3">
              <SectionTitle>Categorias</SectionTitle>
              <div className="grid grid-cols-3 gap-4">
                {CATEGORIES.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => navigate(`/map/categoria/${encodeURIComponent(label)}`)}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium text-foreground text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => navigate(`/map/categoria/${encodeURIComponent("Cupons")}`)}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 w-[calc(33.333%-0.667rem)]"
                >
                  <Ticket className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium text-foreground text-center leading-tight">Cupons</span>
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-border" />

            {/* Popular Places */}
            <div className="space-y-3">
              <SectionTitle>Populares agora</SectionTitle>
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-4 pb-2">
                  {popularPlaces.map((place) => (
                    <div key={place.id || place.name} className="shrink-0 w-[60%] rounded-xl overflow-hidden border border-border bg-card shadow-card cursor-pointer" onClick={() => navigate(`/estabelecimento/${place.slug}`)}>
                      <div className="aspect-[3/2] overflow-hidden">
                        <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-sm">{place.name}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{place.category}</span>
                          {(place.total_reviews ?? 0) > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-rating text-rating" />
                              <span className="text-xs font-medium">{place.rating}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">Novo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Places */}
            <div className="space-y-3">
              <SectionTitle>Recomendados</SectionTitle>
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-4 pb-2">
                  {recommendedPlaces.map((place) => (
                    <div key={place.id || place.name} className="shrink-0 w-[60%] rounded-xl overflow-hidden border border-border bg-card shadow-card cursor-pointer" onClick={() => navigate(`/estabelecimento/${place.slug}`)}>
                      <div className="aspect-[3/2] overflow-hidden">
                        <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-sm">{place.name}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{place.category}</span>
                          {(place.total_reviews ?? 0) > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-rating text-rating" />
                              <span className="text-xs font-medium">{place.rating}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">Novo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Experiences Carousel */}
            <div className="space-y-3">
              <SectionTitle>Experiências</SectionTitle>
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-4 pb-2">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="relative shrink-0 w-[70%] h-36 rounded-xl overflow-hidden">
                      <img src={exp.image} alt={exp.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <span className="absolute bottom-4 left-4 right-4 text-primary-foreground font-semibold text-sm">{exp.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Nearby establishments */}
            <div className="space-y-3">
              <SectionTitle>Próximos de você</SectionTitle>
              <div className="space-y-4">
                {nearbyPlaces.map((est) => (
                  <Card key={est.id} className="cursor-pointer shadow-card hover:shadow-card-hover transition-shadow overflow-hidden" onClick={() => navigate(`/estabelecimento/${est.slug}`)}>
                    <div className="flex gap-4 p-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={est.image_url} alt={est.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-semibold text-sm leading-tight truncate">{est.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{est.category}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {(est.total_reviews ?? 0) > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-rating text-rating" />
                              <span>{est.rating}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">Novo</span>
                          )}
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{(est.distance_km ?? 0).toFixed(1)} km</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Search Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{filteredEstablishments.length} resultado(s)</p>
                <button
                  onClick={() => { setSearch(""); setActiveFilters([]); setShowMap(true); }}
                  className="flex items-center gap-1 text-xs text-primary font-medium"
                >
                  <X className="w-3 h-3" /> Fechar
                </button>
              </div>
              {filteredEstablishments.map((est) => (
                <Card key={est.id} className="cursor-pointer shadow-card hover:shadow-card-hover transition-shadow overflow-hidden" onClick={() => navigate(`/estabelecimento/${est.slug}`)}>
                  <div className="flex gap-4 p-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={est.image_url} alt={est.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-semibold text-sm leading-tight truncate">{est.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{est.category}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {(est.total_reviews ?? 0) > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-rating text-rating" />
                            <span>{est.rating}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">Novo</span>
                        )}
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{(est.distance_km ?? 0).toFixed(1)} km</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredEstablishments.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                    <Search className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Nenhum resultado</p>
                  <p className="text-xs text-muted-foreground mt-1">Tente outra busca</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
