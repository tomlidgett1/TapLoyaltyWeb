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
    <div className="h-full flex flex-col bg-white">
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
                      scroll={false}
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

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/dashboard"
          className="w-full flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
} 