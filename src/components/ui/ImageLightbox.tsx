import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CloseButton } from "@/components/ui/CloseButton";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth";
import { CANONICAL_REACTIONS } from "@/lib/constants";

interface PhotoReaction {
  emoji: string;
  count: number;
}

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  titles?: string[];
  captions?: string[];
  aspectRatio?: "4/5" | "auto";
  photoIds?: (string | null)[];
}

export default function ImageLightbox({ images, initialIndex = 0, open, onClose, titles, captions, aspectRatio = "auto", photoIds }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [reactions, setReactions] = useState<PhotoReaction[]>([]);
  const [userEmoji, setUserEmoji] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  useEffect(() => {
    if (open) setCurrentIndex(initialIndex);
  }, [open, initialIndex]);

  const currentPhotoId = photoIds?.[currentIndex] ?? null;

  useEffect(() => {
    if (!open || !currentPhotoId) { setReactions([]); setUserEmoji(null); return; }
    async function load() {
      const [{ data: counts }, userId] = await Promise.all([
        supabase.from("photo_reaction_counts").select("emoji, count").eq("photo_id", currentPhotoId!),
        getCurrentUserId(),
      ]);
      setReactions(counts?.filter(r => (r.count ?? 0) > 0) ?? []);
      const { data: ur } = await supabase.from("photo_reactions").select("emoji").eq("photo_id", currentPhotoId!).eq("user_id", userId).maybeSingle();
      setUserEmoji(ur?.emoji ?? null);
    }
    load();
  }, [open, currentPhotoId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, currentIndex]);

  const prev = useCallback(() => setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1)), [images.length]);
  const next = useCallback(() => setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0)), [images.length]);

  const handleReact = async (emoji: string) => {
    if (!currentPhotoId) return;
    const userId = await getCurrentUserId();
    
    // Optimistic update — immediate count change
    const previousEmoji = userEmoji;
    const previousReactions = [...reactions];

    if (previousEmoji === emoji) {
      // Toggle off
      setUserEmoji(null);
      setReactions(prev => prev.map(r => 
        r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1) } : r
      ).filter(r => r.count > 0));
    } else {
      setUserEmoji(emoji);
      setReactions(prev => {
        let updated = prev.map(r => {
          if (r.emoji === emoji) return { ...r, count: r.count + 1 };
          if (r.emoji === previousEmoji) return { ...r, count: Math.max(0, r.count - 1) };
          return r;
        });
        // If emoji not in list, add it
        if (!updated.find(r => r.emoji === emoji)) {
          updated.push({ emoji, count: 1 });
        }
        return updated.filter(r => r.count > 0);
      });
    }
    
    try {
      const { error: reactError } = await supabase.rpc("upsert_photo_reaction", { p_photo_id: currentPhotoId, p_user_id: userId, p_emoji: emoji });
      if (reactError) throw reactError;
      // Reload to sync with server
      const { data: counts } = await supabase.from("photo_reaction_counts").select("emoji, count").eq("photo_id", currentPhotoId);
      setReactions(counts?.filter(r => (r.count ?? 0) > 0) ?? []);
      const { data: ur } = await supabase.from("photo_reactions").select("emoji").eq("photo_id", currentPhotoId).eq("user_id", userId).maybeSingle();
      setUserEmoji(ur?.emoji ?? null);
    } catch (error) {
      // Revert optimistic update on error
      setUserEmoji(previousEmoji);
      setReactions(previousReactions);
      console.error("Reaction failed:", error);
    }
    setShowReactionPicker(false);
  };

  if (!open || images.length === 0) return null;

  const hasCaption = titles?.[currentIndex] || captions?.[currentIndex];
  const hasReactions = reactions.length > 0;
  const hasMeta = hasCaption || hasReactions || currentPhotoId;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
        {currentIndex + 1} / {images.length}
      </div>
      <CloseButton variant="overlay" size="md" onClick={onClose} className="absolute top-4 right-4 z-10" />
      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors z-10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors z-10">
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      <div className="flex-1 flex items-center justify-center w-full px-4 pb-10 mt-6"
        onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStart === null) return;
          const diff = touchStart - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
          setTouchStart(null);
        }}
      >
        {aspectRatio === "4/5" ? (
          <div className="w-full max-w-lg aspect-[4/5] rounded-lg overflow-hidden">
            <img src={images[currentIndex]} alt={titles?.[currentIndex] || `Imagem ${currentIndex + 1}`} className="w-full h-full object-cover" />
          </div>
        ) : (
          <img src={images[currentIndex]} alt={titles?.[currentIndex] || `Imagem ${currentIndex + 1}`} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
        )}
      </div>

      {hasMeta && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-xl px-5 py-3 max-w-md w-[90%] text-center space-y-2">
          {titles?.[currentIndex] && <p className="text-white font-semibold text-sm">{titles[currentIndex]}</p>}
          {captions?.[currentIndex] && <p className="text-white/70 text-xs">{captions[currentIndex]}</p>}
          {(hasReactions || currentPhotoId) && (
            <div className="flex justify-center gap-2 flex-wrap pt-1">
              {reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => handleReact(r.emoji)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white transition-all active:scale-75 ${userEmoji === r.emoji ? "bg-primary/50 scale-110 animate-pulse" : "bg-white/15 hover:bg-white/25 hover:scale-110"}`}
                >
                  {r.emoji} <span className="font-medium">{r.count}</span>
                </button>
              ))}
              {currentPhotoId && (
                <button
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded-full px-2.5 py-1 text-xs text-white"
                >
                  +
                </button>
              )}
            </div>
          )}
          {showReactionPicker && currentPhotoId && (
            <div className="flex justify-center gap-3 pt-1">
              {CANONICAL_REACTIONS.map((r) => (
                <button key={r.emoji} onClick={() => handleReact(r.emoji)} className="text-xl hover:scale-125 transition-all active:scale-75 active:rotate-12">
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {images.length > 1 && images.length <= 10 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "bg-white w-4" : "bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
