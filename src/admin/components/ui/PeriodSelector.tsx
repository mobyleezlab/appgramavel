import { cn } from "@/lib/utils";

export type Period = 7 | 30 | 90 | "all";

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
  { label: "Tudo", value: "all" },
];

export function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex rounded-lg border bg-card p-1">
      {PERIOD_OPTIONS.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full transition-colors",
            value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
