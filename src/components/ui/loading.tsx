import { cn } from "@/lib/utils"

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#007AFF] border-t-transparent" />
    </div>
  )
} 