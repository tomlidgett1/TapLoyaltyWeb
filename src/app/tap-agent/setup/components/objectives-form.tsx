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
import { PlusCircle, X, Trash2, Target, Calendar, Heart, Zap, DollarSign, Users, ShoppingBag, Award, Crown, Sparkles } from "lucide-react"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

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
  { id: "increase_revenue", label: "Increase overall revenue", icon: <DollarSign className="h-4 w-4" /> },
  { id: "customer_retention", label: "Improve customer retention", icon: <Users className="h-4 w-4" /> },
  { id: "new_customers", label: "Attract new customers", icon: <Users className="h-4 w-4" /> },
  { id: "basket_size", label: "Increase average basket size", icon: <ShoppingBag className="h-4 w-4" /> },
  { id: "visit_frequency", label: "Increase visit frequency", icon: <Zap className="h-4 w-4" /> },
  { id: "promote_product", label: "Promote specific products", icon: <Award className="h-4 w-4" /> }
]

const campaignTemplates = [
  { name: "Summer", objective: "Increase seasonal product sales" },
  { name: "Back to School", objective: "Target families with students" },
  { name: "Holiday Season", objective: "Maximize holiday spending" },
  { name: "Black Friday", objective: "Drive high volume sales" },
  { name: "New Year", objective: "Encourage new year resolutions" }
]

const customerValueIcons = {
  personalization: <Users className="h-4 w-4" />,
  valueForMoney: <DollarSign className="h-4 w-4" />,
  convenience: <Zap className="h-4 w-4" />,
  quality: <Award className="h-4 w-4" />,
  exclusivity: <Crown className="h-4 w-4" />,
  novelty: <Sparkles className="h-4 w-4" />
};

const customerValueDescriptions = {
  personalization: "Products and services tailored to individual customers",
  valueForMoney: "Reasonable prices relative to the quality received",
  convenience: "Easy access and minimal effort required",
  quality: "Superior product and service quality",
  exclusivity: "Limited availability and prestige offerings",
  novelty: "New, innovative, and exciting experiences"
};

