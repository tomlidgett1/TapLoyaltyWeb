import { DocsSidebar } from '@/components/docs-sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DocsHeader } from "@/components/docs-header"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-screen">
      {/* Full-width Top Header */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Left Side - Branding and Search */}
          <div className="flex items-center flex-1">
            {/* Branding - Same width as sidebar */}
            <Link href="/docs" className="flex items-center gap-3 shrink-0 w-[256px]">
              <div className="relative h-7 w-7 rounded-md overflow-hidden bg-gray-100 p-1">
                <Image 
                  src="/logo.png" 
                  alt="Tap Loyalty Logo" 
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-900">
                  <span className="text-[#007AFF]">Tap</span> Loyalty
                </span>
                <span className="text-xs text-gray-500">Documentation</span>
              </div>
            </Link>
            
            {/* Larger Search Bar - Aligned with main content */}
            <div className="relative flex-1 max-w-3xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documentation..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Right Side - Navigation Links */}
          <nav className="flex items-center gap-6 ml-6">
            <Link 
              href="/about" 
              className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
            >
              About
            </Link>
            <Link 
              href="/privacy" 
              className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/support" 
              className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Contact Support
            </Link>
          </nav>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] border-r border-gray-200 hidden md:block">
          <ScrollArea className="h-full">
            <DocsSidebar />
          </ScrollArea>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="px-6 py-8 max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 