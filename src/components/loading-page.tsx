import Image from "next/image";
import { cn } from "@/lib/utils";

interface LoadingPageProps {
  className?: string;
}

export function LoadingPage({ className }: LoadingPageProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen bg-gray-50", className)}>
      <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-md shadow-sm border border-gray-200">
        <Image
          src="/taplogo.png"
          alt="Tap Loyalty"
          width={120}
          height={120}
          className="rounded-md"
          priority
        />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#007AFF] border-t-transparent" />
      </div>
    </div>
  );
} 