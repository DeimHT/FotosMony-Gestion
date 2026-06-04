"use client";

import { useState, useEffect } from "react";
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
  const [display, setDisplay] = useState(value === 0 ? "" : String(value));
  const [focused, setFocused] = useState(false);

  // Sync from outside only when not focused (e.g. external form reset)
  useEffect(() => {
    if (!focused) {
      setDisplay(value === 0 ? "" : String(value));
    }
  }, [value, focused]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setDisplay(raw);
    if (raw === "") return; // wait for blur to enforce min
    const num = parseInt(raw, 10);
    if (num >= min) onChange(num);
  }

  function handleBlur() {
    setFocused(false);
    const num = display === "" ? NaN : parseInt(display, 10);
    if (isNaN(num) || num < min) {
      const fallback = min;
      setDisplay(fallback === 0 ? "" : String(fallback));
      onChange(fallback);
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      placeholder={placeholder ?? (min > 0 ? String(min) : "0")}
      className={cn("input-field", className)}
    />
  );
}
