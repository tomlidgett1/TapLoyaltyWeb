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
import { Calendar, Clock, Store, Gift, Sparkles, Users, UserPlus, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, XCircle, BarChart, PieChart, Activity, Bell, Library, Plus, Search, Edit, Check, Image as ImageIcon } from "lucide-react"
import { Filter, Download, MoreHorizontal, Eye, Trash2 } from "lucide-react"
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

  // Update handleToggleActive to set isActive to false when activating

  const handleToggleActive = async (bannerId: string, newActiveState: boolean) => {
    try {
      if (!user?.uid) return;
      
      // If activating, check for schedule conflicts and auto-resolve if needed
      if (newActiveState) {
        const bannerToActivate = banners.find(b => b.id === bannerId);
        
        if (!bannerToActivate) {
          throw new Error("Banner not found");
        }
        
        // Get the start and end minutes for the banner being activated
        let startMinutes = bannerToActivate.scheduleStartMinutes !== undefined 
          ? bannerToActivate.scheduleStartMinutes 
          : (bannerToActivate.scheduleStartHour !== undefined ? bannerToActivate.scheduleStartHour * 60 : 0);
        
        let endMinutes = bannerToActivate.scheduleEndMinutes !== undefined 
          ? bannerToActivate.scheduleEndMinutes 
          : (bannerToActivate.scheduleEndHour !== undefined ? bannerToActivate.scheduleEndHour * 60 : 24 * 60);
        
        // Check for conflicts with other active and scheduled banners
        const activeScheduledBanners = banners.filter(banner => 
          banner.id !== bannerId && 
          banner.isActive && 
          banner.scheduled
        );
        
        // If there are conflicts, find a free time slot
        const hasConflict = activeScheduledBanners.some(banner => 
          startMinutes < (banner.scheduleEndMinutes || banner.scheduleEndHour * 60 || 24 * 60) && 
          endMinutes > (banner.scheduleStartMinutes || banner.scheduleStartHour * 60 || 0)
        );
        
        if (hasConflict) {
          // Find a free time slot (minimum 2 hours)
          const minSlotSize = 120; // 2 hours in minutes
          const freeSlot = findFreeTimeSlot(activeScheduledBanners, minSlotSize);
          
          if (freeSlot) {
            // Use the free slot
            startMinutes = freeSlot.start;
            endMinutes = freeSlot.end;
            
            // Show toast about automatic scheduling
            toast({
              title: "Schedule Adjusted",
              description: `Banner schedule was automatically adjusted to ${formatTime(startMinutes)} - ${formatTime(endMinutes)} to avoid conflicts.`,
            });
          } else {
            // No free slot found
            toast({
              title: "Schedule Conflict",
              description: "No available time slot found. Please deactivate another banner or manually adjust schedules.",
              variant: "destructive"
            });
            return; // Exit without activating
          }
        }
        
        const bannerRef = doc(db, 'merchants', user.uid, 'banners', bannerId);
        
        // Store time values as strings in 24-hour format (HH:MM)
        const startTimeString = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
        const endTimeString = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
        
        // Update with new schedule if it was adjusted
        await updateDoc(bannerRef, {
          isActive: false, // Set to false when activating, as requested
          scheduled: true,
          scheduleStartMinutes: startMinutes,
          scheduleEndMinutes: endMinutes,
          scheduleStartHour: Math.floor(startMinutes / 60),
          scheduleEndHour: Math.ceil(endMinutes / 60),
          startTime: startTimeString,
          endTime: endTimeString,
          updatedAt: new Date()
        });
        
        // Update local state
        setBanners(prev => prev.map(banner => 
          banner.id === bannerId 
            ? {
                ...banner, 
                isActive: false, // Set to false when activating, as requested
                scheduled: true,
                scheduleStartMinutes: startMinutes,
                scheduleEndMinutes: endMinutes,
                scheduleStartHour: Math.floor(startMinutes / 60),
                scheduleEndHour: Math.ceil(endMinutes / 60),
                startTime: startTimeString,
                endTime: endTimeString
              } 
            : banner
        ));
      } else {
        // If deactivating, just update isActive
        const bannerRef = doc(db, 'merchants', user.uid, 'banners', bannerId);
        await updateDoc(bannerRef, {
          isActive: false, // Keep as false when deactivating
          updatedAt: new Date()
        });
        
        // Update local state
        setBanners(prev => prev.map(banner => 
          banner.id === bannerId 
            ? {...banner, isActive: false} // Keep as false when deactivating
            : banner
        ));
      }
      
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

  // Helper function to find a free time slot
  const findFreeTimeSlot = (activeScheduledBanners: any[], minSlotSize: number) => {
    // If no active banners, return the whole day
    if (activeScheduledBanners.length === 0) {
      return { start: 0, end: 24 * 60 };
    }
    
    // Get all occupied time slots
    const occupiedSlots = activeScheduledBanners.map(banner => ({
      start: banner.scheduleStartMinutes !== undefined 
        ? banner.scheduleStartMinutes 
        : (banner.scheduleStartHour !== undefined ? banner.scheduleStartHour * 60 : 0),
      end: banner.scheduleEndMinutes !== undefined 
        ? banner.scheduleEndMinutes 
        : (banner.scheduleEndHour !== undefined ? banner.scheduleEndHour * 60 : 24 * 60)
    })).sort((a, b) => a.start - b.start);
    
    // Find gaps between occupied slots
    let previousEnd = 0;
    
    for (const slot of occupiedSlots) {
      const gapSize = slot.start - previousEnd;
      
      // If gap is big enough, use it
      if (gapSize >= minSlotSize) {
        return { start: previousEnd, end: slot.start };
      }
      
      previousEnd = Math.max(previousEnd, slot.end);
    }
    
    // Check if there's space after the last banner
    if (24 * 60 - previousEnd >= minSlotSize) {
      return { start: previousEnd, end: 24 * 60 };
    }
    
    // No suitable gap found
    return null;
  };

  const handleBannerScheduleUpdate = async (bannerId: string, updates: any) => {
    try {
      if (!user?.uid) return;
      
      const bannerRef = doc(db, 'merchants', user.uid, 'banners', bannerId);
      
      // If we're setting scheduled to false, also set isActive to false
      if (updates.scheduled === false) {
        updates.isActive = false;
      }
      
      // Handle banners extending past midnight
      if (updates.extendedOverMidnight) {
        // For UI display, we'll use scheduleEndMinutes > 24*60
        // But for time string representation, we'll wrap to next day
        const startMinutes = updates.scheduleStartMinutes ?? 
          banners.find(b => b.id === bannerId)?.scheduleStartMinutes ?? 0;
        
        const endMinutes = updates.scheduleEndMinutes ?? 
          banners.find(b => b.id === bannerId)?.scheduleEndMinutes ?? 0;
        
        // Store time values as strings in 24-hour format (HH:MM)
        updates.startTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
        
        // For end time, wrap to next day format if needed
        const adjustedEndMinutes = endMinutes % (24 * 60);
        updates.endTime = `${Math.floor(adjustedEndMinutes / 60).toString().padStart(2, '0')}:${(adjustedEndMinutes % 60).toString().padStart(2, '0')}`;
        updates.endsNextDay = true;
      }
      // Regular schedule time updates
      else if (updates.scheduleStartMinutes !== undefined || updates.scheduleEndMinutes !== undefined) {
        const banner = banners.find(b => b.id === bannerId);
        if (!banner) return;
        
        const startMinutes = updates.scheduleStartMinutes ?? banner.scheduleStartMinutes ?? 0;
        const endMinutes = updates.scheduleEndMinutes ?? banner.scheduleEndMinutes ?? 24 * 60;
        
        // Store time values as strings in 24-hour format (HH:MM)
        updates.startTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
        updates.endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
        updates.endsNextDay = false;
      }
      
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
      
      toast({
        title: updates.extendedOverMidnight 
          ? "Banner extended past midnight successfully."
          : "Banner schedule has been updated successfully."
      });
    } catch (error) {
      console.error("Error updating banner:", error);
      toast({
        title: "Error",
        description: "Failed to update banner. Please try again.",
        variant: "destructive"
      });
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
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No banners found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Create your first banner to get started"}
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
              {filteredBanners.map((banner) => (
                <div 
                  key={banner.id} 
                  className="group relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Banner Preview - Left Side */}
                    <div className="w-full md:w-1/3 relative overflow-hidden">
                      {/* Status Badge */}
                      <div className="absolute top-3 left-3 z-10 flex space-x-2">
                        {banner.isActive && (
                          <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                            Live
                          </div>
                        )}
                        {banner.scheduled && (
                          <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Scheduled
                          </div>
                        )}
                      </div>
                      
                      {/* Banner Preview */}
                      <div className="h-[200px] flex items-center justify-center">
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
                    </div>

                    {/* Banner Details - Right Side */}
                    <div className="w-full md:w-2/3 p-5">
                      {/* Header with Title and Actions */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold">{banner.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{banner.description}</p>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8"
                            onClick={() => router.push(`/store/banner/${banner.id}/edit`)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          
                          {banner.scheduled ? (
                            <Button 
                              variant="outline"
                              size="sm" 
                              className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                handleBannerScheduleUpdate(banner.id, {
                                  scheduled: false
                                })
                              }}
                            >
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              Remove from Schedule
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"
                              size="sm" 
                              className="h-8"
                              onClick={() => handleBannerScheduleUpdate(banner.id, {
                                scheduled: true,
                                scheduleStartMinutes: 0,
                                scheduleEndMinutes: 24 * 60
                              })}
                            >
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              Schedule
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Schedule information - only show if scheduled */}
                      {banner.scheduled && (
                        <div className="flex items-center gap-2 mb-4 bg-blue-50 p-3 rounded-md">
                          <Clock className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-blue-700">
                              {banner.scheduleStartMinutes !== undefined && banner.scheduleEndMinutes !== undefined ? (
                                <>
                                  Scheduled: {formatTime(banner.scheduleStartMinutes)} - {formatTime(banner.scheduleEndMinutes % (24 * 60))}
                                  {banner.endsNextDay && <span className="ml-1 text-xs bg-blue-100 px-1 py-0.5 rounded">Next day</span>}
                                </>
                              ) : (
                                "Scheduled all day"
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Metrics Section */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                          <BarChart className="h-4 w-4 mr-1.5 text-gray-500" />
                          Performance Metrics
                        </h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Impressions */}
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                            <div className="flex items-center text-xs text-gray-500 mb-1">
                              <BarChart className="h-3 w-3 mr-1" />
                              Impressions
                            </div>
                            <div className="flex items-baseline">
                              <p className="text-lg font-semibold">{banner.impressions || 0}</p>
                              <p className="text-xs text-gray-500 ml-1">views</p>
                            </div>
                          </div>
                          
                          {/* Unique Viewers */}
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                            <div className="flex items-center text-xs text-gray-500 mb-1">
                              <Users className="h-3 w-3 mr-1" />
                              Unique Viewers
                            </div>
                            <div className="flex items-baseline">
                              <p className="text-lg font-semibold">{banner.impressioncustomercount || 0}</p>
                              <p className="text-xs text-gray-500 ml-1">customers</p>
                            </div>
                          </div>
                          
                          {/* Action */}
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                            <div className="flex items-center text-xs text-gray-500 mb-1">
                              <Activity className="h-3 w-3 mr-1" />
                              Action
                            </div>
                            <p className="text-sm font-medium truncate" title={banner.bannerAction}>
                              {banner.bannerAction === "Take to store page" ? "Store Page" : 
                               banner.bannerAction === "Show announcement" ? "Announcement" : 
                               banner.bannerAction || "None"}
                            </p>
                          </div>
                          
                          {/* Visibility */}
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                            <div className="flex items-center text-xs text-gray-500 mb-1">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Visibility
                            </div>
                            <p className="text-sm font-medium truncate" title={banner.visibilityType}>
                              {banner.visibilityType || "All customers"}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Info - Only Created Date */}
                      <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Created: {banner.createdAt instanceof Timestamp 
                            ? format(banner.createdAt.toDate(), 'MMM d, yyyy') 
                            : typeof banner.createdAt === 'string' 
                              ? banner.createdAt 
                              : 'Unknown'}
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
          ) : filteredBanners.filter(banner => banner.scheduled).length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No active banners found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Schedule banners to make them active"}
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
            <div className="space-y-8">
              {/* Currently Live section */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-green-500" />
                  Currently Live
                  <Badge variant="outline" className="ml-2">
                    {filteredBanners.filter(banner => banner.scheduled && banner.isActive).length}
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These banners are currently visible to customers based on their schedule.
                </p>
                
                <div className="grid grid-cols-1 gap-6">
                  {filteredBanners
                    .filter(banner => banner.scheduled && banner.isActive)
                    .map((banner) => (
                      <div 
                        key={banner.id} 
                        className="group relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col md:flex-row">
                          {/* Banner Preview - Left Side */}
                          <div className="w-full md:w-1/3 relative overflow-hidden">
                            {/* Status Badge */}
                            <div className="absolute top-3 left-3 z-10 flex space-x-2">
                              <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                                Live
                              </div>
                              <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Scheduled
                              </div>
                            </div>
                            
                            {/* Banner Preview */}
                            <div className="h-[200px] flex items-center justify-center">
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
                          </div>

                          {/* Banner Details - Right Side */}
                          <div className="w-full md:w-2/3 p-5">
                            {/* Header with Title and Actions */}
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-xl font-semibold">{banner.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{banner.description}</p>
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex items-center gap-2">
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
                                  variant="outline"
                                  size="sm" 
                                  className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    handleBannerScheduleUpdate(banner.id, {
                                      scheduled: false
                                    })
                                  }}
                                >
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                  Remove from Schedule
                                </Button>
                              </div>
                            </div>
                            
                            {/* Schedule information */}
                            <div className="flex items-center gap-2 mb-4 bg-blue-50 p-3 rounded-md">
                              <Clock className="h-5 w-5 text-blue-500" />
                              <div>
                                <p className="text-sm font-medium text-blue-700">
                                  {banner.scheduleStartMinutes !== undefined && banner.scheduleEndMinutes !== undefined ? (
                                    <>
                                      Showing: {formatTime(banner.scheduleStartMinutes)} - {formatTime(banner.scheduleEndMinutes % (24 * 60))}
                                      {banner.endsNextDay && <span className="ml-1 text-xs bg-blue-100 px-1 py-0.5 rounded">Next day</span>}
                                    </>
                                  ) : (
                                    "Showing all day"
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            {/* Metrics Section */}
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                <BarChart className="h-4 w-4 mr-1.5 text-gray-500" />
                                Performance Metrics
                              </h4>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Impressions */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <BarChart className="h-3 w-3 mr-1" />
                                    Impressions
                                  </div>
                                  <div className="flex items-baseline">
                                    <p className="text-lg font-semibold">{banner.impressions || 0}</p>
                                    <p className="text-xs text-gray-500 ml-1">views</p>
                                  </div>
                                </div>
                                
                                {/* Unique Viewers */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <Users className="h-3 w-3 mr-1" />
                                    Unique Viewers
                                  </div>
                                  <div className="flex items-baseline">
                                    <p className="text-lg font-semibold">{banner.impressioncustomercount || 0}</p>
                                    <p className="text-xs text-gray-500 ml-1">customers</p>
                                  </div>
                                </div>
                                
                                {/* Action */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Action
                                  </div>
                                  <p className="text-sm font-medium truncate" title={banner.bannerAction}>
                                    {banner.bannerAction === "Take to store page" ? "Store Page" : 
                                     banner.bannerAction === "Show announcement" ? "Announcement" : 
                                     banner.bannerAction || "None"}
                                  </p>
                                </div>
                                
                                {/* Visibility */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Visibility
                                  </div>
                                  <p className="text-sm font-medium truncate" title={banner.visibilityType}>
                                    {banner.visibilityType || "All customers"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Additional Info - Only Created Date */}
                            <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Created: {banner.createdAt instanceof Timestamp 
                                  ? format(banner.createdAt.toDate(), 'MMM d, yyyy') 
                                  : typeof banner.createdAt === 'string' 
                                    ? banner.createdAt 
                                    : 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              {/* Scheduled for Later section */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-500" />
                  Scheduled for Later
                  <Badge variant="outline" className="ml-2">
                    {filteredBanners.filter(banner => banner.scheduled && !banner.isActive).length}
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These banners are scheduled but not currently active.
                </p>
                
                <div className="grid grid-cols-1 gap-6">
                  {filteredBanners
                    .filter(banner => banner.scheduled && !banner.isActive)
                    .map((banner) => (
                      <div 
                        key={banner.id} 
                        className="group relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col md:flex-row">
                          {/* Banner Preview - Left Side */}
                          <div className="w-full md:w-1/3 relative overflow-hidden">
                            {/* Status Badge */}
                            <div className="absolute top-3 left-3 z-10 flex space-x-2">
                              <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Scheduled
                              </div>
                            </div>
                            
                            {/* Banner Preview */}
                            <div className="h-[200px] flex items-center justify-center">
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
                          </div>

                          {/* Banner Details - Right Side */}
                          <div className="w-full md:w-2/3 p-5">
                            {/* Header with Title and Actions */}
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-xl font-semibold">{banner.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{banner.description}</p>
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex items-center gap-2">
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
                                  variant="outline"
                                  size="sm" 
                                  className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    handleBannerScheduleUpdate(banner.id, {
                                      scheduled: false
                                    })
                                  }}
                                >
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                  Remove from Schedule
                                </Button>
                              </div>
                            </div>
                            
                            {/* Schedule information */}
                            <div className="flex items-center gap-2 mb-4 bg-blue-50 p-3 rounded-md">
                              <Clock className="h-5 w-5 text-blue-500" />
                              <div>
                                <p className="text-sm font-medium text-blue-700">
                                  {banner.scheduleStartMinutes !== undefined && banner.scheduleEndMinutes !== undefined ? (
                                    <>
                                      Scheduled: {formatTime(banner.scheduleStartMinutes)} - {formatTime(banner.scheduleEndMinutes % (24 * 60))}
                                      {banner.endsNextDay && <span className="ml-1 text-xs bg-blue-100 px-1 py-0.5 rounded">Next day</span>}
                                    </>
                                  ) : (
                                    "Scheduled all day"
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            {/* Metrics Section */}
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                <BarChart className="h-4 w-4 mr-1.5 text-gray-500" />
                                Performance Metrics
                              </h4>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Impressions */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <BarChart className="h-3 w-3 mr-1" />
                                    Impressions
                                  </div>
                                  <div className="flex items-baseline">
                                    <p className="text-lg font-semibold">{banner.impressions || 0}</p>
                                    <p className="text-xs text-gray-500 ml-1">views</p>
                                  </div>
                                </div>
                                
                                {/* Unique Viewers */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <Users className="h-3 w-3 mr-1" />
                                    Unique Viewers
                                  </div>
                                  <div className="flex items-baseline">
                                    <p className="text-lg font-semibold">{banner.impressioncustomercount || 0}</p>
                                    <p className="text-xs text-gray-500 ml-1">customers</p>
                                  </div>
                                </div>
                                
                                {/* Action */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Action
                                  </div>
                                  <p className="text-sm font-medium truncate" title={banner.bannerAction}>
                                    {banner.bannerAction === "Take to store page" ? "Store Page" : 
                                     banner.bannerAction === "Show announcement" ? "Announcement" : 
                                     banner.bannerAction || "None"}
                                  </p>
                                </div>
                                
                                {/* Visibility */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Visibility
                                  </div>
                                  <p className="text-sm font-medium truncate" title={banner.visibilityType}>
                                    {banner.visibilityType || "All customers"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Additional Info - Only Created Date */}
                            <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Created: {banner.createdAt instanceof Timestamp 
                                  ? format(banner.createdAt.toDate(), 'MMM d, yyyy') 
                                  : typeof banner.createdAt === 'string' 
                                    ? banner.createdAt 
                                    : 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            </div>
          ) : filteredBanners.filter(banner => !banner.scheduled).length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No inactive banners</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "All your banners are currently scheduled"}
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
            <div className="space-y-8">
              {/* Unscheduled Banners */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <XCircle className="h-5 w-5 mr-2 text-gray-500" />
                  Unscheduled Banners
                  <Badge variant="outline" className="ml-2">
                    {filteredBanners.filter(banner => !banner.scheduled).length}
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These banners are not scheduled. Schedule them to make them available for display.
                </p>
                
                <div className="grid grid-cols-1 gap-6">
                  {filteredBanners
                    .filter(banner => !banner.scheduled)
                    .map((banner) => (
                      <div 
                        key={banner.id} 
                        className="group relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col md:flex-row">
                          {/* Banner Preview - Left Side */}
                          <div className="w-full md:w-1/3 relative overflow-hidden">
                            {/* Status Badge */}
                            <div className="absolute top-3 left-3 z-10 flex space-x-2">
                              <div className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center">
                                <XCircle className="h-3 w-3 mr-1" />
                                Unscheduled
                              </div>
                            </div>
                            
                            {/* Banner Preview */}
                            <div className="h-[200px] flex items-center justify-center">
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
                          </div>

                          {/* Banner Details - Right Side */}
                          <div className="w-full md:w-2/3 p-5">
                            {/* Header with Title and Actions */}
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-xl font-semibold">{banner.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{banner.description}</p>
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex items-center gap-2">
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
                                  variant="outline"
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => handleBannerScheduleUpdate(banner.id, {
                                    scheduled: true,
                                    scheduleStartMinutes: 0,
                                    scheduleEndMinutes: 24 * 60
                                  })}
                                >
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                  Schedule
                                </Button>
                              </div>
                            </div>
                            
                            {/* Metrics Section */}
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                <BarChart className="h-4 w-4 mr-1.5 text-gray-500" />
                                Performance Metrics
                              </h4>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Impressions */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <BarChart className="h-3 w-3 mr-1" />
                                    Impressions
                                  </div>
                                  <div className="flex items-baseline">
                                    <p className="text-lg font-semibold">{banner.impressions || 0}</p>
                                    <p className="text-xs text-gray-500 ml-1">views</p>
                                  </div>
                                </div>
                                
                                {/* Unique Viewers */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <Users className="h-3 w-3 mr-1" />
                                    Unique Viewers
                                  </div>
                                  <div className="flex items-baseline">
                                    <p className="text-lg font-semibold">{banner.impressioncustomercount || 0}</p>
                                    <p className="text-xs text-gray-500 ml-1">customers</p>
                                  </div>
                                </div>
                                
                                {/* Action */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Action
                                  </div>
                                  <p className="text-sm font-medium truncate" title={banner.bannerAction}>
                                    {banner.bannerAction === "Take to store page" ? "Store Page" : 
                                     banner.bannerAction === "Show announcement" ? "Announcement" : 
                                     banner.bannerAction || "None"}
                                  </p>
                                </div>
                                
                                {/* Visibility */}
                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                  <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Visibility
                                  </div>
                                  <p className="text-sm font-medium truncate" title={banner.visibilityType}>
                                    {banner.visibilityType || "All customers"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Additional Info - Only Created Date */}
                            <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Created: {banner.createdAt instanceof Timestamp 
                                  ? format(banner.createdAt.toDate(), 'MMM d, yyyy') 
                                  : typeof banner.createdAt === 'string' 
                                    ? banner.createdAt 
                                    : 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <div className="space-y-8">
            {/* Activation Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-700 mb-1">Banner Activation Notice</h4>
                <p className="text-sm text-blue-600">
                  Scheduled banners may take up to 5 minutes to activate and appear on the customer app.
                </p>
              </div>
            </div>
            
            {/* Banner Scheduler Component */}
            <BannerScheduler 
              banners={banners} 
              onBannerUpdate={handleBannerScheduleUpdate} 
            />
            
            {/* Banner Library Section */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-medium flex items-center">
                  <Library className="h-5 w-5 mr-2 text-gray-500" />
                  Banner Library
                </h3>
                
                <Input
                  placeholder="Search banners..."
                  className="max-w-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  prefix={<Search className="h-4 w-4 text-gray-400" />}
                />
              </div>
              
              {loading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
                </div>
              ) : filteredBanners.length === 0 ? (
                <div className="h-24 flex flex-col items-center justify-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Bell className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No banners found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "Create your first banner to get started"}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBanners.map((banner) => (
                    <div 
                      key={banner.id} 
                      className="group relative bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-all"
                    >
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        {banner.scheduled && (
                          <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Scheduled
                          </div>
                        )}
                      </div>
                      
                      {/* Banner Preview */}
                      <div className="h-[140px] flex items-center justify-center p-3">
                        <div className="w-full max-w-[280px] mx-auto">
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
                      
                      {/* Banner Info */}
                      <div className="p-4 border-t">
                        <h4 className="font-medium text-sm mb-1 truncate" title={banner.title}>
                          {banner.title}
                        </h4>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2" title={banner.description}>
                          {banner.description}
                        </p>
                        
                        <div className="flex justify-between items-center">
                          {banner.scheduled ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-full border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => handleBannerScheduleUpdate(banner.id, {
                                scheduled: false
                              })}
                            >
                              <span className="flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                Remove from Schedule
                              </span>
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-full"
                              onClick={() => handleBannerScheduleUpdate(banner.id, {
                                scheduled: true,
                                scheduleStartMinutes: 0,
                                scheduleEndMinutes: 24 * 60
                              })}
                            >
                              <span className="flex items-center">
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add to Schedule
                              </span>
                            </Button>
                          )}
                        </div>
                      </div>
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