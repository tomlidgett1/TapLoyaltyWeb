import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function Sidebar() {
  return (
    <div className="h-screen flex flex-col border-r bg-white">
      <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3">
        <div className="relative h-8 w-8">
          <Image 
            src="/logo.png" 
            alt="Tap Loyalty Logo" 
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        <span className="font-bold text-lg">Tap Loyalty</span>
      </Link>
      
      {/* Rest of your sidebar content */}
    </div>
  );
} 