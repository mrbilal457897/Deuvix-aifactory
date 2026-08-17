import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: { value: number; up: boolean };
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card backdrop-blur-sm p-5 transition-all duration-200 hover:border-primary/30 hover:bg-card/80",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-primary/5" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
          <p className="text-2xl font-heading font-bold text-foreground mt-1.5">{value}</p>
          {trend && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trend.up ? "text-emerald-500" : "text-red-500")}>
              <span>{trend.up ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 border border-primary/20">
          <Icon className="size-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
