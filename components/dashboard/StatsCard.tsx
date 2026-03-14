import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number }>;
  trend?: number;
  trendLabel?: string;
  accentColor?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  accentColor = "var(--accent)",
}: StatsCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className="card card-hover"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            {title}
          </p>
          <p className="text-2xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3"
          style={{ background: `${accentColor}20`, color: accentColor }}
        >
          <Icon size={20} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold",
              isPositive ? "text-[var(--success)]" : "text-[var(--danger)]"
            )}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
          {trendLabel && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
