import { useState, useEffect } from "react";
import { Ticket } from "lucide-react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { CategoryBar } from "@/components/layout/CategoryBar";
import { CouponCard } from "@/components/coupons/CouponCard";
import { MOCK_COUPONS, type Coupon } from "@/data/mock";
import { getAllCoupons } from "@/services/coupons";

export default function Coupons() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>(MOCK_COUPONS);

  useEffect(() => {
    getAllCoupons().then(({ data }) => {
      if (data && data.length > 0) {
        setCoupons(data.map((c: any) => ({
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
      }
    });
  }, []);

  const filtered = selectedCategory
    ? coupons.filter((c) => c.category === selectedCategory)
    : coupons;

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader title="Cupons" />
      <CategoryBar selected={selectedCategory} onSelect={setSelectedCategory} />

      <main className="max-w-2xl mx-auto px-4 pb-20 pt-[136px]">
        <div className="space-y-4">
          {filtered.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <Ticket className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Nenhum cupom encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Tente outra categoria</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
