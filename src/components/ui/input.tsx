import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  maxDecimals?: number;
}

function Input({ className, type, onChange, maxDecimals = 2, ...props }: InputProps) {
  // Globally protect all date inputs from large/invalid years (e.g. 222222)
  const finalProps = { ...props };
  if (type === "date" && !finalProps.max) {
    finalProps.max = "2099-12-31";
  }

  // Globally restrict all numeric inputs to 2 decimal places (standard currency/quantities)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      const val = e.target.value;
      // Regex allows integers and up to N fraction digits. 
      // It also allows an empty string or a single trailing dot during typing.
      const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
      if (val !== "" && !regex.test(val)) {
        return;
      }
    }
    onChange?.(e);
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
    />
  )
}

export { Input }
