'use client';

import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  maxDecimals?: number;
}

function Input({ className, type, onChange, maxDecimals = 2, ...props }: InputProps) {
  // Memoize props to ensure stable rendering and avoid serializing internal logic to server components
  const finalProps = React.useMemo(() => {
    const p = { ...props };
    if (type === "date" && !p.max) {
      p.max = "2099-12-31";
    }
    return p;
  }, [props, type]);

  // Globally protect all numeric inputs to N decimal places (standard currency/quantities)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      const val = e.target.value;
      const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
      if (val !== "" && !regex.test(val)) {
        return;
      }
    }
    onChange?.(e);
  };

  // Prevent manual typing for date fields to enforce picker usage
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type === "date") {
      // Allow focus management and navigation keys
      if (["Tab", "Escape", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        return;
      }
      e.preventDefault();
      // Auto-trigger browser date picker on interaction
      (e.target as HTMLInputElement).showPicker?.();
    }
    props.onKeyDown?.(e);
  };

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...finalProps}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={(e) => { if (type === "date") e.preventDefault(); props.onPaste?.(e); }}
    />
  )
}

export { Input }
