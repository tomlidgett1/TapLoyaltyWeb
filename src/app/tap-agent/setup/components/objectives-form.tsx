"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { PlusCircle, X, Trash2 } from "lucide-react"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

interface BusinessObjective {
  id: string
  label: string
  priority: number
}

interface CustomerValuePriorities {
  personalization: number
  valueForMoney: number
  convenience: number
  quality: number
  exclusivity: number
  novelty: number
}

interface SeasonalCampaign {
  name: string
  objective: string
  startDate: string
  endDate: string
}

interface Objectives {
  businessObjectives: BusinessObjective[]
  customerValuePriorities: CustomerValuePriorities
  seasonalCampaigns: SeasonalCampaign[]
}

interface ObjectivesFormProps {
  data: Objectives
  onChange: (data: Objectives) => void
}

const objectiveTemplates = [
  { id: "increase_revenue", label: "Increase overall revenue" },
  { id: "customer_retention", label: "Improve customer retention" },
  { id: "new_customers", label: "Attract new customers" },
  { id: "basket_size", label: "Increase average basket size" },
  { id: "visit_frequency", label: "Increase visit frequency" },
  { id: "promote_product", label: "Promote specific products" }
]

const campaignTemplates = [
  { name: "Summer", objective: "Increase seasonal product sales" },
  { name: "Back to School", objective: "Target families with students" },
  { name: "Holiday Season", objective: "Maximize holiday spending" },
  { name: "Black Friday", objective: "Drive high volume sales" },
  { name: "New Year", objective: "Encourage new year resolutions" }
]

