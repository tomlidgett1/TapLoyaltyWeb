"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Gift, 
  Settings,
  MessageSquare,
  ImagePlus,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  Eye,
  Edit,
  Copy,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { format } from "date-fns"

// Mock data
const items = [
  {
    id: "1",
    name: "Free Coffee",
    type: "reward",
    category: "Individual",
    description: "Get a free coffee with any purchase",
    status: "active",
    points: 100,
    claimed: 45,
    total: 100,
    lastModified: "2024-02-15",
    startDate: "2024-02-01",
    endDate: "2024-03-01"
  },
  {
    id: "2",
    name: "Double Points Weekends",
    type: "rule",
    category: "Points",
    description: "Earn 2x points on all weekend purchases",
    status: "active",
    lastModified: "2024-02-14",
    startDate: "2024-02-01",
    endDate: null
  },
  {
    id: "3",
    name: "Valentine's Day Special",
    type: "message",
    category: "Broadcast",
    description: "Special Valentine's Day promotion announcement",
    status: "inactive",
    sentTo: 1234,
    lastModified: "2024-02-13",
    scheduledDate: "2024-02-14"
  },
  // Add more items...
]

type ItemType = "all" | "reward" | "rule" | "message" | "banner"
type StatusType = "all" | "active" | "inactive" | "archived"

export default function StorePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [itemType, setItemType] = useState<ItemType>("all")
  const [status, setStatus] = useState<StatusType>("all")

  const getIcon = (type: string) => {
    switch (type) {
      case "reward":
        return Gift
      case "rule":
        return Settings
      case "message":
        return MessageSquare
      case "banner":
        return ImagePlus
      default:
        return Gift
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50"
      case "inactive":
        return "text-gray-600 bg-gray-100"
      case "archived":
        return "text-amber-600 bg-amber-50"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const filteredItems = items.filter(item => {
    if (itemType !== "all" && item.type !== itemType) return false
    if (status !== "all" && item.status !== status) return false
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">My Store</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage all your loyalty program content in one place
              </p>
            </div>
          </div>
        </div>

        <Card>
          <div className="p-4 border-b">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search content..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Tabs 
                  defaultValue="all" 
                  className="w-[600px]"
                  value={itemType}
                  onValueChange={(value) => setItemType(value as ItemType)}
                >
                  <TabsList className="bg-[#F5F5F7] p-1 rounded-lg">
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                    <TabsTrigger value="reward" className="flex-1">Rewards</TabsTrigger>
                    <TabsTrigger value="rule" className="flex-1">Rules</TabsTrigger>
                    <TabsTrigger value="message" className="flex-1">Messages</TabsTrigger>
                    <TabsTrigger value="banner" className="flex-1">Banners</TabsTrigger>
                  </TabsList>
                </Tabs>

                <Tabs 
                  defaultValue="all" 
                  value={status}
                  onValueChange={(value) => setStatus(value as StatusType)}
                >
                  <TabsList className="bg-[#F5F5F7] p-1 rounded-lg">
                    <TabsTrigger value="all" className="flex-1">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="active" className="flex-1">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Active
                    </TabsTrigger>
                    <TabsTrigger value="inactive" className="flex-1">
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Inactive
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="flex-1">
                      <Archive className="h-3.5 w-3.5 mr-1.5" />
                      Archived
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          <div className="divide-y">
            {filteredItems.map((item) => {
              const Icon = getIcon(item.type)
              return (
                <div 
                  key={item.id}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50/50 group"
                >
                  <div className="h-10 w-10 rounded-lg bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-[#007AFF]" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{item.name}</h3>
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        getStatusColor(item.status)
                      )}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                      {item.points && (
                        <span className="text-xs text-muted-foreground">
                          {item.points} points
                        </span>
                      )}
                      {item.claimed && (
                        <span className="text-xs text-muted-foreground">
                          {item.claimed}/{item.total} claimed
                        </span>
                      )}
                      {item.sentTo && (
                        <span className="text-xs text-muted-foreground">
                          Sent to {item.sentTo.toLocaleString()} customers
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        Last modified {format(new Date(item.lastModified), 'MMM d, yyyy')}
                      </span>
                      {item.startDate && (
                        <span className="text-[10px] text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(item.startDate), 'MMM d, yyyy')}
                          {item.endDate ? ` - ${format(new Date(item.endDate), 'MMM d, yyyy')}` : ' - Ongoing'}
                        </span>
                      )}
                      {item.scheduledDate && (
                        <span className="text-[10px] text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled for {format(new Date(item.scheduledDate), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
} 