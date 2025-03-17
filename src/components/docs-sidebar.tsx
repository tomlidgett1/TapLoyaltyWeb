"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { docsConfig } from '@/config/docs-config'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { ChevronLeft, ArrowLeft, LifeBuoy } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Integrated Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/docs" className="flex items-center gap-3">
            <div className="relative h-7 w-7 rounded-md overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="Tap Loyalty" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              Documentation
            </span>
          </Link>
          <nav className="flex items-center gap-2 ml-2">
            <Link
              href="/docs/getting-started"
              className={`text-sm px-3 py-1 rounded-md ${
                pathname === "/docs/getting-started" 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Getting Started
            </Link>
            <Link
              href="/docs/api"
              className={`text-sm px-3 py-1 rounded-md ${
                pathname.startsWith("/docs/api") 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              API
            </Link>
          </nav>
        </div>
      </div>

      {/* Documentation Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-4 space-y-4">
          {docsConfig.map((section) => (
            <div key={section.title} className="space-y-2">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2">
                {section.title}
              </h4>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md",
                        "text-sm text-gray-600 hover:bg-gray-50",
                        pathname === item.href && "bg-blue-50 text-blue-700"
                      )}
                    >
                      {item.icon && (
                        <item.icon className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="truncate">{item.title}</span>
                      {item.badge && (
                        <Badge 
                          variant="outline" 
                          className="ml-auto text-xs bg-white border-gray-200"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Global Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
} 