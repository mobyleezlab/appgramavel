import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, MapPin, Star, Ticket, Clock, TrendingUp, Dog } from "lucide-react";
import { FilterChip, FilterChipsBar } from "@/components/ui/FilterChips";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card } from "@/components/ui/card";
import { CouponCard } from "@/components/coupons/CouponCard";
import { CATEGORIES, MOCK_ESTABLISHMENTS, MOCK_COUPONS, type Establishment } from "@/data/mock";
import { getEstablishmentsByCategory } from "@/services/establishments";
import { getAllCoupons } from "@/services/coupons";
import { trackExplore } from "@/lib/exploreTracking";

const CATEGORY_BANNERS: Record<string, string> = {
  "Restaurantes": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
  "Cafés": "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&h=400&fit=crop",
  "Hotéis": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=400&fit=crop",
  "Atrações": "https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?w=800&h=400&fit=crop",
  "Compras": "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800&h=400&fit=crop",
  "Bares & Vinícolas": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=400&fit=crop",
  "Cupons": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop",
};

const CATEGORY_FILTER_CHIPS: Record<string, { label: string; icon: typeof MapPin }[]> = {
  "Restaurantes": [
    { label: "Perto de você", icon: MapPin },
    { label: "Abertos agora", icon: Clock },
    { label: "Mais bem avaliados", icon: Star },
    { label: "Pet friendly", icon: Dog },
  ],
  "Cafés": [
    { label: "Perto de você", icon: MapPin },
    { label: "Abertos agora", icon: Clock },
    { label: "Mais bem avaliados", icon: Star },
  ],
  "Hotéis": [
    { label: "Perto de você", icon: MapPin },
    { label: "Mais bem avaliados", icon: Star },
  ],
  "Atrações": [
    { label: "Perto de você", icon: MapPin },
    { label: "Mais bem avaliados", icon: Star },
    { label: "Em alta hoje", icon: TrendingUp },
  ],
  "Compras": [
    { label: "Perto de você", icon: MapPin },
    { label: "Abertos agora", icon: Clock },
    { label: "Mais bem avaliados", icon: Star },
  ],
  "Bares & Vinícolas": [
    { label: "Perto de você", icon: MapPin },
    { label: "Abertos agora", icon: Clock },
    { label: "Mais bem avaliados", icon: Star },
  ],
  "Cupons": [
    { label: "Restaurantes", icon: MapPin },
    { label: "Cafés", icon: Clock },
    { label: "Atrações", icon: Star },
    { label: "Bares & Vinícolas", icon: TrendingUp },
  ],
};

export default function ExploreCategory() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categoryEstablishments, setCategoryEstablishments] = useState<Establishment[]>([]);
  const [categoryCoupons, setCategoryCoupons] = useState<any[]>([]);

  const selectedCategory = decodeURIComponent(category || "");
  const isCoupons = selectedCategory === "Cupons";

  const catIcon = CATEGORIES.find(c => c.label === selectedCategory);
  const CatIcon = isCoupons ? Ticket : catIcon?.icon;
  const filters = CATEGORY_FILTER_CHIPS[selectedCategory] || CATEGORY_FILTER_CHIPS["Restaurantes"];

  useEffect(() => {
    if (selectedCategory) trackExplore("explore_category_view", selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (isCoupons) {
      getAllCoupons().then(({ data }) => {
        if (data && data.length > 0) {
          setCategoryCoupons(data.map((c: any) => ({
            id: c.id,
            title: c.title,
            description: "",
            code: c.code,
            image: c.image || "",
            establishment_id: c.establishment?.id || c.establishment_id || "",
            establishment_name: c.establishment?.name || "",
            establishment_avatar: c.establishment?.logo_url || "",
            status: c.status || "active",
            expires_at: c.expires_at,
            category: c.category || "",
          })));
        } else {
          setCategoryCoupons(MOCK_COUPONS);
        }
      });
    } else {
      getEstablishmentsByCategory(selectedCategory).then(({ data }) => {
        if (data && data.length > 0) {
          setCategoryEstablishments(data.map((e: any) => ({
            ...e,
            city: "Gramado",
            is_active: true,
            is_verified: true,
            gallery: e.gallery || [],
            sunday_hours: e.sunday_hours || null,
          })) as Establishment[]);
        } else {
          setCategoryEstablishments(MOCK_ESTABLISHMENTS.filter((e) => e.category === selectedCategory));
        }
      });
    }
  }, [selectedCategory, isCoupons]);

  const filteredCoupons = categoryFilter
    ? categoryCoupons.filter(c => c.category === categoryFilter)
    : categoryCoupons;

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader showBack title={selectedCategory} onBack={() => navigate("/map")} />
      <main className="max-w-2xl mx-auto pb-20 pt-14 space-y-4">
        {/* Banner */}
        <div className="relative aspect-[2/1] overflow-hidden">
          <img src={CATEGORY_BANNERS[selectedCategory] || CATEGORY_BANNERS["Restaurantes"]} alt={selectedCategory} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            {CatIcon && <CatIcon className="w-5 h-5 text-primary-foreground" />}
            <h2 className="text-xl font-bold text-primary-foreground">{selectedCategory}</h2>
          </div>
        </div>

        {/* Filter Chips */}
        <FilterChipsBar className="px-4 mx-0">
          {filters.map(({ label, icon }) => (
            <FilterChip
              key={label}
              label={label}
              icon={icon}
              active={categoryFilter === label}
              onClick={() => setCategoryFilter(categoryFilter === label ? null : label)}
            />
          ))}
        </FilterChipsBar>

        {/* Results */}
        <div className="px-4 space-y-4">
          {isCoupons ? (
            <>
              <p className="text-sm text-muted-foreground">{filteredCoupons.length} cupom(ns) disponível(is)</p>
              {filteredCoupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} />
              ))}
              {filteredCoupons.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                    <Ticket className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Nenhum cupom encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">Tente outra categoria</p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{categoryEstablishments.length} resultado(s)</p>
              {categoryEstablishments.map((est) => (
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
                          <span className="text-xs text-muted-foreground/60">Novo</span>
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
              {categoryEstablishments.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                    <Search className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Nenhum estabelecimento</p>
                  <p className="text-xs text-muted-foreground mt-1">Tente outra categoria</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
