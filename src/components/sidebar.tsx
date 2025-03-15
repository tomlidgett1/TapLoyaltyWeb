import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '../lib/utils';
import { Sparkles } from 'lucide-react';

export function Sidebar() {
  return (
    <div className="h-screen flex flex-col border-r bg-white">
      <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3">
        <div className="relative h-8 w-8 rounded-md overflow-hidden">
          <Image 
            src="/logo.png" 
            alt="Tap Loyalty Logo" 
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        <span className="text-lg">
          <span className="font-bold">Tap</span>{" "}
          <span className="font-normal">Loyalty</span>
        </span>
      </Link>
      
      {/* Rest of your sidebar content */}
      <Link 
        href="/tap-ai"
        className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-blue-500 text-white"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span>TapAI</span>
        </div>
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-white/30 bg-blue-600 px-1.5 font-mono text-[10px] font-medium text-white">
          <span className="text-xs">⌘</span>I
        </kbd>
      </Link>
    </div>
  );
} 