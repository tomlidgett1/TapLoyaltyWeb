"use client"

import { MerchantSidebar } from "@/components/merchant-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight, Home, Bell } from "lucide-react"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { LoadingScreen } from "@/components/ui/loading"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  // Handle route changes
  useEffect(() => {
    const handleStart = () => setIsLoading(true)
    const handleComplete = () => setIsLoading(false)

    window.addEventListener('routeChangeStart', handleStart)
    window.addEventListener('routeChangeComplete', handleComplete)
    window.addEventListener('routeChangeError', handleComplete)

    return () => {
      window.removeEventListener('routeChangeStart', handleStart)
      window.removeEventListener('routeChangeComplete', handleComplete)
      window.removeEventListener('routeChangeError', handleComplete)
    }
  }, [])

  // Reset loading state when route changes
  useEffect(() => {
    setIsLoading(false)
  }, [pathname, searchParams])

  // Function to generate breadcrumb title
  const getBreadcrumbTitle = (path: string) => {
    const parts = path.split('/')
    const currentPage = parts[parts.length - 1]
    
    switch (currentPage) {
      case 'dashboard':
        return 'Home'
      case 'create':
        return 'Create'
      case 'customers':
        return 'Customers'
      case 'rewards':
        return 'Reward Library'
      case 'store':
        return 'My Store'
      case 'integrations':
        return 'Integrations'
      default:
        return 'Home'
    }
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <MerchantSidebar />
        <SidebarInset className="flex-1 flex flex-col bg-white">
          <div className="flex-1 overflow-auto">
            <div className="max-w-[2000px] mx-auto">
              <header className="h-12 flex items-center justify-between border-b px-4">
                <div className="flex items-center gap-1.5">
                  <SidebarTrigger />
                  <Separator orientation="vertical" className="h-3 mx-1.5" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard" className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Tap Loyalty
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator>
                        <ChevronRight className="h-4 w-4" />
                      </BreadcrumbSeparator>
                      <BreadcrumbItem>
                        <BreadcrumbPage>
                          <span className="inline-flex items-center rounded-md bg-[#007AFF]/10 px-2 py-1 text-xs font-medium text-[#007AFF] ring-1 ring-inset ring-[#007AFF]/20">
                            {getBreadcrumbTitle(pathname)}
                          </span>
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 relative"
                      >
                        <Bell className="h-4 w-4" />
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                          3
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[380px]">
                      <div className="flex items-center justify-between px-3 py-2 border-b">
                        <h4 className="font-medium text-sm">Notifications</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs hover:text-[#007AFF] hover:bg-[#007AFF]/10"
                        >
                          Mark all as read
                        </Button>
                      </div>
                      <div className="py-2">
                        {[
                          {
                            title: "New reward claimed",
                            description: "John Smith claimed Free Coffee reward",
                            time: "2 minutes ago"
                          },
                          {
                            title: "Points rule activated",
                            description: "Double Points Weekends is now active",
                            time: "1 hour ago"
                          },
                          {
                            title: "Broadcast sent",
                            description: "Valentine's Day message sent to 1,234 customers",
                            time: "2 hours ago"
                          }
                        ].map((notification, i) => (
                          <DropdownMenuItem key={i} className="px-3 py-2 cursor-pointer">
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                                <Bell className="h-4 w-4 text-[#007AFF]" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium">{notification.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {notification.description}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                      <div className="p-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-center text-xs hover:text-[#007AFF] hover:bg-[#007AFF]/10"
                        >
                          View all notifications
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>
              
              <main>
                <Suspense fallback={<LoadingScreen />}>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-[calc(100vh-48px)]">
                      <LoadingScreen />
                    </div>
                  ) : (
                    children
                  )}
                </Suspense>
              </main>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
} 