"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <div
        className={cn(
          "h-4 w-4 rounded-sm border border-input ring-offset-background",
          "relative flex items-center justify-center",
          "data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        data-state={checked ? "checked" : "unchecked"}
        onClick={() => onCheckedChange?.(!checked)}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="absolute opacity-0 w-full h-full cursor-pointer"
          {...props}
        />
        {checked && (
          <Check className="h-3 w-3 text-white" />
        )}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox } 