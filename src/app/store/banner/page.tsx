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
import { Calendar, Clock } from "lucide-react"
import { Filter, Download, Search, MoreHorizontal, Eye, Image as ImageIcon, Plus, Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy, Timestamp, where, doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore"
import { TapAiButton } from "@/components/tap-ai-button"
import { toast } from "@/components/ui/use-toast"
import { BannerPreview, BannerStyle, BannerVisibility } from "@/components/banner-preview"
import { BannerScheduler } from "@/components/banner-scheduler"

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
  isActive: boolean
  scheduleStartMinutes?: number
  scheduleEndMinutes?: number
  scheduleStartHour?: number
  scheduleEndHour?: number
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
          const data = doc.data();
          console.log("Banner data:", data);
          console.log("Status:", data.status);
          console.log("isActive field:", data.isActive);
          
          bannersData.push({
            id: doc.id,
            ...data as Omit<Banner, 'id'>,
            // Use the actual isActive field if it exists, otherwise derive from status
            isActive: data.isActive !== undefined ? data.isActive : data.status === "active"
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

  const handleToggleActive = async (bannerId: string, newActiveState: boolean) => {
    try {
      if (!user?.uid) return;
      
      const bannerRef = doc(db, 'merchants', user.uid, 'banners', bannerId);
      
      // If activating, also set scheduled=true
      if (newActiveState) {
        await updateDoc(bannerRef, {
          isActive: true,
          scheduled: true,
          updatedAt: new Date()
        });
      } else {
        // If deactivating, just update isActive
        await updateDoc(bannerRef, {
          isActive: false,
          updatedAt: new Date()
        });
      }
      
      // Update local state
      setBanners(prev => prev.map(banner => 
        banner.id === bannerId 
          ? {
              ...banner, 
              isActive: newActiveState,
              // Also update scheduled in local state if activating
              ...(newActiveState ? { scheduled: true } : {})
            } 
          : banner
      ));
      
      toast({
        title: newActiveState ? "Banner activated" : "Banner deactivated",
        description: `The banner has been ${newActiveState ? "activated" : "deactivated"} successfully.`,
      });
    } catch (error) {
      console.error("Error toggling banner active state:", error);
      toast({
        title: "Error",
        description: "Failed to update banner. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleBannerScheduleUpdate = async (bannerId: string, updates: any) => {
    try {
      if (!user?.uid) return;
      
      const bannerRef = doc(db, 'merchants', user.uid, 'banners', bannerId);
      await updateDoc(bannerRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      // Update local state
      setBanners(prev => prev.map(banner => 
        banner.id === bannerId 
          ? {...banner, ...updates} 
          : banner
      ));
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating banner schedule:", error);
      toast({
        title: "Error",
        description: "Failed to update banner schedule. Please try again.",
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    const period = hours < 12 ? 'AM' : 'PM'
    const displayHours = hours === 0 || hours === 12 ? 12 : hours % 12
    
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`
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
          <Button 
            onClick={() => router.push('/store/banner/create')}
            className="flex items-center gap-1"
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
          <div className="flex items-center">
            <TabsList className="whitespace-nowrap">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                All Banners
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Active
              </TabsTrigger>
              <TabsTrigger value="inactive" className="flex items-center gap-2">
                <Eye className="h-4 w-4 opacity-50" />
                Inactive
              </TabsTrigger>
            </TabsList>
            
            {/* Vertical divider */}
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            
            <TabsList className="whitespace-nowrap">
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule
              </TabsTrigger>
            </TabsList>
          </div>

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
            <div className="grid grid-cols-1 gap-6">
              {filteredBanners.map((banner) => (
                <div key={banner.id} className="group relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row">
                    {/* Banner Preview - Takes 1/3 of the space */}
                    <div className="w-full md:w-1/3 h-[180px] relative overflow-hidden flex items-center justify-center">
                      <div className="w-full max-w-[320px] px-2">
                        <BannerPreview
                          title={banner.title}
                          description={banner.description}
                          buttonText={banner.buttonText}
                          color={banner.color ?? "#0ea5e9"}
                          styleType={
                            banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                            banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                            banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                            BannerStyle.LIGHT
                          }
                          merchantName={banner.merchantName ?? "My Store"}
                          visibilityType={BannerVisibility.ALL}
                          isActive={banner.isActive}
                        />
                      </div>
                    </div>
                    
                    {/* Banner Details - Takes 2/3 of the space */}
                    <div className="w-full md:w-2/3 p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{banner.title}</h3>
                          <p className="text-sm text-gray-500">{banner.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={banner.isActive ? "default" : "outline"} className={banner.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
                            {banner.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {banner.style || "Light"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-xs text-gray-500">Impressions</p>
                          <p className="text-lg font-medium">{banner.impressions || 0}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-xs text-gray-500">Unique Viewers</p>
                          <p className="text-lg font-medium">{banner.impressioncustomercount || 0}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-xs text-gray-500">Action</p>
                          <p className="text-sm font-medium truncate" title={banner.bannerAction}>
                            {banner.bannerAction === "Take to store page" ? "Store Page" : 
                             banner.bannerAction === "Show announcement" ? "Announcement" : 
                             banner.bannerAction || "None"}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-xs text-gray-500">Visibility</p>
                          <p className="text-sm font-medium truncate" title={banner.visibilityType}>
                            {banner.visibilityType || "All customers"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          Created: {formatDate(banner.createdAt)}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8"
                            onClick={() => router.push(`/store/banner/${banner.id}/edit`)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant={banner.isActive ? "destructive" : "default"} 
                            size="sm" 
                            className={`h-8 ${!banner.isActive ? "bg-green-600 hover:bg-green-700" : ""}`}
                            onClick={() => handleToggleActive(banner.id, !banner.isActive)}
                          >
                            {banner.isActive ? (
                              <>
                                <Eye className="h-3.5 w-3.5 mr-1 opacity-50" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            </div>
          ) : filteredBanners.filter(banner => banner.isActive).length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No active banners found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "You don't have any active banners"}
              </p>
              <Button
                variant="default"
                className="mt-2 gap-2"
                onClick={() => router.push("/store/banner/create")}
              >
                <Plus className="h-4 w-4" />
                Create Banner
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredBanners
                .filter(banner => banner.isActive)
                .map((banner) => (
                  <div key={banner.id} className="group relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row">
                      {/* Banner Preview - Takes 1/3 of the space */}
                      <div className="w-full md:w-1/3 h-[180px] relative overflow-hidden flex items-center justify-center">
                        <div className="w-full max-w-[320px] px-2">
                          <BannerPreview
                            title={banner.title}
                            description={banner.description}
                            buttonText={banner.buttonText}
                            color={banner.color ?? "#0ea5e9"}
                            styleType={
                              banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                              banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                              banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                              BannerStyle.LIGHT
                            }
                            merchantName={banner.merchantName ?? "My Store"}
                            visibilityType={BannerVisibility.ALL}
                            isActive={banner.isActive}
                          />
                        </div>
                      </div>
                      
                      {/* Banner Details - Takes 2/3 of the space */}
                      <div className="w-full md:w-2/3 p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold">{banner.title}</h3>
                            <p className="text-sm text-gray-500">{banner.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={banner.isActive ? "default" : "outline"} className={banner.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
                              {banner.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {banner.style || "Light"}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Impressions</p>
                            <p className="text-lg font-medium">{banner.impressions || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Unique Viewers</p>
                            <p className="text-lg font-medium">{banner.impressioncustomercount || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Action</p>
                            <p className="text-sm font-medium truncate" title={banner.bannerAction}>
                              {banner.bannerAction === "Take to store page" ? "Store Page" : 
                               banner.bannerAction === "Show announcement" ? "Announcement" : 
                               banner.bannerAction || "None"}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Visibility</p>
                            <p className="text-sm font-medium truncate" title={banner.visibilityType}>
                              {banner.visibilityType || "All customers"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            Created: {formatDate(banner.createdAt)}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8"
                              onClick={() => router.push(`/store/banner/${banner.id}/edit`)}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant={banner.isActive ? "destructive" : "default"} 
                              size="sm" 
                              className={`h-8 ${!banner.isActive ? "bg-green-600 hover:bg-green-700" : ""}`}
                              onClick={() => handleToggleActive(banner.id, !banner.isActive)}
                            >
                              {banner.isActive ? (
                                <>
                                  <Eye className="h-3.5 w-3.5 mr-1 opacity-50" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            </div>
          ) : filteredBanners.filter(banner => !banner.isActive).length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No inactive banners found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "You don't have any inactive banners"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredBanners
                .filter(banner => !banner.isActive)
                .map((banner) => (
                  <div key={banner.id} className="group relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row">
                      {/* Banner Preview - Takes 1/3 of the space */}
                      <div className="w-full md:w-1/3 h-[180px] relative overflow-hidden flex items-center justify-center">
                        <div className="w-full max-w-[320px] px-2">
                          <BannerPreview
                            title={banner.title}
                            description={banner.description}
                            buttonText={banner.buttonText}
                            color={banner.color ?? "#0ea5e9"}
                            styleType={
                              banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                              banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                              banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                              BannerStyle.LIGHT
                            }
                            merchantName={banner.merchantName ?? "My Store"}
                            visibilityType={BannerVisibility.ALL}
                            isActive={banner.isActive}
                          />
                        </div>
                      </div>
                      
                      {/* Banner Details - Takes 2/3 of the space */}
                      <div className="w-full md:w-2/3 p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold">{banner.title}</h3>
                            <p className="text-sm text-gray-500">{banner.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={banner.isActive ? "default" : "outline"} className={banner.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
                              {banner.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {banner.style || "Light"}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Impressions</p>
                            <p className="text-lg font-medium">{banner.impressions || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Unique Viewers</p>
                            <p className="text-lg font-medium">{banner.impressioncustomercount || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Action</p>
                            <p className="text-sm font-medium truncate" title={banner.bannerAction}>
                              {banner.bannerAction === "Take to store page" ? "Store Page" : 
                               banner.bannerAction === "Show announcement" ? "Announcement" : 
                               banner.bannerAction || "None"}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Visibility</p>
                            <p className="text-sm font-medium truncate" title={banner.visibilityType}>
                              {banner.visibilityType || "All customers"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            Created: {formatDate(banner.createdAt)}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8"
                              onClick={() => router.push(`/store/banner/${banner.id}/edit`)}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant={banner.isActive ? "destructive" : "default"} 
                              size="sm" 
                              className={`h-8 ${!banner.isActive ? "bg-green-600 hover:bg-green-700" : ""}`}
                              onClick={() => handleToggleActive(banner.id, !banner.isActive)}
                            >
                              {banner.isActive ? (
                                <>
                                  <Eye className="h-3.5 w-3.5 mr-1 opacity-50" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <div className="space-y-6">
            <BannerScheduler 
              banners={banners} 
              onBannerUpdate={handleBannerScheduleUpdate} 
            />
            
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-lg font-medium mb-4">Scheduled Banners</h3>
              
              {loading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
                </div>
              ) : filteredBanners.filter(banner => banner.isActive).length === 0 ? (
                <div className="h-24 flex flex-col items-center justify-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No active banners to schedule</h3>
                  <p className="text-sm text-muted-foreground">
                    Activate banners first to schedule them
                  </p>
                  <Button
                    variant="default"
                    className="mt-2 gap-2"
                    onClick={() => router.push("/store/banner/create")}
                  >
                    <Plus className="h-4 w-4" />
                    Create Banner
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBanners
                    .filter(banner => banner.isActive)
                    .map((banner) => (
                      <div key={banner.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-[40px] h-[40px] overflow-hidden rounded">
                            <BannerPreview
                              title={banner.title}
                              description=""
                              buttonText=""
                              color={banner.color ?? "#0ea5e9"}
                              styleType={
                                banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                                banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                                banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                                BannerStyle.LIGHT
                              }
                              merchantName=""
                              visibilityType={BannerVisibility.ALL}
                              isActive={banner.isActive}
                            />
                          </div>
                          <div>
                            <h4 className="font-medium">{banner.title}</h4>
                            <p className="text-sm text-gray-500">
                              {banner.scheduleStartMinutes !== undefined && banner.scheduleEndMinutes !== undefined ? (
                                <>
                                  Scheduled: {formatTime(banner.scheduleStartMinutes)} - {formatTime(banner.scheduleEndMinutes)}
                                </>
                              ) : (
                                "Showing all day"
                              )}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            handleBannerScheduleUpdate(banner.id, {
                              scheduleStartMinutes: 0,
                              scheduleEndMinutes: 24 * 60,
                              scheduleStartHour: 0,
                              scheduleEndHour: 24
                            })
                          }}
                        >
                          Reset Schedule
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 