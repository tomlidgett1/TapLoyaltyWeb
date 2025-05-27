'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Headphones, Inbox, Brain, BarChart3, Receipt, Users, ShoppingCart, DollarSign, Calculator, Settings, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export default function AgentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false)
  const [isRequestAgentOpen, setIsRequestAgentOpen] = useState(false)
  const [requestForm, setRequestForm] = useState({
    agentName: '',
    description: '',
    useCase: '',
    integrations: '',
    email: ''
  })

  // Define agent type
  type Agent = {
    id: string
    name: string
    description: string
    status: 'active' | 'coming-soon'
    features: string[]
    integrations: string[]
    customisable?: boolean
    frequencies?: string[]
  }

  // Define agents organized by sections
  const agentSections: Record<string, Agent[]> = {
    'Customer Service': [
      {
        id: 'customer-service',
        name: 'Customer Service Agent',
        description: 'Handle customer inquiries and support requests automatically with AI-powered responses',
        status: 'active' as const,
        features: ['24/7 Support', 'Auto-responses', 'Ticket routing', 'Sentiment analysis'],
        integrations: ['gmail.png', 'mailchimp.png']
      },
      {
        id: 'email-summary',
        name: 'Email Summary Agent',
        description: 'Summarise and analyse your email communications for better customer insights',
        status: 'active' as const,
        features: ['Daily summaries', 'Priority detection', 'Action items', 'Thread analysis'],
        integrations: ['gmail.png']
      }
    ],
    'Sales and Operations': [
      {
        id: 'inventory-management',
        name: 'Inventory Management Agent',
        description: 'Monitor stock levels and automate reordering processes across all locations',
        status: 'active' as const,
        features: ['Stock monitoring', 'Auto-reordering', 'Supplier management', 'Demand forecasting'],
        integrations: ['square.png', 'lslogo.png']
      },
      {
        id: 'pos-integration',
        name: 'POS Integration Agent',
        description: 'Sync sales data and customer information across all point-of-sale systems',
        status: 'coming-soon' as const,
        features: ['Real-time sync', 'Multi-location support', 'Customer data unification'],
        integrations: ['square.png', 'lslogo.png']
      },
      {
        id: 'shopify-sync',
        name: 'Shopify Sales Agent',
        description: 'Sync Shopify orders, inventory, and customer data with your business systems',
        status: 'active' as const,
        features: ['Order sync', 'Inventory management', 'Customer data sync', 'Sales analytics'],
        integrations: ['square.png', 'mailchimp.png']
      }
    ],
    'Finance and Analytics': [
      {
        id: 'sales-analysis',
        name: 'Sales Analysis Agent',
        description: 'Analyse sales performance with customisable reporting and predictive insights',
        status: 'active' as const,
        features: ['Daily reports', 'Weekly summaries', 'Monthly analysis', 'Trend prediction'],
        integrations: ['xero.png', 'square.png'],
        customisable: true,
        frequencies: ['Daily', 'Weekly', 'Monthly']
      },
      {
        id: 'invoice-xero',
        name: 'Invoice Agent with Xero',
        description: 'Automate invoice processing and Xero integration for seamless accounting',
        status: 'coming-soon' as const,
        features: ['Auto-invoicing', 'Xero sync', 'Payment tracking', 'Tax calculations'],
        integrations: ['xero.png']
      },
      {
        id: 'insights',
        name: 'Business Insights Agent',
        description: 'Generate comprehensive business insights from your data across all platforms',
        status: 'active' as const,
        features: ['Data analysis', 'Trend detection', 'Recommendations', 'Performance metrics'],
        integrations: ['xero.png', 'square.png', 'lslogo.png']
      }
    ],
    'Marketing': [
      {
        id: 'campaign-automation',
        name: 'Campaign Automation Agent',
        description: 'Create and manage automated marketing campaigns based on customer behaviour',
        status: 'coming-soon' as const,
        features: ['Email campaigns', 'Customer segmentation', 'A/B testing', 'Performance tracking'],
        integrations: ['mailchimp.png', 'gmail.png']
      },
      {
        id: 'loyalty-optimization',
        name: 'Loyalty Optimization Agent',
        description: 'Optimise your loyalty program with AI-driven recommendations and rewards',
        status: 'active' as const,
        features: ['Reward optimization', 'Customer lifetime value', 'Engagement tracking'],
        integrations: ['square.png', 'lslogo.png']
      }
    ]
  }

  // Define available integrations
  const availableIntegrations = [
    { id: 'xero', name: 'Xero', description: 'Accounting and bookkeeping', logo: 'xero.png', status: 'active' },
    { id: 'square', name: 'Square', description: 'Point of sale system', logo: 'square.png', status: 'active' },
    { id: 'lightspeed', name: 'Lightspeed', description: 'Retail POS system', logo: 'lslogo.png', status: 'active' },
    { id: 'gmail', name: 'Gmail', description: 'Email communication', logo: 'gmail.png', status: 'active' },
    { id: 'mailchimp', name: 'Mailchimp', description: 'Email marketing', logo: 'mailchimp.png', status: 'active' },
    { id: 'shopify', name: 'Shopify', description: 'E-commerce platform', logo: 'square.png', status: 'coming-soon' },
    { id: 'stripe', name: 'Stripe', description: 'Payment processing', logo: 'square.png', status: 'coming-soon' },
    { id: 'quickbooks', name: 'QuickBooks', description: 'Accounting software', logo: 'xero.png', status: 'coming-soon' },
    { id: 'hubspot', name: 'HubSpot', description: 'CRM and marketing', logo: 'mailchimp.png', status: 'coming-soon' },
    { id: 'salesforce', name: 'Salesforce', description: 'Customer relationship management', logo: 'square.png', status: 'coming-soon' },
  ]

  const handleAgentAction = (agent: Agent) => {
    if (agent.id === 'email-summary') {
      router.push('/dashboard?action=email-summary')
    } else if (agent.id === 'insights') {
      router.push('/insights')
    } else if (agent.id === 'customer-service') {
      toast({
        title: "Customer Service Agent",
        description: "Customer service agent functionality coming soon!"
      })
    } else if (agent.id === 'sales-analysis') {
      toast({
        title: "Sales Analysis Agent",
        description: "Sales analysis agent functionality coming soon!"
      })
    } else {
      toast({
        title: agent.name,
        description: `${agent.name} functionality coming soon!`
      })
    }
  }

  const handleIntegrationConnect = (integration: typeof availableIntegrations[0]) => {
    if (integration.status === 'active') {
      toast({
        title: `${integration.name} Connected`,
        description: `Successfully connected to ${integration.name}!`
      })
    } else {
      toast({
        title: `${integration.name}`,
        description: `${integration.name} integration coming soon!`
      })
    }
    setIsIntegrationsOpen(false)
  }

  const handleRequestFormChange = (field: string, value: string) => {
    setRequestForm(prev => ({ ...prev, [field]: value }))
  }

  const handleRequestSubmit = () => {
    if (!requestForm.agentName || !requestForm.description || !requestForm.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    // Here you would typically send the request to your backend
    toast({
      title: "Request Submitted!",
      description: "We'll review your agent request and get back to you soon."
    })
    
    // Reset form and close dialog
    setRequestForm({
      agentName: '',
      description: '',
      useCase: '',
      integrations: '',
      email: ''
    })
    setIsRequestAgentOpen(false)
  }

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">AI Agents</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRequestAgentOpen(true)}
            className="rounded-md gap-2"
          >
            <Plus className="h-4 w-4" />
            Request an Agent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsIntegrationsOpen(true)}
            className="rounded-md gap-2"
          >
            <Settings className="h-4 w-4" />
            Integrations
          </Button>
        </div>
      </div>

      {/* Agents Sections */}
      <div className="space-y-8">
        {Object.entries(agentSections).map(([sectionName, agents]) => (
          <div key={sectionName} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-medium text-gray-900">{sectionName}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col relative">
                  {/* Connect Button - Top Right */}
                  <div className="absolute top-3 right-3">
                    <Button 
                      size="sm" 
                      variant={agent.status === 'active' ? 'default' : 'outline'}
                      disabled={agent.status === 'coming-soon'}
                      className="rounded-md px-4"
                      onClick={() => handleAgentAction(agent)}
                    >
                      {agent.status === 'active' ? 'Connect' : 'Coming Soon'}
                    </Button>
                  </div>

                  {/* Integration Logos */}
                  <div className="flex gap-1 mb-3">
                    {agent.integrations.slice(0, 3).map((integration, index) => (
                      <div key={index} className="relative w-6 h-6 bg-white rounded-md border border-gray-200 shadow-sm flex items-center justify-center">
                        <Image
                          src={`/${integration}`}
                          alt={integration.split('.')[0]}
                          width={20}
                          height={20}
                          className="object-contain"
                        />
                      </div>
                    ))}
                    {agent.integrations.length > 3 && (
                      <div className="w-6 h-6 bg-gray-200 rounded-md border border-gray-200 shadow-sm flex items-center justify-center">
                        <span className="text-xs text-gray-600 font-medium">+{agent.integrations.length - 3}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-base font-semibold mb-2 text-gray-900 pr-20">{agent.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 flex-1">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Integrations Dialog */}
      <Dialog open={isIntegrationsOpen} onOpenChange={setIsIntegrationsOpen}>
        <DialogContent className="max-w-xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Available Integrations</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-3">
            {availableIntegrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-md border border-gray-200 shadow-sm flex items-center justify-center">
                    <Image
                      src={`/${integration.logo}`}
                      alt={integration.name}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{integration.name}</h3>
                    <p className="text-xs text-gray-600">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={integration.status === 'active' ? 'default' : 'outline'}
                    disabled={integration.status === 'coming-soon'}
                    onClick={() => handleIntegrationConnect(integration)}
                    className="rounded-md text-xs px-3 py-1"
                  >
                    {integration.status === 'active' ? 'Connect' : 'Coming Soon'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Request an Agent Dialog */}
      <Dialog open={isRequestAgentOpen} onOpenChange={setIsRequestAgentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a Custom Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name *</Label>
              <Input
                id="agentName"
                placeholder="e.g., Social Media Manager Agent"
                value={requestForm.agentName}
                onChange={(e) => handleRequestFormChange('agentName', e.target.value)}
                className="rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this agent should do..."
                value={requestForm.description}
                onChange={(e) => handleRequestFormChange('description', e.target.value)}
                className="rounded-md min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="useCase">Use Case</Label>
              <Textarea
                id="useCase"
                placeholder="How would you use this agent in your business?"
                value={requestForm.useCase}
                onChange={(e) => handleRequestFormChange('useCase', e.target.value)}
                className="rounded-md min-h-[60px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="integrations">Required Integrations</Label>
              <Input
                id="integrations"
                placeholder="e.g., Instagram, Facebook, Twitter"
                value={requestForm.integrations}
                onChange={(e) => handleRequestFormChange('integrations', e.target.value)}
                className="rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={requestForm.email}
                onChange={(e) => handleRequestFormChange('email', e.target.value)}
                className="rounded-md"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsRequestAgentOpen(false)}
                className="rounded-md"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestSubmit}
                className="rounded-md"
              >
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 