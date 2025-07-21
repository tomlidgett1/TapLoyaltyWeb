import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface LoadingPageProps {
  className?: string;
}

export function LoadingPage({ className }: LoadingPageProps) {
  const [progress, setProgress] = useState(0);

  // Simulate progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15 + 5; // Random increment between 5-20
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen bg-[#F5F5F5]", className)}>
      <div className="flex flex-col items-center gap-8 p-8">
        {/* Tap Loyalty Text */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-[#007AFF] mb-2">
            Tap Loyalty
          </h1>
          <p className="text-gray-600 text-sm">
            Loading your dashboard...
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-80 max-w-full">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-[#007AFF] h-1.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              {Math.round(progress)}% complete
            </span>
            <span className="text-xs text-gray-400">
              Please wait...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 