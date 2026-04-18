"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Props {
  selectedMonth: number; // 1-indexed
  selectedYear: number;
}

export default function DashboardMonthPicker({ selectedMonth, selectedYear }: Props) {
  const router = useRouter();
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i);

  const isCurrentMonth =
    selectedYear === currentYear && selectedMonth === now.getMonth() + 1;

  function navigate(month: number, year: number) {
    router.push(`/dashboard?month=${month}&year=${year}`);
  }

  function prev() {
    if (selectedMonth === 1) navigate(12, selectedYear - 1);
    else navigate(selectedMonth - 1, selectedYear);
  }

  function next() {
    if (isCurrentMonth) return;
    if (selectedMonth === 12) navigate(1, selectedYear + 1);
    else navigate(selectedMonth + 1, selectedYear);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={prev}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: "var(--text-muted)", border: "1px solid var(--border)", background: "var(--bg-primary)" }}
        title="Mes anterior"
      >
        <ChevronLeft size={15} />
      </button>

      <select
        value={selectedMonth}
        onChange={(e) => navigate(parseInt(e.target.value), selectedYear)}
        className="input-field text-sm"
        style={{ width: "auto", paddingTop: "0.375rem", paddingBottom: "0.375rem" }}
      >
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>

      <select
        value={selectedYear}
        onChange={(e) => navigate(selectedMonth, parseInt(e.target.value))}
        className="input-field text-sm"
        style={{ width: "auto", paddingTop: "0.375rem", paddingBottom: "0.375rem" }}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <button
        onClick={next}
        disabled={isCurrentMonth}
        className="p-1.5 rounded-lg transition-colors"
        style={{
          color: isCurrentMonth ? "var(--border)" : "var(--text-muted)",
          border: "1px solid var(--border)",
          background: "var(--bg-primary)",
          cursor: isCurrentMonth ? "not-allowed" : "pointer",
        }}
        title="Mes siguiente"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
