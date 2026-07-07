import { useState, useEffect } from "react";
import { Folder, Bookmark, Plus } from "lucide-react";
import { CloseButton } from "@/components/ui/CloseButton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth";
import { toast } from "sonner";

interface FavoriteFolder {
  id: string;
  name: string;
  total: number;
}

interface SaveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  establishmentId?: string;
  onSaved?: () => void;
}

export function SaveSheet({ open, onOpenChange, itemName, establishmentId, onSaved }: SaveSheetProps) {
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    if (!open) {
      setCreatingFolder(false);
      setNewFolderName("");
      return;
    }
    (async () => {
      try {
        const userId = await getCurrentUserId();
        const { data } = await (supabase as any).rpc("get_user_folders", { p_user_id: userId });
        setFolders(((data as any[]) ?? []).map(f => ({ id: f.id, name: f.name, total: Number(f.total ?? 0) })));
      } catch {
        setFolders([]);
      }
    })();
  }, [open]);

  async function handleSaveFavorite(folderId?: string | null, newName?: string) {
    if (!establishmentId) { onOpenChange(false); return; }
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await (supabase as any).rpc("save_favorite_to_folder", {
        p_user_id: userId,
        p_establishment_id: establishmentId,
        p_folder_id: folderId ?? null,
        p_new_folder_name: newName ?? null,
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error);
      window.dispatchEvent(new CustomEvent("favorites:changed"));
      onSaved?.();
      onOpenChange(false);
      toast.success(newName
        ? `"${itemName}" salvo em "${newName}"`
        : folderId
          ? `"${itemName}" salvo na pasta`
          : `"${itemName}" salvo nos favoritos!`);
    } catch {
      toast.error("Erro ao salvar favorito");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-2 pb-3 pt-1">
          <h2 className="text-base font-bold text-foreground">Salvar favorito</h2>
        </div>

        <div className="space-y-2 pb-4">
          <button
            onClick={() => handleSaveFavorite(null)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:bg-secondary transition-colors"
          >
            <Bookmark className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Salvar sem pasta</span>
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleSaveFavorite(folder.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
            >
              <Folder className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground flex-1 text-left">{folder.name}</span>
              <span className="text-xs text-muted-foreground">{folder.total}</span>
            </button>
          ))}

          {!creatingFolder ? (
            <button
              onClick={() => setCreatingFolder(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Nova pasta</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Nome da pasta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) {
                    handleSaveFavorite(null, newFolderName.trim());
                  }
                }}
                className="h-10 text-sm"
              />
              <Button
                size="sm"
                className="rounded-full h-10 px-4"
                disabled={!newFolderName.trim()}
                onClick={() => handleSaveFavorite(null, newFolderName.trim())}
              >
                Salvar
              </Button>
              <CloseButton
                variant="ghost"
                size="sm"
                label="Cancelar"
                onClick={() => { setCreatingFolder(false); setNewFolderName(""); }}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
