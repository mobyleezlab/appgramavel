import { useState } from "react";
import { MapPin, SmilePlus, Share } from "lucide-react";
import { CloseButton } from "@/components/ui/CloseButton";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RatingDisplay } from "@/components/ui/RatingDisplay";
import { useReactions } from "@/contexts/ReactionsContext";
import { useLocation } from "@/contexts/LocationContext";
import { CANONICAL_REACTIONS } from "@/lib/constants";
import { toast } from "sonner";
import type { Post } from "@/data/mock";

interface PostCardProps {
  post: Post;
  isFirst?: boolean;
}

export function PostCard({ post, isFirst = false }: PostCardProps) {
  const navigate = useNavigate();
  const [showReactions, setShowReactions] = useState(false);
  const { getDistance } = useLocation();

  const { getReaction, setReaction, getCountDelta } = useReactions();

  const userReaction = getReaction(post.id);

  const rating = (post as any).establishment?.rating ?? post.rating ?? 0;
  const totalReviews = (post as any).establishment?.total_reviews ?? post.total_reviews ?? 0;
  const hasReviews = totalReviews > 0;

  const distanceLabel = (() => {
    const est = (post as any).establishment;
    const lat = est?.latitude ?? (post as any).latitude;
    const lng = est?.longitude ?? (post as any).longitude;
    if (lat && lng) {
      const real = getDistance(Number(lat), Number(lng));
      if (real) return real;
    }
    const fallback = est?.distance_km ?? post.distance_km;
    return fallback ? `${Number(fallback).toFixed(1)} km` : null;
  })();

  // Apply count deltas for real-time updates
  const adjustedReactions = (post.reactions ?? []).map(r => ({
    ...r,
    count: Math.max(0, (r.count ?? 0) + getCountDelta(post.id, r.emoji)),
  }));

  // If user reacted with an emoji not in the list, add it
  if (userReaction && !adjustedReactions.find(r => r.emoji === userReaction)) {
    adjustedReactions.push({ emoji: userReaction, count: Math.max(0, getCountDelta(post.id, userReaction)) });
  }

  const totalReactions = adjustedReactions.reduce((sum, r) => sum + (r.count ?? 0), 0);
  const displayReactions = adjustedReactions.filter(r => (r.count ?? 0) > 0).slice(0, 3);

  

  const [animatingEmoji, setAnimatingEmoji] = useState<string | null>(null);

  const handleReact = (emoji: string) => {
    setReaction(post.id, emoji);
    setAnimatingEmoji(emoji);
    setTimeout(() => {
      setAnimatingEmoji(null);
      setShowReactions(false);
    }, 400);
  };

  const handleShare = async () => {
    const slug = post.establishment_slug ?? (post as any).establishment?.slug;
    const url = `${window.location.origin}/estabelecimento/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.establishment_name, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-4">
        <div
          className="flex items-center gap-4 cursor-pointer flex-1 min-w-0"
          onClick={() => navigate(`/estabelecimento/${post.establishment_slug}`)}
        >
          <img
            src={post.establishment_avatar || post.image || "/placeholder.svg"}
            alt={post.establishment_name}
            className="w-12 h-12 rounded-full object-cover border-2 border-border shrink-0"
            width={48}
            height={48}
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight truncate">{post.establishment_name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {post.establishment_category}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Tags row */}
      <div className="px-4 py-2 flex items-center justify-between gap-2">
        <RatingDisplay rating={Number(rating)} totalReviews={totalReviews} />
        {distanceLabel && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <MapPin className="h-3 w-3" />
            {distanceLabel}
          </span>
        )}
      </div>

      {/* Image */}
      <div className="relative w-full aspect-[4/5] overflow-hidden">
        <img
          src={post.image}
          alt={post.establishment_name}
          className="w-full h-full object-cover"
          width={800}
          height={1000}
          loading={isFirst ? "eager" : "lazy"}
          {...(isFirst ? ({ fetchpriority: "high" } as Record<string, string>) : {})}
        />
        {animatingEmoji && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-7xl animate-[fadeInScale_0.4s_ease-out]">{animatingEmoji}</span>
          </div>
        )}
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="p-4 pb-2 space-y-2">
          <p className="text-sm">
            <span className="font-semibold">{post.establishment_name}</span>
            {" · "}
            <span className="text-muted-foreground">{post.caption}</span>
          </p>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between px-4 pb-4 pt-1">
        <button
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary rounded-full hover:bg-secondary/80 transition-all active:scale-95"
          onClick={() => setShowReactions(true)}
          aria-label="Reagir ao post"
        >
          {totalReactions > 0 ? (
            <>
              {displayReactions.map((r) => (
                <span
                  key={r.emoji}
                  className={`text-sm ${userReaction === r.emoji ? "scale-110" : ""} transition-transform`}
                >
                  {r.emoji}
                </span>
              ))}
              <span className="text-xs text-foreground/70 ml-0.5">+{totalReactions}</span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <SmilePlus className="w-3.5 h-3.5" />
              Reagir
            </span>
          )}
        </button>

        <button
          className="p-2 hover:bg-secondary rounded-full transition-colors active:scale-95"
          onClick={handleShare}
          aria-label="Compartilhar"
        >
          <Share className="w-5 h-5" />
        </button>
      </div>

      {/* Reaction Modal */}
      {showReactions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowReactions(false)}
          role="dialog"
          aria-label="Escolher reação"
        >
          <div
            className="w-full max-w-md bg-card rounded-t-2xl border-t border-border p-4 pb-24 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end mb-4">
              <CloseButton variant="ghost" size="sm" onClick={() => setShowReactions(false)} />
            </div>
            <div className="flex justify-around">
              {CANONICAL_REACTIONS.map((item) => {
                const isActive = userReaction === item.emoji;
                const baseCount = (post.reactions ?? []).find((r) => r.emoji === item.emoji)?.count ?? 0;
                const count = Math.max(0, baseCount + getCountDelta(post.id, item.emoji));
                return (
                  <button
                    key={item.emoji}
                    onClick={() => handleReact(item.emoji)}
                    className={`flex flex-col items-center gap-1 p-4 rounded-lg transition-all min-w-[48px] min-h-[48px] active:scale-75 ${
                      isActive ? "bg-primary/10 scale-110 animate-pulse" : "hover:bg-secondary hover:scale-110"
                    }`}
                    aria-label={`Reagir com ${item.label}`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
