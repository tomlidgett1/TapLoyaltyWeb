"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface ConnectionButtonProps {
  className?: string;
  initialText: string;
  connectedText: string;
  isConnected: boolean;
  onToggle: (connected: boolean) => void;
  disabled?: boolean;
  type?: 'cs' | 'reward';
}

export const ConnectionButton = ({
  className,
  initialText,
  connectedText,
  isConnected = false,
  onToggle,
  disabled = false,
  type = 'cs'
}: ConnectionButtonProps) => {
  const [connecting, setConnecting] = useState(false);
  
  const handleClick = () => {
    if (disabled || connecting) return;
    
    if (!isConnected) {
      setConnecting(true);
      setTimeout(() => {
        setConnecting(false);
        onToggle(true);
      }, 1500);
    } else {
      onToggle(false);
    }
  };
  
  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium border rounded-md transition-colors",
        isConnected 
          ? "bg-green-50 text-green-700 border-green-200" 
          : "border-gray-200 text-muted-foreground hover:bg-gray-50",
        connecting && "bg-gray-50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleClick}
      disabled={disabled || connecting}
    >
      {connecting ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Adding to agent...</span>
        </>
      ) : isConnected ? (
        <>
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span>{connectedText}</span>
        </>
      ) : (
        <span>{initialText}</span>
      )}
    </button>
  );
};

interface AnimatedCheckboxProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  animate?: boolean;
  gradient?: boolean;
  label?: string;
}

export const AnimatedCheckbox = ({
  className,
  checked = false,
  onCheckedChange,
  disabled = false,
  animate = false,
  gradient = false,
  label
}: AnimatedCheckboxProps) => {
  return (
    <button 
      className={cn(
        "flex items-center gap-2 text-sm font-medium transition-colors group",
        checked 
          ? "text-primary" 
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={() => !disabled && onCheckedChange && onCheckedChange(!checked)}
      disabled={disabled}
    >
      <div className={cn(
        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
        checked 
          ? "bg-primary border-primary text-primary-foreground" 
          : "border-gray-300 group-hover:border-gray-400",
        animate && "animate-pulse"
      )}>
        {checked && (
          <span className={cn(
            "flex items-center justify-center w-full h-full",
            gradient && animate && "bg-gradient-to-r from-[#0D6EFD] to-[#FF8C00] rounded-sm"
          )}>
            <Check className="h-3 w-3 text-white" />
          </span>
        )}
      </div>
      {label && <span>{label}</span>}
    </button>
  );
};

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-md border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox } 