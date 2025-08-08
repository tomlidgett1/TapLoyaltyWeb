"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { BannerPreview, BannerStyle, BannerVisibility } from "@/components/banner-preview"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Clock, Info, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Edit3, MoreVertical } from "lucide-react"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BannerSchedulerProps {
  banners: any[]
  onBannerUpdate: (bannerId: string, updates: any) => Promise<void>
}

export function BannerScheduler({ banners, onBannerUpdate }: BannerSchedulerProps) {
  const { user } = useAuth()
  const [scheduledBanners, setScheduledBanners] = useState<any[]>([])
  const [currentHour, setCurrentHour] = useState<number>(new Date().getHours())
  const [currentMinute, setCurrentMinute] = useState<number>(new Date().getMinutes())
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [draggedBanner, setDraggedBanner] = useState<any>(null)
  const [draggedStartTime, setDraggedStartTime] = useState<number | null>(null)
  const [draggedEndTime, setDraggedEndTime] = useState<number | null>(null)
  const [dragType, setDragType] = useState<'start' | 'end' | 'move' | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [scheduleConflict, setScheduleConflict] = useState<{
    hasConflict: boolean;
    conflictingBanner?: any;
    conflictType: 'overlap' | 'adjacent' | null;
  }>({
    hasConflict: false,
    conflictingBanner: undefined,
    conflictType: null
  });

  // Manual editing states
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingBanner, setEditingBanner] = useState<any>(null)
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  
  // Viewport state (5 hours = 300 minutes)
  const [viewportStart, setViewportStart] = useState(0) // Start at midnight
  const viewportDuration = 5 * 60 // 5 hours in minutes
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Process banners to include scheduling information
  useEffect(() => {
    if (!banners) return
    
    const processed = banners
      .filter(banner => banner.scheduled)
      .map(banner => {
        // Convert hours to minutes, rounding to nearest 15-min increment
        const startMinutes = banner.scheduleStartMinutes !== undefined 
          ? banner.scheduleStartMinutes 
          : (banner.scheduleStartHour !== undefined ? banner.scheduleStartHour * 60 : 0);
        
        const endMinutes = banner.scheduleEndMinutes !== undefined 
          ? banner.scheduleEndMinutes 
          : (banner.scheduleEndHour !== undefined ? banner.scheduleEndHour * 60 : 24 * 60);
        
        // Round to nearest 15-minute increment
        const roundedStartMinutes = Math.round(startMinutes / 15) * 15;
        const roundedEndMinutes = Math.round(endMinutes / 15) * 15;
        
        return {
          ...banner,
          scheduleStartMinutes: roundedStartMinutes,
          scheduleEndMinutes: roundedEndMinutes,
          duration: roundedEndMinutes - roundedStartMinutes
        }
      })
    
    setScheduledBanners(processed)
  }, [banners])

  // Add this to the component to update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours());
      // Force re-render for minute precision
      setCurrentMinute(now.getMinutes());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const currentTimeMinutes = currentHour * 60 + currentMinute
      const pixelPosition = (currentTimeMinutes / 15) * 75
      // Center the current time in the viewport
      const viewportWidth = scrollContainerRef.current.clientWidth
      scrollContainerRef.current.scrollLeft = Math.max(0, pixelPosition - viewportWidth / 2)
    }
  }, []);

  // Modify the checkForConflicts function
  const checkForConflicts = (bannerId: string, startMinutes: number, endMinutes: number): boolean => {
    // Find any banner (except the current one) that overlaps with the proposed time range
    const conflictingBanner = scheduledBanners.find(banner => 
      banner.id !== bannerId && 
      banner.scheduled &&
      (startMinutes < banner.scheduleEndMinutes && endMinutes > banner.scheduleStartMinutes)
    );
    
    if (conflictingBanner) {
      setScheduleConflict({
        hasConflict: true,
        conflictingBanner,
        conflictType: 'overlap'
      });
      return true;
    }
    
    setScheduleConflict({
      hasConflict: false,
      conflictingBanner: undefined,
      conflictType: null
    });
    return false;
  };

  // Update handleMouseMove to check for conflicts in real-time
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedBanner || !timelineRef.current) return;
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const minuteWidth = timelineRect.width / (24 * 60); // width per minute
    const relativeX = e.clientX - timelineRect.left;
    
    // Constrain to timeline boundaries
    const constrainedX = Math.max(0, Math.min(timelineRect.width, relativeX));
    
    // Convert to minutes and round to nearest 15-minute increment
    const minutePosition = Math.round(constrainedX / minuteWidth / 15) * 15;
    const constrainedMinutePosition = Math.max(0, Math.min(24 * 60, minutePosition));
    
    let newStartTime = draggedBanner.scheduleStartMinutes;
    let newEndTime = draggedBanner.scheduleEndMinutes;
    
    if (dragType === 'start') {
      // Don't allow start to go beyond end - 15 minutes (minimum duration)
      newStartTime = Math.min(constrainedMinutePosition, draggedBanner.scheduleEndMinutes - 15);
      newEndTime = draggedBanner.scheduleEndMinutes;
    } else if (dragType === 'end') {
      // Don't allow end to go before start + 15 minutes (minimum duration) or beyond 24 hours
      newStartTime = draggedBanner.scheduleStartMinutes;
      newEndTime = Math.max(constrainedMinutePosition, draggedBanner.scheduleStartMinutes + 15);
      newEndTime = Math.min(newEndTime, 24 * 60); // Constrain to 24 hours unless extending past midnight
    } else if (dragType === 'move') {
      // Move the entire banner while maintaining its duration
      const duration = draggedBanner.scheduleEndMinutes - draggedBanner.scheduleStartMinutes;
      
      // Ensure the banner stays within the timeline
      newStartTime = Math.min(Math.max(0, constrainedMinutePosition), 24 * 60 - duration);
      newEndTime = newStartTime + duration;
      
      // Double-check that end time doesn't exceed 24 hours
      if (newEndTime > 24 * 60) {
        newEndTime = 24 * 60;
        newStartTime = newEndTime - duration;
      }
    }
    
    // Check for conflicts with the proposed new times
    const hasConflict = checkForConflicts(draggedBanner.id, newStartTime, newEndTime);
    
    // Always update the dragged times for visual feedback, even if there's a conflict
    setDraggedStartTime(newStartTime);
    setDraggedEndTime(newEndTime);
    
    // Update the banner element directly for smoother dragging
    const bannerElement = document.getElementById(`banner-${draggedBanner.id}`);
    if (bannerElement) {
      const startPercent = (newStartTime / (24 * 60)) * 100;
      const widthPercent = ((newEndTime - newStartTime) / (24 * 60)) * 100;
      
      bannerElement.style.left = `${startPercent}%`;
      bannerElement.style.width = `${widthPercent}%`;
    }
  };

  // Update handleMouseUp to prevent saving if there's a conflict
  const handleMouseUp = async () => {
    if (!isDragging || !draggedBanner) return;
    
    try {
      const updates: any = {};
      
      if (draggedStartTime !== null && draggedEndTime !== null) {
        // Final check for conflicts before saving
        const hasConflict = checkForConflicts(draggedBanner.id, draggedStartTime, draggedEndTime);
        
        if (hasConflict) {
          // Show error toast about the conflict
          toast({
            title: "Schedule Conflict",
            description: `This time slot conflicts with "${scheduleConflict.conflictingBanner?.title}". Please choose a different time.`,
            variant: "destructive"
          });
          
          // Reset to original values
          setDraggedStartTime(draggedBanner.scheduleStartMinutes);
          setDraggedEndTime(draggedBanner.scheduleEndMinutes);
        } else {
          // No conflict, proceed with update
          
          // Update minute-based scheduling fields
          updates.scheduleStartMinutes = draggedStartTime;
          updates.scheduleEndMinutes = draggedEndTime;
          updates.scheduleStartHour = Math.floor(draggedStartTime / 60);
          updates.scheduleEndHour = Math.ceil(draggedEndTime / 60);
          
          // Create timestamp objects for startTime and endTime
          // First, get the current date
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const day = now.getDate();
          
          // Create Date objects for start and end times
          const startTimeDate = new Date(year, month, day, 
            Math.floor(draggedStartTime / 60), 
            draggedStartTime % 60);
          
          const endTimeDate = new Date(year, month, day, 
            Math.floor(draggedEndTime / 60), 
            draggedEndTime % 60);
          
          // If end time is earlier in the day than start time, it means it's for the next day
          if (endTimeDate < startTimeDate) {
            endTimeDate.setDate(endTimeDate.getDate() + 1);
          }
          
          // Add the timestamp fields to the updates
          updates.startTime = startTimeDate;
          updates.endTime = endTimeDate;
          
          await onBannerUpdate(draggedBanner.id, updates);
          
          // Update local state
          setScheduledBanners(prev => 
            prev.map(banner => 
              banner.id === draggedBanner.id 
                ? { 
                    ...banner, 
                    scheduleStartMinutes: draggedStartTime,
                    scheduleEndMinutes: draggedEndTime,
                    duration: draggedEndTime - draggedStartTime,
                    startTime: startTimeDate,
                    endTime: endTimeDate
                  } 
                : banner
            )
          );
          
          toast({
            title: "Banner schedule updated",
            description: `${draggedBanner.title} will now show from ${formatTime(draggedStartTime)} to ${formatTime(draggedEndTime)}`
          });
        }
      }
    } catch (error) {
      console.error("Error updating banner schedule:", error);
      toast({
        title: "Error",
        description: "Failed to update banner schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Reset drag state
      setIsDragging(false);
      setDraggedBanner(null);
      setDraggedStartTime(null);
      setDraggedEndTime(null);
      setDragType(null);
      setScheduleConflict({
        hasConflict: false,
        conflictingBanner: undefined,
        conflictType: null
      });
    }
  };

  // Format time for display (12-hour format with AM/PM and minutes)
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    const period = hours < 12 ? 'AM' : 'PM'
    const displayHours = hours === 0 || hours === 12 ? 12 : hours % 12
    
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`
  }

  // Handle horizontal scrolling
  const handleScroll = () => {
    if (!scrollContainerRef.current || !timelineRef.current) return
    
    const scrollLeft = scrollContainerRef.current.scrollLeft
    const containerWidth = scrollContainerRef.current.clientWidth
    const totalWidth = timelineRef.current.scrollWidth
    
    // Calculate which 5-hour window we're viewing based on scroll position
    const scrollPercentage = scrollLeft / (totalWidth - containerWidth)
    const newViewportStart = Math.round(scrollPercentage * (24 * 60 - viewportDuration))
    
    if (Math.abs(newViewportStart - viewportStart) > 15) { // Only update if changed significantly
      setViewportStart(newViewportStart)
    }
  }

  // Convert time string (HH:MM) to minutes
  const timeStringToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }

  // Convert minutes to time string (HH:MM)
  const minutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Handle manual time editing
  const handleEditBanner = (banner: any) => {
    setEditingBanner(banner)
    setEditStartTime(minutesToTimeString(banner.scheduleStartMinutes))
    setEditEndTime(minutesToTimeString(banner.scheduleEndMinutes))
    setShowEditDialog(true)
  }

  // Save manual time edits
  const saveTimeEdit = async () => {
    if (!editingBanner) return

    const startMinutes = timeStringToMinutes(editStartTime)
    const endMinutes = timeStringToMinutes(editEndTime)

    // Validation
    if (startMinutes >= endMinutes) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time.",
        variant: "destructive"
      })
      return
    }

    if (endMinutes - startMinutes < 15) {
      toast({
        title: "Duration Too Short",
        description: "Minimum duration is 15 minutes.",
        variant: "destructive"
      })
      return
    }

    // Check for conflicts
    const hasConflict = checkForConflicts(editingBanner.id, startMinutes, endMinutes)
    if (hasConflict) {
      toast({
        title: "Schedule Conflict",
        description: `This time slot conflicts with "${scheduleConflict.conflictingBanner?.title}".`,
        variant: "destructive"
      })
      return
    }

    try {
      await onBannerUpdate(editingBanner.id, {
        scheduleStartMinutes: startMinutes,
        scheduleEndMinutes: endMinutes,
        scheduleStartHour: Math.floor(startMinutes / 60),
        scheduleEndHour: Math.ceil(endMinutes / 60)
      })

      setScheduledBanners(prev => 
        prev.map(banner => 
          banner.id === editingBanner.id 
            ? { 
                ...banner, 
                scheduleStartMinutes: startMinutes,
                scheduleEndMinutes: endMinutes,
                duration: endMinutes - startMinutes
              } 
            : banner
        )
      )

      toast({
        title: "Schedule Updated",
        description: `${editingBanner.title} schedule updated successfully.`
      })

      setShowEditDialog(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Start dragging a banner
  const startDrag = (banner: any, type: 'start' | 'end' | 'move') => {
    setIsDragging(true)
    setDraggedBanner(banner)
    setDragType(type)
    
    if (type === 'start') {
      setDraggedStartTime(banner.scheduleStartMinutes)
    } else if (type === 'end') {
      setDraggedEndTime(banner.scheduleEndMinutes)
    } else if (type === 'move') {
      setDraggedStartTime(banner.scheduleStartMinutes)
      setDraggedEndTime(banner.scheduleEndMinutes)
    }
  }

  // Calculate position and width for a banner on the timeline
  const getBannerStyle = (banner: any) => {
    const isBeingDragged = isDragging && draggedBanner?.id === banner.id;
    
    let startMinutes = banner.scheduleStartMinutes;
    let endMinutes = banner.scheduleEndMinutes;
    
    if (isBeingDragged && draggedStartTime !== null && draggedEndTime !== null) {
      startMinutes = draggedStartTime;
      endMinutes = draggedEndTime;
    }
    
    // Calculate position and width as percentages of the full 24-hour timeline
    const left = `${(startMinutes / (24 * 60)) * 100}%`;
    const width = `${((endMinutes - startMinutes) / (24 * 60)) * 100}%`;
    
    return { left, width };
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Banner Schedule</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Current time: {formatTime(new Date().getMinutes() + new Date().getHours() * 60)}</span>
          </Badge>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">How to use the scheduler</h4>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Scroll horizontally</strong> to view different times</li>
                  <li>• Drag the <span className="text-blue-500">left edge</span> to change start time</li>
                  <li>• Drag the <span className="text-blue-500">right edge</span> to change end time</li>
                  <li>• Drag the <span className="text-blue-500">middle</span> to move the entire schedule</li>
                  <li>• Click the <strong>⋮ button</strong> to edit times manually</li>
                  <li>• <strong>Precision:</strong> Times snap to 15-minute increments</li>
                  <li>• <strong>Minimum duration:</strong> 15 minutes</li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Scrollable Timeline Container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden border rounded-md"
        onScroll={handleScroll}
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}
      >
        {/* Timeline with fixed width (each hour = 300px) */}
        <div style={{ width: `${24 * 300}px` }}>
          {/* Timeline header with minute markers */}
          <div className="border-b">
            {/* Hour labels */}
            <div className="flex">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div 
                  key={hour} 
                  className={`text-xs text-center pb-1 ${hour === currentHour ? 'font-bold text-blue-600' : ''}`}
                  style={{ width: '300px' }}
                >
                  {hour === 0 || hour === 12 ? (hour === 0 ? '12 AM' : '12 PM') : (hour < 12 ? `${hour} AM` : `${hour-12} PM`)}
                </div>
              ))}
            </div>
            
            {/* 15-minute subdivision markers */}
            <div className="flex h-4 border-t border-gray-100">
              {Array.from({ length: 24 * 4 }).map((_, index) => {
                const minutes = index * 15;
                const minuteOfHour = minutes % 60;
                const showLabel = minuteOfHour === 15 || minuteOfHour === 30 || minuteOfHour === 45;
                
                return (
                  <div 
                    key={index} 
                    className={`border-r ${showLabel ? 'border-gray-200' : 'border-gray-100'}`}
                    style={{ width: '75px' }}
                  >
                    {showLabel && (
                      <div className="text-[9px] text-gray-400 text-center leading-none">
                        :{minuteOfHour.toString().padStart(2, '0')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
      
          {/* Timeline grid */}
          <div 
            ref={timelineRef}
            className="relative h-[300px] border-t border-gray-100"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Vertical time lines - 15-minute subdivisions */}
            <div className="absolute inset-0 flex pointer-events-none">
              {Array.from({ length: 24 * 4 }).map((_, index) => {
                const minutes = index * 15;
                const hour = Math.floor(minutes / 60);
                const isHourMark = minutes % 60 === 0;
                const isQuarterHour = minutes % 60 === 15 || minutes % 60 === 30 || minutes % 60 === 45;
                
                return (
                  <div 
                    key={index} 
                    className={`${
                      isHourMark 
                        ? `border-r border-gray-200 ${hour === currentHour ? 'bg-blue-50' : ''}` 
                        : 'border-r border-gray-100'
                    }`}
                    style={{ width: '75px' }}
                  />
                );
              })}
            </div>
        
            {/* Current time indicator */}
            {(() => {
              const currentTimeMinutes = currentHour * 60 + currentMinute
              const pixelPosition = (currentTimeMinutes / 15) * 75 // 75px per 15-minute slot
              
              return (
                <>
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                    style={{ 
                      left: `${pixelPosition}px`,
                      boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
                    }}
                  />
                  <div 
                    className="absolute top-0 h-4 w-4 rounded-full bg-blue-500 z-10 animate-pulse"
                    style={{ 
                      left: `${pixelPosition - 8}px`,
                      marginTop: '-8px'
                    }}
                  />
                </>
              )
            })()}
        
            {/* Scheduled banners */}
            <div className="absolute inset-0 p-2">
              {scheduledBanners.map((banner, index) => {
                const isBeingDragged = isDragging && draggedBanner?.id === banner.id
                
                // Calculate pixel positions based on 75px per 15-minute slot
                let startMinutes = banner.scheduleStartMinutes;
                let endMinutes = banner.scheduleEndMinutes;
                
                if (isBeingDragged && draggedStartTime !== null && draggedEndTime !== null) {
                  startMinutes = draggedStartTime;
                  endMinutes = draggedEndTime;
                }
                
                const leftPixels = (startMinutes / 15) * 75;
                const widthPixels = ((endMinutes - startMinutes) / 15) * 75;
                
                // Check if banner ends at midnight (or very close to it)
                const endsAtMidnight = Math.abs(banner.scheduleEndMinutes - 24 * 60) < 15;
            
            return (
              <div 
                key={banner.id}
                id={`banner-${banner.id}`}
                className={`absolute h-[60px] rounded-md overflow-hidden shadow-sm ${
                  isBeingDragged ? 'ring-2 ring-blue-500 z-20 shadow-md' : 'hover:shadow-md'
                } ${banner.isActive 
                    ? 'border border-green-300 bg-gradient-to-r from-green-50 to-green-100' 
                    : 'border border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100'}`}
                style={{
                  left: `${leftPixels}px`,
                  width: `${widthPixels}px`,
                  minWidth: '75px', // Minimum 15-minute slot
                  top: `${index * 80 + 10}px`,
                  cursor: isBeingDragged ? (dragType === 'move' ? 'grabbing' : 'col-resize') : 'grab',
                  transition: isBeingDragged ? 'none' : 'all 0.2s ease'
                }}
              >
                {/* Banner content */}
                <div 
                  className="h-full flex items-center px-2"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    startDrag(banner, 'move')
                  }}
                >
                  {/* Status indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${banner.isActive ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  
                  {/* Banner info */}
                  <div className="ml-2 flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-xs font-medium truncate">{banner.title}</p>
                        {banner.isActive && (
                          <span className="ml-1.5 flex items-center text-[9px] text-green-700 bg-green-100 px-1 py-0.5 rounded-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-0.5 animate-pulse"></span>
                            Live
                          </span>
                        )}
                      </div>
                      
                      {/* Edit Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-white/80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => handleEditBanner(banner)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Schedule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Time display */}
                    <div className="flex items-center text-[10px] text-gray-600 mt-1">
                      <Clock className="h-2.5 w-2.5 mr-1 text-gray-500" />
                      <span>{formatTime(banner.scheduleStartMinutes)}</span>
                      <span className="mx-1">-</span>
                      <span>{formatTime(banner.scheduleEndMinutes)}</span>
                      
                      {/* Show next day indicator if applicable */}
                      {banner.endsNextDay && (
                        <span className="ml-1 text-[8px] bg-blue-100 text-blue-700 px-1 rounded-sm">+1</span>
                      )}
                    </div>
                    
                    {/* Extend past midnight button */}
                    {endsAtMidnight && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button 
                            className="text-[9px] mt-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm hover:bg-blue-100 flex items-center w-fit"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Clock className="h-2 w-2 mr-1" />
                            Extend past midnight
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs font-medium mb-2">Extend until:</p>
                          <div className="grid grid-cols-2 gap-1">
                            {[1, 2, 3, 4, 5, 6].map(hour => (
                              <Button
                                key={hour}
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  // Extend the banner to the selected hour past midnight
                                  const newEndMinutes = hour * 60; // Convert hours to minutes
                                  onBannerUpdate(banner.id, {
                                    scheduleEndMinutes: newEndMinutes,
                                    scheduleEndHour: hour,
                                    extendedOverMidnight: true
                                  });
                                }}
                              >
                                {hour}:00 AM
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
                
                {/* Drag handles with improved styling */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 hover:opacity-70"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    startDrag(banner, 'start')
                  }}
                >
                  <div className="absolute left-0.5 top-1/2 -translate-y-1/2 h-8 w-0.5 bg-gray-400"></div>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 hover:opacity-70"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    startDrag(banner, 'end')
                  }}
                >
                  <div className="absolute right-0.5 top-1/2 -translate-y-1/2 h-8 w-0.5 bg-gray-400"></div>
                </div>
                
                {/* Time indicator during drag */}
                {isBeingDragged && (
                  <div className="absolute -top-6 left-0 right-0 text-center">
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-t-md shadow-md">
                      {dragType === 'start' ? formatTime(draggedStartTime || banner.scheduleStartMinutes) : 
                       dragType === 'end' ? formatTime(draggedEndTime || banner.scheduleEndMinutes) :
                       `${formatTime(draggedStartTime || banner.scheduleStartMinutes)} - ${formatTime(draggedEndTime || banner.scheduleEndMinutes)}`}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add conflict warning if needed */}
      {scheduleConflict.hasConflict && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mt-4 flex items-center">
          <div className="mr-2 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Schedule Conflict</p>
            <p className="text-sm">
              This time overlaps with "{scheduleConflict.conflictingBanner?.title}"
            </p>
          </div>
        </div>
      )}

      {/* Manual Time Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Banner Schedule</DialogTitle>
            <DialogDescription>
              Set precise start and end times for "{editingBanner?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-gray-600">
              Duration: {editStartTime && editEndTime ? 
                `${Math.max(0, timeStringToMinutes(editEndTime) - timeStringToMinutes(editStartTime))} minutes` : 
                '0 minutes'
              }
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveTimeEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 