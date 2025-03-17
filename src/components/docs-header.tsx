"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, LifeBuoy } from "lucide-react"

export function DocsHeader() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white z-40">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4">
            <Link
              href="/docs"
              className={`text-sm font-medium ${
                pathname === "/docs" 
                  ? "text-blue-600" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Guides
            </Link>
            <Link
              href="/docs/api"
              className={`text-sm font-medium ${
                pathname.startsWith("/docs/api") 
                  ? "text-blue-600" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              API
            </Link>
            <Link
              href="/docs/support"
              className={`text-sm font-medium ${
                pathname.startsWith("/docs/support") 
                  ? "text-blue-600" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Support
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documentation..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/support">
              <LifeBuoy className="h-4 w-4 mr-2" />
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
} 