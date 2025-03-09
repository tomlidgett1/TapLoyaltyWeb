"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell
} from "@/components/ui/table"
import { 
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Calendar } from "lucide-react"
import { Filter, Download, Search, MoreHorizontal, Eye, Image as ImageIcon, Plus, Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy, Timestamp, where, doc, getDoc, deleteDoc } from "firebase/firestore"
import { TapAiButton } from "@/components/tap-ai-button"
import { toast } from "@/components/ui/use-toast"
import { BannerPreview, BannerStyle, BannerVisibility } from "@/components/banner-preview"

/** 
 * Replace this interface with your actual banner data fields.
 * For demonstration, we assume a "Banner" has an id, title, status, etc.
 */
interface Banner {
  id: string
  title: string
  imageUrl: string
  status: string  // "active", "draft", "expired"
  createdAt: Timestamp | string
  expiresAt?: Timestamp | string
  link?: string
  description?: string
  color?: string
  cssColor?: string
}

export default function BannerPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [banners, setBanners] = useState<Banner[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilters, setStatusFilters] = useState({
    active: true,
    draft: true,
    expired: true
  })
  const [dateFilter, setDateFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  // Fetch banners from Firestore
  useEffect(() => {
    const fetchBanners = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        
        const bannersRef = collection(db, 'merchants', user.uid, 'banners')
        const bannersQuery = query(bannersRef, orderBy('createdAt', 'desc'))
        const bannersSnapshot = await getDocs(bannersQuery)
        
        const bannersData: Banner[] = []
        bannersSnapshot.forEach((doc) => {
          bannersData.push({
            id: doc.id,
            ...doc.data() as Omit<Banner, 'id'>
          })
        })
        
        setBanners(bannersData)
      } catch (error) {
        console.error("Error fetching banners:", error)
        toast({
          title: "Error",
          description: "Failed to load banners. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchBanners()
  }, [user])

  /**
   * Filtering function: 
   * - matches search by title
   * - applies status filters
   * - date filter is mocked for demonstration
   */
  const filteredBanners = banners.filter(banner => {
    const matchesSearch = !searchQuery
      ? true
      : banner.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (banner.description && banner.description.toLowerCase().includes(searchQuery.toLowerCase()))

    // Handle undefined or null status values
    const status = banner.status?.toLowerCase() || 'unknown';
    const matchesStatus = statusFilters[status as keyof typeof statusFilters] || 
                          (status === 'unknown' && statusFilters.draft); // Default unknown status to draft filter

    // For demonstration only (no custom start/end date range here)
    if (dateFilter === "all") {
      return matchesSearch && matchesStatus
    }

    // Example: filter only today's banners
    if (dateFilter === "today") {
      const bannerDate = banner.createdAt ? 
        (typeof banner.createdAt === 'object' && 'seconds' in banner.createdAt) ? 
          new Date(banner.createdAt.seconds * 1000) : 
          new Date(banner.createdAt) : 
        new Date();
        
      const now = new Date()
      const isToday =
        bannerDate.getDate() === now.getDate() &&
        bannerDate.getMonth() === now.getMonth() &&
        bannerDate.getFullYear() === now.getFullYear()
      return matchesSearch && matchesStatus && isToday
    }

    return matchesSearch && matchesStatus
  })

  // Format date for display - handle both string dates and Firestore timestamps
  const formatDate = (dateValue: Timestamp | string | undefined) => {
    if (!dateValue) return "N/A"
    
    try {
      // Handle Firestore Timestamp
      if (typeof dateValue === 'object' && 'seconds' in dateValue) {
        const date = new Date(dateValue.seconds * 1000)
        return format(date, 'MMM d, yyyy h:mm a')
      }
      
      // Handle string date
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue)
        return format(date, 'MMM d, yyyy h:mm a')
      }
      
      return "Invalid date"
    } catch (e) {
      console.error("Error formatting date:", e)
      return "Invalid date"
    }
  }

  // Mock PDF export
  const handleExportPDF = () => {
    alert("Exporting banners to PDF (mock). Implement PDF logic here.")
  }

  const handleViewDetails = (bannerId: string) => {
    // Replace with valid path or routing logic for your store
    router.push(`/store/banner/${bannerId}`)
  }

  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setStatusFilters(prev => ({
      ...prev,
      [status.toLowerCase()]: checked
    }))
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Banners</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your store banners
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TapAiButton 
            initialPrompt="Help me create a banner for my store" 
            variant="outline"
            className="gap-2"
          />
          <Button 
            variant="default" 
            className="h-9 gap-2 rounded-md bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push('/store/banner/create')}
          >
            <Plus className="h-4 w-4" />
            Create Banner
          </Button>
          <Button 
            variant="outline" 
            className="h-9 gap-2 rounded-md"
            onClick={handleExportPDF}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="whitespace-nowrap">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              All Banners
            </TabsTrigger>
            <TabsTrigger value="previews" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview Styles
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search banners..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-1">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium">Filter Banners</h4>

                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Select 
                      value={dateFilter} 
                      onValueChange={(value) => setDateFilter(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="thisWeek">This Week</SelectItem>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="status-active" 
                          checked={statusFilters.active}
                          onCheckedChange={(checked) => handleStatusFilterChange("active", !!checked)}
                        />
                        <Label htmlFor="status-active" className="cursor-pointer">Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="status-draft" 
                          checked={statusFilters.draft}
                          onCheckedChange={(checked) => handleStatusFilterChange("draft", !!checked)}
                        />
                        <Label htmlFor="status-draft" className="cursor-pointer">Draft</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="status-expired" 
                          checked={statusFilters.expired}
                          onCheckedChange={(checked) => handleStatusFilterChange("expired", !!checked)}
                        />
                        <Label htmlFor="status-expired" className="cursor-pointer">Expired</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDateFilter("all")
                        setStatusFilters({ active: true, draft: true, expired: true })
                      }}
                    >
                      Reset
                    </Button>
                    <Button onClick={() => setShowFilters(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <TabsContent value="all">
          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No banners found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No banner records available"}
              </p>
              <Button
                variant="default"
                className="mt-2 gap-2"
                onClick={() => router.push("/store/banner/create")}
              >
                <Plus className="h-4 w-4" />
                Create Your First Banner
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filteredBanners.map((banner) => {
                console.log("Banner style:", banner.style, "Color:", banner.color);
                return (
                  <BannerPreview
                    key={banner.id}
                    title={banner.title}
                    description={banner.description}
                    buttonText={banner.buttonText}
                    color={banner.color ?? "#0ea5e9"}
                    styleType={
                      banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                      banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                      banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                      BannerStyle.LIGHT // Default to LIGHT if style is undefined
                    }
                    merchantName={banner.merchantName ?? "My Store"}
                    visibilityType={BannerVisibility.ALL}
                    isActive={banner.isActive}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="previews">
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Previews</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Explore different banner styles below
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <BannerPreview
                  title="Light Banner"
                  description="This is a light style banner preview"
                  buttonText="Shop Now"
                  color="#0ea5e9"
                  styleType={BannerStyle.LIGHT}
                  merchantName="My Test Store"
                  visibilityType={BannerVisibility.ALL}
                  isActive
                />
                <p className="text-center text-sm mt-2 font-medium">Light</p>
              </div>

              <div className="flex flex-col">
                <BannerPreview
                  title="Dark Banner"
                  description="This is a dark style banner preview"
                  buttonText="Learn More"
                  color="#374151"
                  styleType={BannerStyle.DARK}
                  merchantName="My Test Store"
                  visibilityType={BannerVisibility.ALL}
                  isActive
                />
                <p className="text-center text-sm mt-2 font-medium">Dark</p>
              </div>

              <div className="flex flex-col">
                <BannerPreview
                  title="Glass Banner"
                  description="This is a glass style banner preview"
                  buttonText="Read More"
                  color="#333333"
                  styleType={BannerStyle.GLASS}
                  merchantName="My Test Store"
                  visibilityType={BannerVisibility.ALL}
                  isActive
                />
                <p className="text-center text-sm mt-2 font-medium">Glass</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 