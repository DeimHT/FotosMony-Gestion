"use client";

interface UploadProgressBarProps {
  percent: number;
  /** Texto bajo la barra, ej. archivo actual */
  detail: string;
  className?: string;
}

export default function UploadProgressBar({ percent, detail, className = "" }: UploadProgressBarProps) {
  const pct = Math.min(100, Math.max(0, percent));
  return (
    <div className={`space-y-1.5 ${className}`} role="status" aria-live="polite" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
      </div>
      <p className="text-xs leading-snug truncate" style={{ color: "var(--text-secondary)" }} title={detail}>
        {detail}
      </p>
    </div>
  );
}
