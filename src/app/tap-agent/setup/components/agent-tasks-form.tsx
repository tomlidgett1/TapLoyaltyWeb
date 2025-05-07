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

export function AgentTasksForm({ data, onChange }: AgentTasksFormProps) {
  
  const handleSwitchChange = (task: keyof AgentTasks) => {
    onChange({
      ...data,
      [task]: !data[task]
    })
  }
  
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Agent Tasks</CardTitle>
        <CardDescription>
          Enable or disable specific tasks for your Tap Agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-0 mt-4">
        <div className="space-y-6">
          {(Object.keys(data) as Array<keyof AgentTasks>).filter(task => 
            // Only show tasks that are in our current schema
            Object.keys(taskDescriptions).includes(task)
          ).map((task) => (
            <div key={task} className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={task} className="font-medium capitalize">
                  {task.replace(/([A-Z])/g, ' $1').trim()}
                </Label>
                <Switch
                  id={task}
                  checked={data[task]}
                  onCheckedChange={() => handleSwitchChange(task)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {taskDescriptions[task]}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 