export function ObjectivesForm({ data, onChange }: ObjectivesFormProps) {
  const [newObjective, setNewObjective] = useState("")
  const [objectivePriority, setObjectivePriority] = useState(5)
  const [templateObjective, setTemplateObjective] = useState("")
  
  // For seasonal campaigns
  const [campaignName, setCampaignName] = useState("")
  const [campaignObjective, setCampaignObjective] = useState("")
  const [campaignStartDate, setCampaignStartDate] = useState("")
  const [campaignEndDate, setCampaignEndDate] = useState("")
  const [templateCampaign, setTemplateCampaign] = useState("")
  
  const handleValuePriorityChange = (key: keyof CustomerValuePriorities, value: number[]) => {
    onChange({
      ...data,
      customerValuePriorities: {
        ...data.customerValuePriorities,
        [key]: value[0]
      }
    })
  }
  
  const handleAddObjective = () => {
    if (!newObjective) return
    
    const id = newObjective
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      
    const newBusinessObjectives = [
      ...data.businessObjectives,
      {
        id,
        label: newObjective,
        priority: objectivePriority
      }
    ]
    
    onChange({
      ...data,
      businessObjectives: newBusinessObjectives
    })
    
    setNewObjective("")
    setObjectivePriority(5)
  }
  
  const handleObjectivePriorityChange = (index: number, value: number[]) => {
    const newBusinessObjectives = [...data.businessObjectives]
    newBusinessObjectives[index] = {
      ...newBusinessObjectives[index],
      priority: value[0]
    }
    
    onChange({
      ...data,
      businessObjectives: newBusinessObjectives
    })
  }
  
  const handleRemoveObjective = (index: number) => {
    const newBusinessObjectives = [...data.businessObjectives]
    newBusinessObjectives.splice(index, 1)
    
    onChange({
      ...data,
      businessObjectives: newBusinessObjectives
    })
  }
  
  const handleAddTemplateObjective = (templateId: string) => {
    if (!templateId) return
    
    const template = objectiveTemplates.find(t => t.id === templateId)
    if (!template) return
    
    const newBusinessObjectives = [
      ...data.businessObjectives,
      {
        id: template.id,
        label: template.label,
        priority: 8
      }
    ]
    
    onChange({
      ...data,
      businessObjectives: newBusinessObjectives
    })
    
    setTemplateObjective("")
  }
  
  const handleAddCampaign = () => {
    if (!campaignName || !campaignStartDate || !campaignEndDate) return
    
    const newCampaigns = [
      ...data.seasonalCampaigns,
      {
        name: campaignName,
        objective: campaignObjective,
        startDate: campaignStartDate,
        endDate: campaignEndDate
      }
    ]
    
    onChange({
      ...data,
      seasonalCampaigns: newCampaigns
    })
    
    setCampaignName("")
    setCampaignObjective("")
    setCampaignStartDate("")
    setCampaignEndDate("")
  }
  
  const handleRemoveCampaign = (index: number) => {
    const newCampaigns = [...data.seasonalCampaigns]
    newCampaigns.splice(index, 1)
    
    onChange({
      ...data,
      seasonalCampaigns: newCampaigns
    })
  }
  
  const handleAddTemplateCampaign = (templateName: string) => {
    if (!templateName) return
    
    const template = campaignTemplates.find(t => t.name === templateName)
    if (!template) return
    
    // Set today as start date and 30 days from now as end date
    const today = new Date()
    const endDate = new Date()
    endDate.setDate(today.getDate() + 90)
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]
    }
    
    const newCampaigns = [
      ...data.seasonalCampaigns,
      {
        name: template.name,
        objective: template.objective,
        startDate: formatDate(today),
        endDate: formatDate(endDate)
      }
    ]
    
    onChange({
      ...data,
      seasonalCampaigns: newCampaigns
    })
    
    setTemplateCampaign("")
  }
  
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Objectives</CardTitle>
        <CardDescription>
          Define your business objectives and customer value priorities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-0 mt-6">
        {/* Business Objectives */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Business Objectives</h3>
            <p className="text-sm text-muted-foreground">
              What are your primary business goals? Set priorities on a scale of 1-10.
            </p>
          </div>
          
          <div className="space-y-4">
            {data.businessObjectives.map((objective, index) => (
              <div key={objective.id} className="space-y-2 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{objective.label}</Label>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveObjective(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-24 text-sm">Priority: {objective.priority}</Label>
                  <Slider
                    value={[objective.priority]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(value) => handleObjectivePriorityChange(index, value)}
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select value={templateObjective} onValueChange={handleAddTemplateObjective}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add from template..." />
                </SelectTrigger>
                <SelectContent>
                  {objectiveTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Input 
                placeholder="Add custom objective..." 
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
              />
              <div className="flex items-center gap-2 w-48">
                <Label className="text-sm whitespace-nowrap">Priority: {objectivePriority}</Label>
                <Slider
                  value={[objectivePriority]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setObjectivePriority(value[0])}
                />
              </div>
              <Button onClick={handleAddObjective} disabled={!newObjective}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>
        
        {/* Customer Value Priorities */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Customer Value Priorities</h3>
            <p className="text-sm text-muted-foreground">
              What values are most important to your customers? Adjust the sliders to set priorities.
            </p>
          </div>
          
          <div className="space-y-4">
            {(Object.entries(data.customerValuePriorities) as [keyof CustomerValuePriorities, number][]).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  <span className="text-sm font-medium">{value}</span>
                </div>
                <Slider
                  value={[value]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(newValue) => handleValuePriorityChange(key, newValue)}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Seasonal Campaigns */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Seasonal Campaigns</h3>
            <p className="text-sm text-muted-foreground">
              Plan your seasonal marketing campaigns.
            </p>
          </div>
          
          <div className="space-y-4">
            {data.seasonalCampaigns.map((campaign, index) => (
              <div key={index} className="space-y-2 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{campaign.name}</Label>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveCampaign(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm">{campaign.objective}</p>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start:</span> {campaign.startDate}
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span> {campaign.endDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select value={templateCampaign} onValueChange={handleAddTemplateCampaign}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add from template..." />
                </SelectTrigger>
                <SelectContent>
                  {campaignTemplates.map(template => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input 
                placeholder="Campaign Name" 
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
              <Input 
                placeholder="Campaign Objective" 
                value={campaignObjective}
                onChange={(e) => setCampaignObjective(e.target.value)}
              />
              <div className="flex gap-2 items-center">
                <Label className="whitespace-nowrap w-12">Start:</Label>
                <Input 
                  type="date" 
                  value={campaignStartDate}
                  onChange={(e) => setCampaignStartDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-center">
                <Label className="whitespace-nowrap w-12">End:</Label>
                <Input 
                  type="date" 
                  value={campaignEndDate}
                  onChange={(e) => setCampaignEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              onClick={handleAddCampaign} 
              disabled={!campaignName || !campaignStartDate || !campaignEndDate}
              className="w-full mt-2"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Campaign
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 