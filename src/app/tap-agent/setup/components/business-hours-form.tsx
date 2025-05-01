"use client"

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

interface BusinessHours {
  monday: { open: boolean; start: string; end: string }
  tuesday: { open: boolean; start: string; end: string }
  wednesday: { open: boolean; start: string; end: string }
  thursday: { open: boolean; start: string; end: string }
  friday: { open: boolean; start: string; end: string }
  saturday: { open: boolean; start: string; end: string }
  sunday: { open: boolean; start: string; end: string }
}

interface BusinessHoursFormProps {
  data: BusinessHours
  onChange: (data: BusinessHours) => void
}

export function BusinessHoursForm({ data, onChange }: BusinessHoursFormProps) {
  
  const handleToggleDay = (day: DayOfWeek) => {
    onChange({
      ...data,
      [day]: {
        ...data[day],
        open: !data[day].open
      }
    })
  }
  
  const handleTimeChange = (day: DayOfWeek, field: 'start' | 'end', value: string) => {
    onChange({
      ...data,
      [day]: {
        ...data[day],
        [field]: value
      }
    })
  }
  
  const daysOfWeek: DayOfWeek[] = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ]
  
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0">
        <CardTitle className="text-xl">Business Hours</CardTitle>
        <CardDescription>
          Set your business operating hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        <div className="space-y-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`${day}-switch`} className="font-medium capitalize">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Label>
                <Switch
                  id={`${day}-switch`}
                  checked={data[day].open}
                  onCheckedChange={() => handleToggleDay(day)}
                />
              </div>
              
              {data[day].open && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor={`${day}-start`} className="text-sm">
                      Open
                    </Label>
                    <Input
                      id={`${day}-start`}
                      type="time"
                      value={data[day].start}
                      onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${day}-end`} className="text-sm">
                      Close
                    </Label>
                    <Input
                      id={`${day}-end`}
                      type="time"
                      value={data[day].end}
                      onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 