"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { BarChart, LineChart, PieChart, ArrowUpRight, Download, Filter, Plus, Save, Table as TableIcon, AreaChart, Trash2, Edit, Copy, Eye, EyeOff, Maximize2, HelpCircle, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Calendar, Code } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"

// Define metrics array
const metrics = [
  { id: "total_customers", name: "Total Customers", category: "customers" },
  { id: "new_customers", name: "New Customers", category: "customers" },
  { id: "active_customers", name: "Active Customers", category: "customers" },
  { id: "points_issued", name: "Points Issued", category: "points" },
  { id: "points_redeemed", name: "Points Redeemed", category: "points" },
  { id: "rewards_claimed", name: "Rewards Claimed", category: "rewards" },
  { id: "rewards_redeemed", name: "Rewards Redeemed", category: "rewards" }
]

// Add this after the metrics array definition
const dimensions = [
  { id: "day", name: "Day", category: "time" },
  { id: "week", name: "Week", category: "time" },
  { id: "month", name: "Month", category: "time" },
  { id: "quarter", name: "Quarter", category: "time" },
  { id: "year", name: "Year", category: "time" },
  { id: "customer_segment", name: "Customer Segment", category: "customer" },
  { id: "reward_type", name: "Reward Type", category: "reward" },
  { id: "reward_value", name: "Reward Value", category: "reward" },
  { id: "points_threshold", name: "Points Threshold", category: "points" },
  { id: "location", name: "Location", category: "store" }
]

