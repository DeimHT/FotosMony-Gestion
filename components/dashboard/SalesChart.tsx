"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { SalesDataPoint } from "@/types";
import { formatCLP } from "@/lib/utils";

interface SalesChartProps {
  data: SalesDataPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl shadow-xl text-sm"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCLP(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function SalesChart({ data }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradOnline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#E8B84B" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#E8B84B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPresencial" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="fecha"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="online"
          name="Ventas online"
          stroke="#E8B84B"
          strokeWidth={2}
          fill="url(#gradOnline)"
          dot={false}
          activeDot={{ r: 4, fill: "#E8B84B" }}
        />
        <Area
          type="monotone"
          dataKey="presencial"
          name="Ventas presenciales"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#gradPresencial)"
          dot={false}
          activeDot={{ r: 4, fill: "#3B82F6" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