function ObjectivePriorityIndicator({ value }: { value: number }) {
  let color = "bg-green-400";
  if (value <= 3) color = "bg-slate-300";
  else if (value <= 5) color = "bg-blue-400";
  else if (value <= 7) color = "bg-yellow-400";
  else if (value <= 10) color = "bg-red-400";
  
  return (
    <div className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`}></span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

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
      <CardContent className="p-0 mt-6">
        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="business" className="flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              Business Objectives
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-1.5">
              <Heart className="h-4 w-4" />
              Customer Values
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Seasonal Campaigns
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="business" className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <h3 className="text-lg font-medium text-blue-800 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Business Objectives
              </h3>
              <p className="text-sm text-blue-700 mt-1 mb-3">
                Set your business goals and their priorities on a scale of 1-10.
              </p>
              
              <div className="bg-white rounded-md border border-blue-200 p-3 mb-4">
                <div className="text-sm font-medium text-blue-800 mb-2">
                  Quick Add Common Objectives
                </div>
                <div className="flex flex-wrap gap-2">
                  {objectiveTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTemplateObjective(template.id)}
                      className="h-8 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                      disabled={data.businessObjectives.some(o => o.id === template.id)}
                    >
                      {template.icon}
                      <span className="ml-1.5">{template.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              {data.businessObjectives.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {data.businessObjectives.map((objective, index) => {
                    const template = objectiveTemplates.find(t => t.id === objective.id);
                    const icon = template?.icon || <Target className="h-4 w-4" />;
                    
                    return (
                      <div 
                        key={index} 
                        className="bg-white rounded-md border border-blue-200 p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div className="mr-3 text-blue-600">
                            {icon}
                          </div>
                          <div>
                            <div className="font-medium text-slate-700">{objective.label}</div>
                            <div className="text-xs text-slate-500 mt-0.5">Priority: {objective.priority}/10</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-28">
                            <Slider
                              value={[objective.priority]}
                              min={1}
                              max={10}
                              step={1}
                              onValueChange={(value) => handleObjectivePriorityChange(index, value)}
                              className="w-full"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveObjective(index)}
                            className="h-7 w-7 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-md bg-white text-slate-500 mb-4">
                  No business objectives added yet
                </div>
              )}
              
              <div className="bg-white rounded-md border border-blue-200 p-3">
                <div className="text-sm font-medium text-blue-800 mb-2">
                  Add Custom Objective
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="Enter a business objective"
                    className="border-blue-200"
                  />
                  <div className="flex items-center gap-3">
                    <Label className="text-sm text-slate-600">Priority:</Label>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1">
                        <Slider
                          value={[objectivePriority]}
                          min={1}
                          max={10}
                          step={1}
                          onValueChange={(value) => setObjectivePriority(value[0])}
                        />
                      </div>
                      <ObjectivePriorityIndicator value={objectivePriority} />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddObjective}
                    disabled={!newObjective}
                    className="mt-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Objective
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="customers" className="space-y-6">
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 border border-pink-100">
              <h3 className="text-lg font-medium text-pink-800 flex items-center">
                <Heart className="h-5 w-5 mr-2 text-pink-600" />
                Customer Value Priorities
              </h3>
              <p className="text-sm text-pink-700 mt-1 mb-4">
                What aspects of your product or service do your customers value most?
              </p>
              
              <div className="grid gap-5">
                {Object.entries(data.customerValuePriorities).map(([key, value]) => {
                  const typedKey = key as keyof CustomerValuePriorities;
                  const icon = customerValueIcons[typedKey] || <Heart className="h-4 w-4" />;
                  const description = customerValueDescriptions[typedKey] || "";
                  
                  let color = "bg-slate-200";
                  let textColor = "text-slate-700";
                  if (value >= 8) {
                    color = "bg-pink-600";
                    textColor = "text-white";
                  } else if (value >= 6) {
                    color = "bg-pink-500";
                    textColor = "text-white";
                  } else if (value >= 4) {
                    color = "bg-pink-400";
                    textColor = "text-white";
                  } else if (value >= 2) {
                    color = "bg-pink-300";
                    textColor = "text-pink-900";
                  }
                  
                  return (
                    <div key={key} className="bg-white rounded-md border border-pink-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="bg-pink-100 p-1.5 rounded-md mr-2 text-pink-600">{icon}</div>
                          <div className="font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        </div>
                        <Badge variant="outline" className={`${color} ${textColor}`}>
                          {value}/10
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{description}</p>
                      <Slider
                        value={[value]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(newValue) => handleValuePriorityChange(typedKey, newValue)}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-slate-400">Low Priority</span>
                        <span className="text-xs text-slate-400">High Priority</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="campaigns" className="space-y-6">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-100">
              <h3 className="text-lg font-medium text-amber-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-amber-600" />
                Seasonal Campaigns
              </h3>
              <p className="text-sm text-amber-700 mt-1 mb-3">
                Plan your seasonal marketing campaigns and promotions.
              </p>
              
              <div className="bg-white rounded-md border border-amber-200 p-3 mb-4">
                <div className="text-sm font-medium text-amber-800 mb-2">
                  Quick Add Common Campaigns
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {campaignTemplates.map((template) => (
                    <Button
                      key={template.name}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTemplateCampaign(template.name)}
                      className="justify-start h-auto py-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                      disabled={data.seasonalCampaigns.some(c => c.name === template.name)}
                    >
                      <Calendar className="h-4 w-4 mr-1.5 flex-shrink-0" />
                      <div className="text-left">
                        <div>{template.name}</div>
                        <div className="text-xs font-normal mt-0.5 text-amber-600">{template.objective}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
              
              {data.seasonalCampaigns.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {data.seasonalCampaigns.map((campaign, index) => (
                    <div 
                      key={index} 
                      className="bg-white rounded-md border border-amber-200 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="bg-amber-100 p-1.5 rounded-md mr-3 text-amber-600">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-700">{campaign.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{campaign.objective}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCampaign(index)}
                          className="h-7 w-7 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2 pt-2 border-t border-dashed border-amber-200 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="font-medium">Start:</span> {campaign.startDate}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {campaign.endDate}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-md bg-white text-slate-500 mb-4">
                  No seasonal campaigns added yet
                </div>
              )}
              
              <div className="bg-white rounded-md border border-amber-200 p-3">
                <div className="text-sm font-medium text-amber-800 mb-2">
                  Add Custom Campaign
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="campaign-name" className="text-xs text-slate-600">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g. Summer Sale"
                      className="border-amber-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="campaign-objective" className="text-xs text-slate-600">Campaign Objective</Label>
                    <Input
                      id="campaign-objective"
                      value={campaignObjective}
                      onChange={(e) => setCampaignObjective(e.target.value)}
                      placeholder="e.g. Increase summer product sales"
                      className="border-amber-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="campaign-start" className="text-xs text-slate-600">Start Date</Label>
                      <Input
                        id="campaign-start"
                        type="date"
                        value={campaignStartDate}
                        onChange={(e) => setCampaignStartDate(e.target.value)}
                        className="border-amber-200"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="campaign-end" className="text-xs text-slate-600">End Date</Label>
                      <Input
                        id="campaign-end"
                        type="date"
                        value={campaignEndDate}
                        onChange={(e) => setCampaignEndDate(e.target.value)}
                        className="border-amber-200"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddCampaign}
                    disabled={!campaignName || !campaignStartDate || !campaignEndDate}
                    className="mt-1 bg-amber-600 hover:bg-amber-700"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Campaign
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 