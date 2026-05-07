/**
 * Bottom-sheet to add stops to a route from multiple sources:
 * Search, Favorites, Recent check-ins.
 */
import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, Heart, History, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MiniEst {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}

export function AddStopSheet({ open, onOpenChange, selectedIds, onConfirm }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState("search");
  const [search, setSearch] = useState("");
  const [allEsts, setAllEsts] = useState<MiniEst[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [checkinIds, setCheckinIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    if (!open) return;
    setDraft(new Set(selectedIds));
    supabase
      .from("establishments")
      .select("id,name,category,logo_url,image_url,latitude,longitude")
      .order("rating", { ascending: false })
      .then(({ data }) => setAllEsts((data as MiniEst[]) ?? []));
    if (user?.id) {
      supabase
        .from("user_favorites")
        .select("establishment_id")
        .eq("user_id", user.id)
        .then(({ data }) =>
          setFavoriteIds(new Set((data ?? []).map((d: any) => d.establishment_id))),
        );
      supabase
        .from("check_ins")
        .select("establishment_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) =>
          setCheckinIds(
            Array.from(new Set((data ?? []).map((d: any) => d.establishment_id))),
          ),
        );
    }
  }, [open, user?.id, selectedIds]);

  const filteredSearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEsts.slice(0, 50);
    return allEsts.filter(
      (e) =>
        e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q),
    );
  }, [search, allEsts]);

  const favList = useMemo(
    () => allEsts.filter((e) => favoriteIds.has(e.id)),
    [favoriteIds, allEsts],
  );

  const checkinList = useMemo(() => {
    const map = new Map(allEsts.map((e) => [e.id, e]));
    return checkinIds.map((id) => map.get(id)).filter(Boolean) as MiniEst[];
  }, [checkinIds, allEsts]);

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderRow = (e: MiniEst) => {
    const isSel = draft.has(e.id);
    return (
      <button
        key={e.id}
        onClick={() => toggle(e.id)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.99]",
          isSel ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50",
        )}
      >
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">
          {(e.logo_url || e.image_url) && (
            <img
              src={e.logo_url || e.image_url || ""}
              alt={e.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {e.category}
          </p>
        </div>
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border",
            isSel
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground",
          )}
        >
          {isSel ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
    );
  };

  const empty = (text: string) => (
    <div className="py-12 text-center text-sm text-muted-foreground">{text}</div>
  );

  const addedCount = draft.size - selectedIds.length;
  const removedCount = selectedIds.filter((id) => !draft.has(id)).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-lg font-bold">Adicionar paradas</SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 grid grid-cols-3">
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="w-3.5 h-3.5" /> Buscar
            </TabsTrigger>
            <TabsTrigger value="fav" className="gap-1.5">
              <Heart className="w-3.5 h-3.5" /> Favoritos
            </TabsTrigger>
            <TabsTrigger value="ci" className="gap-1.5">
              <History className="w-3.5 h-3.5" /> Recentes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 min-h-0 mt-3 px-4 flex flex-col">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar estabelecimento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pb-4">
              {filteredSearch.length === 0
                ? empty("Nenhum resultado")
                : filteredSearch.map(renderRow)}
            </div>
          </TabsContent>

          <TabsContent value="fav" className="flex-1 min-h-0 mt-3 px-4 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 pb-4">
              {favList.length === 0
                ? empty("Você ainda não tem favoritos")
                : favList.map(renderRow)}
            </div>
          </TabsContent>

          <TabsContent value="ci" className="flex-1 min-h-0 mt-3 px-4 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 pb-4">
              {checkinList.length === 0
                ? empty("Nenhum check-in recente")
                : checkinList.map(renderRow)}
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t border-border p-3 flex items-center gap-2">
          <p className="text-xs text-muted-foreground flex-1">
            {draft.size} parada{draft.size === 1 ? "" : "s"}
            {addedCount > 0 ? ` · +${addedCount}` : ""}
            {removedCount > 0 ? ` · -${removedCount}` : ""}
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-full"
            onClick={() => {
              onConfirm(Array.from(draft));
              onOpenChange(false);
            }}
          >
            Confirmar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
