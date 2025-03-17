import { DocsSidebar } from '@/components/docs-sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DocsHeader } from "@/components/docs-header"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] border-r border-gray-200 hidden md:block">
          <DocsSidebar />
        </aside>
        <main className="flex-1 overflow-auto">
          {/* Integrated Search Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
            <div className="flex items-center justify-between px-6 h-16">
              <div className="max-w-2xl w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search documentation..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="px-6 py-8 max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 