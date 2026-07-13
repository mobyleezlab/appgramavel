import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** % change vs. previous period. Pass `null` to show "Sem dados anteriores", or omit to hide the delta row entirely. */
  delta?: number | null;
  suffix?: string;
  /** When true, an upward delta is treated as bad news (e.g. complaints, errors) and colored destructive instead of success. */
  danger?: boolean;
  onClick?: () => void;
}

export function KpiCard({ title, value, icon: Icon, delta, suffix, danger, onClick }: KpiCardProps) {
  const isUp = (delta ?? 0) > 0;
  const isDown = (delta ?? 0) < 0;
  const isDanger = danger && Number(value) > 0;

  return (
    <Card
      className={cn(onClick && "cursor-pointer hover:shadow-md transition-shadow")}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold mt-1 truncate", isDanger && "text-destructive")}>
              {value}{suffix ?? ""}
            </p>
            {delta !== undefined && delta !== null && (
              <p
                className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  isUp && (danger ? "text-destructive" : "text-success"),
                  isDown && (danger ? "text-success" : "text-destructive"),
                  !isUp && !isDown && "text-muted-foreground",
                )}
              >
                {isUp && <TrendingUp className="w-3 h-3" />}
                {isDown && <TrendingDown className="w-3 h-3" />}
                {delta > 0 ? "+" : ""}{delta}% vs. período anterior
              </p>
            )}
            {delta === null && (
              <p className="text-xs mt-1 text-muted-foreground">Sem dados anteriores</p>
            )}
          </div>
          <div
            className={cn(
              "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ml-2",
              isDanger ? "bg-destructive/10" : "bg-primary/10",
            )}
          >
            <Icon className={cn("h-5 w-5", isDanger ? "text-destructive" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
