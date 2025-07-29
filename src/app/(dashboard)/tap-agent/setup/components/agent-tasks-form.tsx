"use client"

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bot, Gift, ArrowLeftRight, Image, Mail, BarChart2, MessageSquare, Info } from "lucide-react"

interface AgentTasks {
  rewardsGeneration: boolean
  reEngagement: boolean
  bannerCreation: boolean
  customerMessaging: boolean
  emailMarketing: boolean
  performanceAnalysis: boolean
}

interface AgentTasksFormProps {
  data: AgentTasks
  onChange: (data: AgentTasks) => void
}

const taskDescriptions = {
  rewardsGeneration: "Automatically generate targeted rewards for customers based on their behavior and preferences.",
  reEngagement: "Create campaigns to re-engage dormant or churned customers.",
  bannerCreation: "Design promotional banners for your store's app and website.",
  customerMessaging: "Send personalized messages to customers via Push Notification or in-app message depending on the user's settings.",
  emailMarketing: "Send personalized email campaigns to customers.",
  performanceAnalysis: "Analyze performance of rewards and marketing campaigns and provide insights."
}

const taskIcons = {
  rewardsGeneration: <Gift className="h-4 w-4 text-blue-600" />,
  reEngagement: <ArrowLeftRight className="h-4 w-4 text-blue-600" />,
  bannerCreation: <Image className="h-4 w-4 text-blue-600" />,
  customerMessaging: <MessageSquare className="h-4 w-4 text-blue-600" />,
  emailMarketing: <Mail className="h-4 w-4 text-blue-600" />,
  performanceAnalysis: <BarChart2 className="h-4 w-4 text-blue-600" />
}

export function AgentTasksForm({ data, onChange }: AgentTasksFormProps) {
  
  const handleSwitchChange = (task: keyof AgentTasks) => {
    onChange({
      ...data,
      [task]: !data[task]
    })
  }
  
  return (
    <div className="space-y-6">
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <Bot className="h-4 w-4 text-blue-600 mr-2" />
          Agent Tasks
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Enable or disable specific tasks for your Tap Agent to perform automatically.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100 flex gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800 font-medium">Task Automation</p>
            <p className="text-xs text-blue-700 mt-1">
              These settings determine which tasks your Tap Agent will handle automatically. You can enable or disable tasks at any time.
            </p>
          </div>
        </div>
        
        <div className="space-y-4 mt-2">
          {(Object.keys(data) as Array<keyof AgentTasks>).filter(task => 
            // Only show tasks that are in our current schema
            Object.keys(taskDescriptions).includes(task)
          ).map((task) => (
            <div 
              key={task} 
              className={`flex items-center justify-between p-3 rounded-md border ${data[task] ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {taskIcons[task] || <Bot className="h-4 w-4 text-blue-600" />}
                </div>
                <div>
                  <Label htmlFor={task} className="font-medium capitalize">
                    {task.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {taskDescriptions[task]}
                  </p>
                </div>
              </div>
              <Switch
                id={task}
                checked={data[task]}
                onCheckedChange={() => handleSwitchChange(task)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 