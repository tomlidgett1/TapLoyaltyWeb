"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Bell, 
  Search, 
  Settings, 
  HelpCircle,
  X,
  Check
} from "lucide-react"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  description: string
  timestamp: Date
  read: boolean
  type: "info" | "success" | "warning" | "error"
}

export function Header() {
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

  return (
    <header className="h-14 border-b bg-white flex items-center px-4 sticky top-0 z-30">
      <div className="flex-1 flex items-center">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search..." 
            className="w-full pl-9 h-9 rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative h-9 w-9 rounded-md">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {unreadCount}
                </span>
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
                      "px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
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
        
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-md">
          <HelpCircle className="h-4 w-4" />
        </Button>
        
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-md">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
} 