// SQL query templates
const sqlQueryTemplates = {
  customer_growth: `
    SELECT 
      DATE_TRUNC('{time_dimension}', created_at) as period,
      COUNT(DISTINCT customer_id) as total_customers
    FROM customers
    WHERE merchant_id = '{merchant_id}'
    AND created_at BETWEEN '{start_date}' AND '{end_date}'
    GROUP BY period
    ORDER BY period
  `,
  points_activity: `
    SELECT 
      DATE_TRUNC('{time_dimension}', created_at) as period,
      SUM(CASE WHEN type = 'issue' THEN points ELSE 0 END) as points_issued,
      SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END) as points_redeemed
    FROM points_transactions
    WHERE merchant_id = '{merchant_id}'
    AND created_at BETWEEN '{start_date}' AND '{end_date}'
    GROUP BY period
    ORDER BY period
  `,
  reward_performance: `
    SELECT 
      r.name as reward_name,
      COUNT(rc.id) as times_claimed,
      COUNT(rr.id) as times_redeemed,
      COUNT(rr.id) / NULLIF(COUNT(rc.id), 0) as redemption_rate
    FROM rewards r
    LEFT JOIN reward_claims rc ON r.id = rc.reward_id
    LEFT JOIN reward_redemptions rr ON rc.id = rr.claim_id
    WHERE r.merchant_id = '{merchant_id}'
    AND (rc.created_at BETWEEN '{start_date}' AND '{end_date}' OR rc.created_at IS NULL)
    GROUP BY r.id, r.name
    ORDER BY times_claimed DESC
  `
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState({
    totalCustomers: 0,
    activeRewards: 0,
    pointsIssued: 0,
    rewardsRedeemed: 0
  })
  const { user } = useAuth()
  const [isCreatingReport, setIsCreatingReport] = useState(false)
  const [customReports, setCustomReports] = useState([])
  const [dashboards, setDashboards] = useState([
    { 
      id: "default", 
      name: "Default Dashboard", 
      reports: [] 
    }
  ])
  const [activeDashboardId, setActiveDashboardId] = useState("default")
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState("")
  const [previewReport, setPreviewReport] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user?.uid) return
      
      setIsLoading(true)
      try {
        // This would be replaced with actual Firebase queries
        // For now, we'll use mock data
        setTimeout(() => {
          setAnalyticsData({
            totalCustomers: 124,
            activeRewards: 8,
            pointsIssued: 12450,
            rewardsRedeemed: 67
          })
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error fetching analytics data:", error)
        setIsLoading(false)
      }
    }
    
    fetchAnalyticsData()
  }, [user])

  const handleCreateReport = (reportData) => {
    const newReport = {
      id: `report_${Date.now()}`,
      ...reportData
    }
    setCustomReports([...customReports, newReport])
    setIsCreatingReport(false)
  }

  const handleCreateDashboard = () => {
    if (!newDashboardName.trim()) {
      toast({
        title: "Dashboard name required",
        description: "Please provide a name for your dashboard.",
        variant: "destructive"
      })
      return
    }
    
    const newDashboard = {
      id: `dashboard_${Date.now()}`,
      name: newDashboardName,
      reports: []
    }
    
    setDashboards([...dashboards, newDashboard])
    setActiveDashboardId(newDashboard.id)
    setIsCreatingDashboard(false)
    setNewDashboardName("")
    
    toast({
      title: "Dashboard created",
      description: `"${newDashboardName}" has been created successfully.`
    })
  }

  const handleDeleteDashboard = (dashboardId) => {
    if (dashboards.length <= 1) {
      toast({
        title: "Cannot delete dashboard",
        description: "You must have at least one dashboard.",
        variant: "destructive"
      })
      return
    }
    
    setDashboards(dashboards.filter(d => d.id !== dashboardId))
    
    if (activeDashboardId === dashboardId) {
      setActiveDashboardId(dashboards[0].id)
    }
    
    toast({
      title: "Dashboard deleted",
      description: "The dashboard has been deleted."
    })
  }

  const handleAddReportToDashboard = (dashboardId, report) => {
    setDashboards(dashboards.map(dashboard => {
      if (dashboard.id === dashboardId) {
        return {
          ...dashboard,
          reports: [...dashboard.reports, report]
        }
      }
      return dashboard
    }))
    
    toast({
      title: "Report added to dashboard",
      description: `"${report.name}" has been added to the dashboard.`
    })
  }

  const handleRemoveReportFromDashboard = (dashboardId, reportId) => {
    setDashboards(dashboards.map(dashboard => {
      if (dashboard.id === dashboardId) {
        return {
          ...dashboard,
          reports: dashboard.reports.filter(r => r.id !== reportId)
        }
      }
      return dashboard
    }))
    
    toast({
      title: "Report removed",
      description: "The report has been removed from the dashboard."
    })
  }

  const activeDashboard = dashboards.find(d => d.id === activeDashboardId) || dashboards[0]

  const generateMockDataForReport = (report) => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    
    if (report.type === 'pie') {
      return {
        labels: ['Segment A', 'Segment B', 'Segment C', 'Segment D', 'Segment E'],
        datasets: [{
          label: 'Data',
          data: [25, 20, 30, 15, 10],
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
          ],
        }]
      }
    }
    
    return {
      labels,
      datasets: report.metrics.map((metricId, index) => {
        const metric = metrics.find(m => m.id === metricId)
        const colors = [
          'rgba(59, 130, 246, 0.5)', // blue
          'rgba(16, 185, 129, 0.5)', // green
          'rgba(245, 158, 11, 0.5)', // amber
          'rgba(239, 68, 68, 0.5)',  // red
          'rgba(139, 92, 246, 0.5)'  // purple
        ]
        
        return {
          label: metric?.name || metricId,
          data: Array(6).fill(0).map(() => Math.floor(Math.random() * 100)),
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length].replace('0.5', '1'),
        }
      })
    }
  }

  function ReportVisualization({ report }) {
    const data = generateMockDataForReport(report)
    
    return (
      <div className="h-full">
        {report.type === 'bar' && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full h-[250px] flex items-end justify-around">
              {data.labels.map((label, i) => (
                <div key={i} className="flex flex-col items-center">
                  {data.datasets.map((dataset, j) => (
                    <div 
                      key={j}
                      className="w-8 mb-1 rounded-t-sm" 
                      style={{ 
                        height: `${(dataset.data[i] / Math.max(...dataset.data)) * 150}px`,
                        backgroundColor: dataset.backgroundColor
                      }}
                    ></div>
                  ))}
                  <span className="text-xs mt-1">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {report.type === 'line' && (
          <div className="w-full h-[250px] flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Line Chart Visualization</div>
          </div>
        )}
        
        {report.type === 'pie' && (
          <div className="w-full h-[250px] flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Pie Chart Visualization</div>
          </div>
        )}
        
        {report.type === 'area' && (
          <div className="w-full h-[250px] flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Area Chart Visualization</div>
          </div>
        )}
        
        {report.type === 'table' && (
          <div className="w-full overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b">Period</th>
                  {data.datasets.map((dataset, i) => (
                    <th key={i} className="text-left p-2 border-b">{dataset.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.labels.map((label, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="p-2 border-b">{label}</td>
                    {data.datasets.map((dataset, j) => (
                      <td key={j} className="p-2 border-b">{dataset.data[i]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="p-6">
        <PageHeader
          title="Analytics"
          subtitle="Track and analyze your business performance"
        >
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => {/* Export functionality */}}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={() => setIsCreatingReport(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </PageHeader>

        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
            <TabsTrigger value="explorer">Data Explorer</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.totalCustomers}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500 inline-flex items-center">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      +12%
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Rewards</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.activeRewards}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500 inline-flex items-center">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      +2
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Points Issued</CardTitle>
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.pointsIssued.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500 inline-flex items-center">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      +18%
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rewards Redeemed</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.rewardsRedeemed}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500 inline-flex items-center">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      +7%
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Customer Growth</CardTitle>
                  <CardDescription>
                    New customers over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/10">
                    <p className="text-muted-foreground">Customer growth chart will appear here</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Reward Redemptions</CardTitle>
                  <CardDescription>
                    Rewards redeemed over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/10">
                    <p className="text-muted-foreground">Reward redemptions chart will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Analytics</CardTitle>
                <CardDescription>
                  Detailed insights about your customer base
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center border rounded-md bg-muted/10">
                  <p className="text-muted-foreground">Customer analytics will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="dashboards" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Dashboards</h3>
                <Select value={activeDashboardId} onValueChange={setActiveDashboardId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select dashboard" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboards.map(dashboard => (
                      <SelectItem key={dashboard.id} value={dashboard.id}>
                        {dashboard.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setIsCreatingDashboard(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Dashboard
                </Button>
              </div>
              <Button onClick={() => setIsCreatingReport(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Report
              </Button>
            </div>
            
            {activeDashboard.reports.length === 0 ? (
              <Card>
                <CardContent className="text-center p-8">
                  <h3 className="text-lg font-medium mb-2">No reports in this dashboard</h3>
                  <p className="text-muted-foreground mb-4">
                    Create custom reports to add to this dashboard
                  </p>
                  <Button onClick={() => setIsCreatingReport(true)}>Create Report</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeDashboard.reports.map(report => (
                  <Card key={report.id} className="group relative">
                    <div className="absolute right-2 top-2 hidden group-hover:flex bg-white/90 rounded-md shadow-sm z-10">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewReport(report)}>
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            // Edit report logic
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            // Duplicate report logic
                          }}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleRemoveReportFromDashboard(activeDashboardId, report.id)}
                            className="text-red-600 focus:bg-red-50 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardHeader>
                      <CardTitle>{report.name}</CardTitle>
                      <CardDescription>
                        {report.metrics.length} metrics, {report.dimensions.length} dimensions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ReportVisualization report={report} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <Dialog open={isCreatingReport} onOpenChange={setIsCreatingReport}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create Custom Report</DialogTitle>
                  <DialogDescription>
                    Select metrics and dimensions to create a custom analytics report
                  </DialogDescription>
                </DialogHeader>
                <ReportBuilder 
                  onSave={(reportData) => {
                    const newReport = {
                      id: `report_${Date.now()}`,
                      ...reportData
                    }
                    setCustomReports([...customReports, newReport])
                    handleAddReportToDashboard(activeDashboardId, newReport)
                    setIsCreatingReport(false)
                  }} 
                  onCancel={() => setIsCreatingReport(false)} 
                />
              </DialogContent>
            </Dialog>
            
            <Dialog open={isCreatingDashboard} onOpenChange={setIsCreatingDashboard}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Dashboard</DialogTitle>
                  <DialogDescription>
                    Create a new dashboard to organize your reports
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="dashboard-name">Dashboard Name</Label>
                    <Input 
                      id="dashboard-name" 
                      value={newDashboardName} 
                      onChange={(e) => setNewDashboardName(e.target.value)} 
                      placeholder="My Dashboard"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreatingDashboard(false)}>Cancel</Button>
                  <Button onClick={handleCreateDashboard}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={!!previewReport} onOpenChange={() => setPreviewReport(null)}>
              <DialogContent className="sm:max-w-[800px] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>{previewReport?.name}</DialogTitle>
                  <DialogDescription>
                    {previewReport?.metrics.length} metrics, {previewReport?.dimensions.length} dimensions
                  </DialogDescription>
                </DialogHeader>
                <div className="h-[500px] overflow-auto">
                  {previewReport && <ReportVisualization report={previewReport} />}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  )
}

function ReportBuilder({ onSave, onCancel, initialReport = null }) {
  const [reportName, setReportName] = useState("New Report")
  const [reportType, setReportType] = useState("bar")
  const [selectedMetrics, setSelectedMetrics] = useState([])
  const [selectedDimensions, setSelectedDimensions] = useState([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customSQL, setCustomSQL] = useState("")
  const [dateRange, setDateRange] = useState({ 
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    to: new Date() 
  })
  const { toast } = useToast()
  const [previewData, setPreviewData] = useState(null)
  
  const chartTypes = [
    { id: "bar", name: "Bar Chart", icon: BarChart },
    { id: "line", name: "Line Chart", icon: LineChart },
    { id: "pie", name: "Pie Chart", icon: PieChart },
    { id: "area", name: "Area Chart", icon: AreaChart },
    { id: "table", name: "Table", icon: TableIcon }
  ]
  
  const handleSave = () => {
    if (!reportName) {
      alert("Please provide a name for your report")
      return
    }
    
    if (selectedMetrics.length === 0) {
      alert("Please select at least one metric")
      return
    }
    
    onSave({
      name: reportName,
      type: reportType,
      metrics: selectedMetrics,
      dimensions: selectedDimensions,
      dateRange,
      customSQL: showAdvanced ? customSQL : null
    })
  }

  const handlePreview = () => {
    if (selectedMetrics.length === 0) {
      toast({
        title: "Select metrics",
        description: "Please select at least one metric to preview the report.",
        variant: "destructive"
      })
      return
    }
    
    // Generate mock data for preview
    const mockData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: selectedMetrics.map((metricId, index) => {
        const metric = metrics.find(m => m.id === metricId)
        const colors = [
          'rgba(59, 130, 246, 0.5)', // blue
          'rgba(16, 185, 129, 0.5)', // green
          'rgba(245, 158, 11, 0.5)', // amber
          'rgba(239, 68, 68, 0.5)',  // red
          'rgba(139, 92, 246, 0.5)'  // purple
        ]
        
        return {
          label: metric?.name || metricId,
          data: Array(6).fill(0).map(() => Math.floor(Math.random() * 100)),
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length].replace('0.5', '1'),
        }
      })
    }
    
    setPreviewData(mockData)
    
    toast({
      title: "Preview generated",
      description: "This is sample data. Real data will be used when the report is saved."
    })
  }
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="report-name">Report Name</Label>
          <Input 
            id="report-name" 
            value={reportName} 
            onChange={(e) => setReportName(e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="chart-type">Chart Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger id="chart-type">
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              {chartTypes.map(type => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    <span>{type.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Metrics</Label>
          <ScrollArea className="h-[200px] rounded-md border p-4">
            {metrics.map(metric => (
              <div key={metric.id} className="flex items-center space-x-2 py-1">
                <Checkbox 
                  id={`metric-${metric.id}`} 
                  checked={selectedMetrics.includes(metric.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedMetrics([...selectedMetrics, metric.id])
                    } else {
                      setSelectedMetrics(selectedMetrics.filter(id => id !== metric.id))
                    }
                  }}
                />
                <label 
                  htmlFor={`metric-${metric.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {metric.name}
                </label>
              </div>
            ))}
          </ScrollArea>
        </div>
        
        <div className="space-y-2">
          <Label>Dimensions</Label>
          <ScrollArea className="h-[200px] rounded-md border p-4">
            {dimensions.map(dimension => (
              <div key={dimension.id} className="flex items-center space-x-2 py-1">
                <Checkbox 
                  id={`dimension-${dimension.id}`} 
                  checked={selectedDimensions.includes(dimension.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedDimensions([...selectedDimensions, dimension.id])
                    } else {
                      setSelectedDimensions(selectedDimensions.filter(id => id !== dimension.id))
                    }
                  }}
                />
                <label 
                  htmlFor={`dimension-${dimension.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {dimension.name}
                </label>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Date Range</Label>
        <div className="flex gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <Separator />
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="advanced-mode" 
          checked={showAdvanced} 
          onCheckedChange={setShowAdvanced} 
        />
        <Label htmlFor="advanced-mode">Advanced Mode (Custom SQL)</Label>
      </div>
      
      {showAdvanced && (
        <div className="space-y-2">
          <Label htmlFor="custom-sql">Custom SQL Query</Label>
          <div className="relative">
            <textarea
              id="custom-sql"
              value={customSQL}
              onChange={(e) => setCustomSQL(e.target.value)}
              className="min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              placeholder="SELECT * FROM ..."
            />
            <div className="absolute top-2 right-2">
              <Select 
                onValueChange={(value) => {
                  setCustomSQL(sqlQueryTemplates[value]
                    .replace('{merchant_id}', 'YOUR_MERCHANT_ID')
                    .replace('{time_dimension}', 'month')
                    .replace('{start_date}', format(dateRange.from, 'yyyy-MM-dd'))
                    .replace('{end_date}', format(dateRange.to, 'yyyy-MM-dd'))
                  )
                  toast({
                    title: "SQL template loaded",
                    description: "You can now customize the query to fit your needs."
                  })
                }}
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Query templates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_growth">Customer Growth</SelectItem>
                  <SelectItem value="points_activity">Points Activity</SelectItem>
                  <SelectItem value="reward_performance">Reward Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use custom SQL for advanced analytics. Variables: {'{merchant_id}'}, {'{start_date}'}, {'{end_date}'}, {'{time_dimension}'}
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        <Button onClick={handlePreview} variant="outline" className="w-full">
          <Eye className="mr-2 h-4 w-4" />
          Preview Report
        </Button>
        
        {previewData && (
          <div className="border rounded-md p-4 bg-background">
            <h3 className="text-lg font-medium mb-2">{reportName || "Report Preview"}</h3>
            <div className="h-[300px]">
              {reportType === 'bar' && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-full h-[250px] flex items-end justify-around">
                    {previewData.labels.map((label, i) => (
                      <div key={i} className="flex flex-col items-center">
                        {previewData.datasets.map((dataset, j) => (
                          <div 
                            key={j}
                            className="w-8 mb-1 rounded-t-sm" 
                            style={{ 
                              height: `${(dataset.data[i] / Math.max(...dataset.data)) * 150}px`,
                              backgroundColor: dataset.backgroundColor
                            }}
                          ></div>
                        ))}
                        <span className="text-xs mt-1">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {reportType === 'line' && (
                <div className="w-full h-[250px] flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Line Chart Visualization</div>
                </div>
              )}
              
              {reportType === 'pie' && (
                <div className="w-full h-[250px] flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Pie Chart Visualization</div>
                </div>
              )}
              
              {reportType === 'area' && (
                <div className="w-full h-[250px] flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Area Chart Visualization</div>
                </div>
              )}
              
              {reportType === 'table' && (
                <div className="w-full overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-2 border-b">Period</th>
                        {previewData.datasets.map((dataset, i) => (
                          <th key={i} className="text-left p-2 border-b">{dataset.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.labels.map((label, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                          <td className="p-2 border-b">{label}</td>
                          {previewData.datasets.map((dataset, j) => (
                            <td key={j} className="p-2 border-b">{dataset.data[i]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This is a preview with sample data. Actual data will be used when the report is saved.
            </p>
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Report
        </Button>
      </div>
    </div>
  )
} 