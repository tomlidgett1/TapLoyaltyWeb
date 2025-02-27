"use client"

import { SideNav } from "@/components/side-nav"
import { usePathname } from "next/navigation"
import { Bell, Search, Command, FileText, Check, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  description: string
  timestamp: Date
  read: boolean
  type: "info" | "success" | "warning" | "error"
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  useEffect(() => {
    // Mock notifications data
    const mockNotifications: Notification[] = [
      {
        id: "1",
        title: "New customer sign up",
        description: "Emma Wilson just joined your loyalty program",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        read: false,
        type: "info"
      },
      {
        id: "2",
        title: "Reward redeemed",
        description: "Free Coffee reward was redeemed 5 times today",
        timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
        read: false,
        type: "success"
      },
      {
        id: "3",
        title: "Points rule update",
        description: "Your 'Purchase Points' rule was automatically updated",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true,
        type: "warning"
      },
      {
        id: "4",
        title: "Integration connected",
        description: "Your POS system was successfully connected",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        read: true,
        type: "success"
      }
    ]
    
    setNotifications(mockNotifications)
    setUnreadCount(mockNotifications.filter(n => !n.read).length)
  }, [])

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
    setUnreadCount(0)
  }

  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <Check className="h-4 w-4 text-green-500" />
      case "warning":
        return <Bell className="h-4 w-4 text-amber-500" />
      case "error":
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <Bell className="h-4 w-4 text-blue-500" />
    }
  }
  
  // Function to get the current page title based on pathname
  const getPageTitle = () => {
    const path = pathname.split('/')[1]
    if (!path) return 'Dashboard'
    
    // Convert path to title case (e.g., "store" -> "Store")
    return path.charAt(0).toUpperCase() + path.slice(1)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SideNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b flex items-center justify-between px-6 bg-white">
          <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
          
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-8 pr-10 h-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                <Command className="h-3 w-3" />
                K
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-2"
            >
              <FileText className="h-4 w-4" />
              Docs
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-md">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <h3 className="font-medium">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs rounded-md"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={cn(
                          "px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer",
                          !notification.read && "bg-blue-50/50"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.description}
                            </p>
                            {!notification.read && (
                              <Badge className="mt-2 rounded-md bg-blue-50 text-blue-700 border-blue-200">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center" asChild>
                  <a href="/notifications" className="w-full text-center cursor-pointer">
                    View all notifications
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 