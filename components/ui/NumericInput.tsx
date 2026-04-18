"use client";

import { cn } from "@/lib/utils";

interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
}

export default function NumericInput({
  value,
  onChange,
  placeholder,
  className,
  min = 0,
}: NumericInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw === "") {
      onChange(0);
      return;
    }
    const num = parseInt(raw, 10);
    if (num < min) return;
    onChange(num);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={value === 0 ? "" : String(value)}
      onChange={handleChange}
      placeholder={placeholder ?? "0"}
      className={cn("input-field", className)}
    />
  );
}
