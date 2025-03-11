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
import { Clock, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

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

  // Process banners to include scheduling information
  useEffect(() => {
    if (!banners) return
    
    const processed = banners
      .filter(banner => banner.isActive)
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

  // Modify the checkForConflicts function
  const checkForConflicts = (bannerId: string, startMinutes: number, endMinutes: number): boolean => {
    // Find any banner (except the current one) that overlaps with the proposed time range
    const conflictingBanner = scheduledBanners.find(banner => 
      banner.id !== bannerId && 
      (startMinutes < banner.scheduleEndMinutes && endMinutes > banner.scheduleStartMinutes) // Only check for overlap
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
    
    // Convert to minutes and round to nearest 15-minute increment
    const minutePosition = Math.max(0, Math.min(24 * 60 - 15, Math.round(relativeX / minuteWidth / 15) * 15));
    
    let newStartTime = draggedBanner.scheduleStartMinutes;
    let newEndTime = draggedBanner.scheduleEndMinutes;
    
    if (dragType === 'start') {
      // Don't allow start to go beyond end - 15 minutes
      newStartTime = Math.min(minutePosition, draggedBanner.scheduleEndMinutes - 15);
      newEndTime = draggedBanner.scheduleEndMinutes;
    } else if (dragType === 'end') {
      // Don't allow end to go before start + 15 minutes
      newStartTime = draggedBanner.scheduleStartMinutes;
      newEndTime = Math.max(minutePosition + 15, draggedBanner.scheduleStartMinutes + 15);
    } else if (dragType === 'move') {
      // Move the entire banner while maintaining its duration
      const duration = draggedBanner.scheduleEndMinutes - draggedBanner.scheduleStartMinutes;
      newStartTime = Math.min(minutePosition, 24 * 60 - duration);
      newEndTime = newStartTime + duration;
    }
    
    // Check for conflicts with the proposed new times
    const hasConflict = checkForConflicts(draggedBanner.id, newStartTime, newEndTime);
    
    // Only update the times if there's no conflict
    if (!hasConflict) {
      setDraggedStartTime(newStartTime);
      setDraggedEndTime(newEndTime);
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
    const startMinutes = draggedBanner?.id === banner.id && draggedStartTime !== null 
      ? draggedStartTime 
      : banner.scheduleStartMinutes
    
    const endMinutes = draggedBanner?.id === banner.id && draggedEndTime !== null 
      ? draggedEndTime 
      : banner.scheduleEndMinutes
    
    const left = `${(startMinutes / (24 * 60)) * 100}%`
    const width = `${((endMinutes - startMinutes) / (24 * 60)) * 100}%`
    
    return { left, width }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
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
                  <li>• Drag the <span className="text-blue-500">left edge</span> to change start time</li>
                  <li>• Drag the <span className="text-blue-500">right edge</span> to change end time</li>
                  <li>• Drag the <span className="text-blue-500">middle</span> to move the entire schedule</li>
                  <li>• Click a banner to see details</li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Timeline header */}
      <div className="flex border-b mb-2">
        {Array.from({ length: 24 }).map((_, hour) => (
          <div 
            key={hour} 
            className={`flex-1 text-xs text-center pb-1 ${hour === currentHour ? 'font-bold text-blue-600' : ''}`}
          >
            {hour === 0 || hour === 12 ? (hour === 0 ? '12 AM' : '12 PM') : (hour < 12 ? `${hour} AM` : `${hour-12} PM`)}
          </div>
        ))}
      </div>
      
      {/* Timeline grid */}
      <div 
        ref={timelineRef}
        className="relative h-[300px] border-b border-t border-gray-100 mb-4"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Vertical hour lines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {Array.from({ length: 24 }).map((_, hour) => (
            <div 
              key={hour} 
              className={`flex-1 border-r border-gray-100 ${hour === currentHour ? 'bg-blue-50' : ''}`}
            />
          ))}
        </div>
        
        {/* Current time indicator */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
          style={{ 
            left: `${((currentHour * 60 + currentMinute) / (24 * 60)) * 100}%`,
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
          }}
        />
        
        {/* Current time pulsing effect */}
        <div 
          className="absolute top-0 h-4 w-4 rounded-full bg-blue-500 z-10 animate-pulse"
          style={{ 
            left: `calc(${((currentHour * 60 + currentMinute) / (24 * 60)) * 100}% - 8px)`,
            marginTop: '-8px'
          }}
        />
        
        {/* Scheduled banners */}
        <div className="absolute inset-0 p-2">
          {scheduledBanners.map((banner, index) => {
            const { left, width } = getBannerStyle(banner)
            const isBeingDragged = isDragging && draggedBanner?.id === banner.id
            
            return (
              <div 
                key={banner.id}
                className={`absolute h-[70px] rounded-md overflow-hidden border shadow-sm transition-all ${
                  isBeingDragged ? 'ring-2 ring-blue-500 z-20 shadow-md' : 'hover:ring-1 hover:ring-blue-300 hover:shadow-md'
                }`}
                style={{ 
                  left, 
                  width, 
                  top: `${index * 80 + 10}px`,
                  cursor: isBeingDragged ? (dragType === 'move' ? 'grabbing' : 'col-resize') : 'grab',
                  background: 'white',
                  transition: isBeingDragged ? 'none' : 'all 0.2s ease'
                }}
              >
                {/* Banner content */}
                <div 
                  className="h-full flex items-center justify-between px-2 bg-white"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    startDrag(banner, 'move')
                  }}
                >
                  <div className="w-[60px] h-[50px] flex-shrink-0 overflow-hidden rounded-sm">
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
                  <div className="ml-2 flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{banner.title}</p>
                    <div className="flex items-center text-[10px] text-gray-500 mt-1">
                      <span>{formatTime(banner.scheduleStartMinutes)}</span>
                      <span className="mx-1">-</span>
                      <span>{formatTime(banner.scheduleEndMinutes)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Drag handles */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize bg-transparent hover:bg-blue-200 opacity-50"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    startDrag(banner, 'start')
                  }}
                />
                <div 
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-transparent hover:bg-blue-200 opacity-50"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    startDrag(banner, 'end')
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Time navigation */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCurrentHour(prev => (prev - 1 + 24) % 24)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous Hour
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCurrentHour(new Date().getHours())}
        >
          Current Time
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCurrentHour(prev => (prev + 1) % 24)}
        >
          Next Hour
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
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
    </div>
  )
} 