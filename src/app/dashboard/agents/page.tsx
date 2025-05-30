'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Headphones, Inbox, Brain, BarChart3, Receipt, Users, ShoppingCart, DollarSign, Calculator, Settings, Plus, FileText, Mail, MessageSquare, Clock, CheckCircle, X, ArrowUpRight, ChevronRightIcon, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHead,
  TableHeader,
  TableHeaderGroup,
  TableProvider,
  TableRow,
} from '@/components/ui/kibo-ui/table'
import type { ColumnDef } from '@/components/ui/kibo-ui/table'
import { getFunctions, httpsCallable } from 'firebase/functions'

export default function AgentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false)
  const [isRequestAgentOpen, setIsRequestAgentOpen] = useState(false)
  const [isCustomerServiceModalOpen, setIsCustomerServiceModalOpen] = useState(false)
  const [isEmailSummaryModalOpen, setIsEmailSummaryModalOpen] = useState(false)
  const [isCreateAgentModalOpen, setIsCreateAgentModalOpen] = useState(false)
  const [connectingAgents, setConnectingAgents] = useState<Set<string>>(new Set())
  const [enrolledAgents, setEnrolledAgents] = useState<Record<string, any>>({})
  const [agentSettings, setAgentSettings] = useState({
    autoReply: true,
    vaultAccess: true,
    webSearching: false,
    lightspeedIntegration: {
      enabled: false,
      priceLookup: false,
      inventoryLookup: false
    },
    squareIntegration: {
      enabled: false,
      priceLookup: false,
      inventoryLookup: false
    },
    businessHours: {
      enabled: true,
      timezone: 'Australia/Sydney',
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '10:00', end: '16:00', enabled: false },
      sunday: { start: '10:00', end: '16:00', enabled: false }
    },
    businessContext: '',
    forbiddenResponses: [],
    greeting: '',
    signOff: '',
    communicationStyle: 'professional'
  })
  const [testEmail, setTestEmail] = useState({
    from: '',
    subject: '',
    body: '',
    response: '',
    isGenerating: false
  })
  const [showConfiguration, setShowConfiguration] = useState(false)
  const [showEmailSummaryConfiguration, setShowEmailSummaryConfiguration] = useState(false)
  const [integrationStatuses, setIntegrationStatuses] = useState({
    gmail: true,
    mailchimp: false,
    vault: true
  })
  const [requestForm, setRequestForm] = useState({
    agentName: '',
    description: '',
    useCase: '',
    integrations: '',
    email: ''
  })
  const [businessContextItems, setBusinessContextItems] = useState<string[]>([])
  const [newContextItem, setNewContextItem] = useState('')
  const [activeConfigTab, setActiveConfigTab] = useState('general')
  const [newRule, setNewRule] = useState('')
  const [businessRules, setBusinessRules] = useState<string[]>([])
  const [newForbiddenItem, setNewForbiddenItem] = useState('')
  const [forbiddenItems, setForbiddenItems] = useState<string[]>([])
  const [emailSummarySettings, setEmailSummarySettings] = useState({
    enabled: true,
    lookbackPeriod: '30',
    schedule: {
      frequency: 'daily',
      time: '12:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    emailFormat: 'summary',
    priorityOnly: true,
    includeAttachments: true
  })
  const [showLogsView, setShowLogsView] = useState(false)
  const [agentLogs, setAgentLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Create Agent Modal State
  const [createAgentForm, setCreateAgentForm] = useState({
    name: '',
    steps: ['']
  })
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false)
  const [createAgentSchedule, setCreateAgentSchedule] = useState({
    frequency: '',
    time: '12:00',
    days: [] as string[],
    selectedDay: '' // for weekly
  })
  const [composioTools, setComposioTools] = useState<any[]>([])
  const [toolsLoading, setToolsLoading] = useState(false)
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set())
  const [toolsSearchQuery, setToolsSearchQuery] = useState('')
  const [createAgentStepsTab, setCreateAgentStepsTab] = useState('smart') // Add tab state for agent steps
  const [smartCreatePrompt, setSmartCreatePrompt] = useState('') // Add state for smart create prompt
  const [isEditingAgentName, setIsEditingAgentName] = useState(false) // Add state for editing agent name
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false) // Add state for generating steps
  const [generatedStepsText, setGeneratedStepsText] = useState('') // Add state for generated steps text
  const [agentIdeas, setAgentIdeas] = useState<any>(null) // Add state for agent ideas response
  const [isLoadingAgentIdeas, setIsLoadingAgentIdeas] = useState(false) // Add state for loading agent ideas
  const [expandedAgentIdeas, setExpandedAgentIdeas] = useState<Set<string>>(new Set()) // Add state for expanded agent ideas

  // Define agent type
  type Agent = {
    id: string
    name: string
    description: string
    status: 'active' | 'coming-soon'
    features: string[]
    integrations: string[]
    requiredIntegrations?: string[]
    optionalIntegrations?: string[]
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
        integrations: ['gmail.png', 'vault.png'],
        requiredIntegrations: ['gmail.png', 'vault.png'],
        optionalIntegrations: ['square.png', 'lslogo.png']
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
        status: 'coming-soon' as const,
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
        status: 'coming-soon' as const,
        features: ['Order sync', 'Inventory management', 'Customer data sync', 'Sales analytics'],
        integrations: ['square.png', 'mailchimp.png']
      }
    ],
    'Finance and Analytics': [
      {
        id: 'sales-analysis',
        name: 'Sales Analysis Agent',
        description: 'Analyse sales performance with customisable reporting and predictive insights',
        status: 'coming-soon' as const,
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
        status: 'coming-soon' as const,
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
        status: 'coming-soon' as const,
        features: ['Reward optimization', 'Customer lifetime value', 'Engagement tracking'],
        integrations: ['square.png', 'lslogo.png']
      }
    ]
  }

  // Define integration name mapping
  const integrationNames: Record<string, string> = {
    'gmail.png': 'Gmail',
    'mailchimp.png': 'Mailchimp',
    'xero.png': 'Xero',
    'square.png': 'Square',
    'lslogo.png': 'Lightspeed',
    'vault.png': 'Vault'
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

  // Load enrolled agents when component mounts
  useEffect(() => {
    const loadEnrolledAgents = async () => {
      if (!user?.uid) return
      
      try {
        // Load customer-service agent
        const customerServiceRef = doc(db, 'merchants', user.uid, 'agentsenrolled', 'customer-service')
        const customerServiceDoc = await getDoc(customerServiceRef)
        
        if (customerServiceDoc.exists()) {
          const agentData = customerServiceDoc.data()
          setEnrolledAgents(prev => ({
            ...prev,
            'customer-service': agentData
          }))
        }

        // Load email-summary agent
        const emailSummaryRef = doc(db, 'merchants', user.uid, 'agentsenrolled', 'email-summary')
        const emailSummaryDoc = await getDoc(emailSummaryRef)
        
        if (emailSummaryDoc.exists()) {
          const agentData = emailSummaryDoc.data()
          setEnrolledAgents(prev => ({
            ...prev,
            'email-summary': agentData
          }))
          
          // Update local settings if they exist
          if (agentData.settings) {
            setEmailSummarySettings(agentData.settings)
          }
        }
      } catch (error) {
        console.error('Error loading enrolled agents:', error)
      }
    }

    loadEnrolledAgents()
  }, [user?.uid])

  // Load agent logs when showLogsView is true
  useEffect(() => {
    const loadAgentLogs = async () => {
      if (!showLogsView || !user?.uid) return
      
      setLogsLoading(true)
      try {
        const executionsRef = collection(db, 'agentlogs', user.uid, 'executions')
        const logsQuery = query(executionsRef, orderBy('executedAt', 'desc'), limit(50))
        const querySnapshot = await getDocs(logsQuery)
        
        const logs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        setAgentLogs(logs)
      } catch (error) {
        console.error('Error loading agent logs:', error)
        toast({
          title: "Failed to Load Logs",
          description: "Could not load agent execution logs. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLogsLoading(false)
      }
    }

    loadAgentLogs()
  }, [showLogsView, user?.uid, toast])

  // Load Composio tools when create agent modal opens
  useEffect(() => {
    const loadComposioTools = async () => {
      if (!isCreateAgentModalOpen || !user?.uid) {
        console.log('🔧 [Frontend] Skipping tools load - modal closed or no user:', { 
          modalOpen: isCreateAgentModalOpen, 
          hasUser: !!user?.uid 
        })
        return
      }
      
      console.log('🔧 [Frontend] Starting to load Composio tools...')
      console.log('🔧 [Frontend] User ID:', user.uid)
      console.log('🔧 [Frontend] Search query:', toolsSearchQuery)
      
      setToolsLoading(true)
      try {
        const params = new URLSearchParams({
          merchantId: user.uid
        })
        
        if (toolsSearchQuery) {
          params.append('search', toolsSearchQuery)
          console.log('🔧 [Frontend] Added search parameter:', toolsSearchQuery)
        }
        
        const apiUrl = `/api/composio/tools?${params}`
        console.log('🔧 [Frontend] Making request to:', apiUrl)
        
        const response = await fetch(apiUrl)
        
        console.log('🔧 [Frontend] Response received')
        console.log('🔧 [Frontend] Response status:', response.status)
        console.log('🔧 [Frontend] Response statusText:', response.statusText)
        console.log('🔧 [Frontend] Response headers:', Object.fromEntries(response.headers.entries()))
        
        if (!response.ok) {
          console.log('❌ [Frontend] Response not ok, trying to get error details...')
          
          let errorText = ''
          try {
            errorText = await response.text()
            console.log('❌ [Frontend] Error response body:', errorText)
          } catch (e) {
            console.log('❌ [Frontend] Could not read error response:', e)
          }
          
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
        }
        
        console.log('🔧 [Frontend] Parsing response JSON...')
        const data = await response.json()
        
        console.log('🔧 [Frontend] Received data:', {
          hasItems: !!data.items,
          itemsCount: data.items?.length || 0,
          totalPages: data.total_pages,
          nextCursor: data.next_cursor,
          error: data.error,
          details: data.details
        })
        
        if (data.error) {
          console.log('❌ [Frontend] API returned error:', data)
          
          // Handle specific error types
          if (data.error.includes('Invalid Composio API key') || data.details?.includes('Authentication failed')) {
            console.log('❌ [Frontend] Composio API key authentication error')
            console.log('❌ [Frontend] Troubleshooting info:', data.troubleshooting)
            
            toast({
              title: "Composio API Key Invalid",
              description: "Your Composio API key is invalid or expired. Please check your configuration.",
              variant: "destructive"
            })
            
            // Show detailed error in console for debugging
            console.group('🔧 [Frontend] Composio API Key Troubleshooting')
            console.log('API Key Found:', data.apiKeyFound)
            console.log('API Key Length:', data.apiKeyLength)
            if (data.troubleshooting) {
              console.log('Troubleshooting Steps:')
              data.troubleshooting.forEach((step: string, index: number) => {
                console.log(`${index + 1}. ${step}`)
              })
            }
            console.groupEnd()
            
            return
          }
          
          throw new Error(`API Error: ${data.error} - ${data.details}`)
        }
        
        setComposioTools(data.items || [])
        console.log('✅ [Frontend] Tools loaded successfully, count:', data.items?.length || 0)
        
      } catch (error) {
        console.error('❌ [Frontend] Error loading Composio tools:', error)
        console.error('❌ [Frontend] Error name:', error instanceof Error ? error.name : typeof error)
        console.error('❌ [Frontend] Error message:', error instanceof Error ? error.message : String(error))
        console.error('❌ [Frontend] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        
        toast({
          title: "Failed to Load Tools",
          description: `Could not load available tools: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        })
      } finally {
        setToolsLoading(false)
        console.log('🔧 [Frontend] Tools loading completed')
      }
    }

    loadComposioTools()
  }, [isCreateAgentModalOpen, toolsSearchQuery, toast, user?.uid])

  // Debounced search for tools
  useEffect(() => {
    if (!isCreateAgentModalOpen || !user?.uid) return
    
    const timer = setTimeout(() => {
      // Trigger tools reload when search query changes
      if (toolsSearchQuery !== '') {
        setToolsLoading(true)
        const loadTools = async () => {
          try {
            const params = new URLSearchParams({
              merchantId: user.uid,
              search: toolsSearchQuery
            })
            
            const response = await fetch(`/api/composio/tools?${params}`)
            if (!response.ok) throw new Error('Failed to fetch tools')
            
            const data = await response.json()
            setComposioTools(data.items || [])
          } catch (error) {
            console.error('Error searching tools:', error)
          } finally {
            setToolsLoading(false)
          }
        }
        loadTools()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [toolsSearchQuery, isCreateAgentModalOpen, user?.uid])

  const handleAgentAction = async (agent: Agent) => {
    if (agent.id === 'email-summary') {
      setIsEmailSummaryModalOpen(true)
    } else if (agent.id === 'insights') {
      router.push('/insights')
    } else if (agent.id === 'customer-service') {
      // Open the customer service modal
      setIsCustomerServiceModalOpen(true)
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

  const handleCustomerServiceConnect = async () => {
    const agent = agentSections['Customer Service'].find(a => a.id === 'customer-service')
    if (!agent) return

    // Set loading state
    setConnectingAgents(prev => new Set([...prev, agent.id]))
    
    try {
      // Get merchantId from authenticated user
      if (!user?.uid) {
        throw new Error('User not authenticated')
      }
      
      const merchantId = user.uid
      const isEnrolled = enrolledAgents['customer-service']?.status === 'active'
      
      if (isEnrolled) {
        // Handle disconnect
        const agentEnrollmentRef = doc(db, 'merchants', merchantId, 'agentsenrolled', 'customer-service')
        await updateDoc(agentEnrollmentRef, {
          status: 'inactive',
          deactivatedAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        })
        
        // Update local state
        setEnrolledAgents(prev => ({
          ...prev,
          'customer-service': {
            ...prev['customer-service'],
            status: 'inactive'
          }
        }))
        
        toast({
          title: "Customer Service Agent Disconnected",
          description: "Agent has been deactivated successfully."
        })
      } else {
        // Handle connect
        const response = await fetch('/api/enrollGmailTrigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ merchantId })
        })

        if (response.ok) {
          const result = await response.json()
          
          // Check if agent document already exists to preserve settings
          const agentEnrollmentRef = doc(db, 'merchants', merchantId, 'agentsenrolled', 'customer-service')
          const existingDoc = await getDoc(agentEnrollmentRef)
          
          // Prepare the base agent data
          const baseAgentData = {
            agentId: 'customer-service',
            agentName: 'Customer Service Agent',
            agentType: 'gmail-trigger',
            status: 'active',
            enrolledAt: serverTimestamp(),
            triggerDetails: {
              triggerName: 'GMAIL_NEW_GMAIL_MESSAGE',
              app: 'gmail',
              triggerId: result.data?.triggerId,
              entityId: result.data?.entityId,
              triggerStatus: result.data?.status
            },
            description: 'Handle customer inquiries and support requests automatically with AI-powered responses',
            features: ['24/7 Support', 'Auto-responses', 'Ticket routing', 'Sentiment analysis'],
            integrations: ['gmail'],
            lastUpdated: serverTimestamp()
          }
          
          // If document exists, preserve existing settings, otherwise use defaults
          const agentData = existingDoc.exists() 
            ? {
                ...baseAgentData,
                settings: existingDoc.data().settings || {
                  autoReply: agentSettings.autoReply
                }
              }
            : {
                ...baseAgentData,
                settings: {
                  autoReply: agentSettings.autoReply
                }
              }
          
          try {
            await setDoc(agentEnrollmentRef, agentData)
            
            // Update local state
            setEnrolledAgents(prev => ({
              ...prev,
              'customer-service': agentData
            }))
            
            console.log('✅ Agent enrollment saved to Firestore')
          } catch (firestoreError) {
            console.error('❌ Failed to save enrollment to Firestore:', firestoreError)
            // Don't fail the whole operation if Firestore save fails
          }
          
          toast({
            title: "Customer Service Agent Connected!",
            description: "Gmail trigger has been enrolled successfully."
          })
          
          // Close the modal
          setIsCustomerServiceModalOpen(false)
        } else {
          const error = await response.json()
          throw new Error(error.error || error.message || 'Failed to enroll Gmail trigger')
        }
      }
    } catch (error) {
      console.error('Error handling agent action:', error)
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "Failed to perform agent action. Please try again.",
        variant: "destructive"
      })
    } finally {
      // Remove loading state
      setConnectingAgents(prev => {
        const newSet = new Set(prev)
        newSet.delete(agent.id)
        return newSet
      })
    }
  }

  const handleEmailSummaryConnect = async () => {
    const agent = agentSections['Customer Service'].find(a => a.id === 'email-summary')
    if (!agent) return

    // Set loading state
    setConnectingAgents(prev => new Set([...prev, agent.id]))
    
    try {
      // Get merchantId from authenticated user
      if (!user?.uid) {
        throw new Error('User not authenticated')
      }
      
      const merchantId = user.uid
      const isEnrolled = enrolledAgents['email-summary']?.status === 'active'
      
      if (isEnrolled) {
        // Handle disconnect
        const agentEnrollmentRef = doc(db, 'merchants', merchantId, 'agentsenrolled', 'email-summary')
        await updateDoc(agentEnrollmentRef, {
          status: 'inactive',
          deactivatedAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        })
        
        // Update local state
        setEnrolledAgents(prev => ({
          ...prev,
          'email-summary': {
            ...prev['email-summary'],
            status: 'inactive'
          }
        }))
        
        toast({
          title: "Email Summary Agent Disconnected",
          description: "Agent has been deactivated successfully."
        })
      } else {
        // Handle connect - Email Summary Agent doesn't need special API calls like Gmail trigger
        const agentEnrollmentRef = doc(db, 'merchants', merchantId, 'agentsenrolled', 'email-summary')
        const existingDoc = await getDoc(agentEnrollmentRef)
        
        // Generate a unique schedule ID
        const scheduleId = `${merchantId}_email-summary_${Date.now()}`
        
        // Prepare the base agent data
        const baseAgentData = {
          agentId: 'email-summary',
          agentName: 'Email Summary Agent',
          agentType: 'email-summary',
          status: 'active',
          enrolledAt: serverTimestamp(),
          description: 'Summarise and analyse your email communications for better customer insights',
          features: ['Daily summaries', 'Priority detection', 'Action items', 'Thread analysis'],
          integrations: ['gmail'],
          lastUpdated: serverTimestamp(),
          scheduleId: scheduleId // Store reference to schedule document
        }
        
        // If document exists, preserve existing settings, otherwise use defaults
        const agentData = existingDoc.exists() 
          ? {
              ...baseAgentData,
              settings: existingDoc.data().settings || emailSummarySettings
            }
          : {
              ...baseAgentData,
              settings: emailSummarySettings
            }
        
        await setDoc(agentEnrollmentRef, agentData)
        
        // Also save schedule data to top-level agentschedule collection
        const scheduleRef = doc(db, 'agentschedule', scheduleId)
        const scheduleData = {
          merchantId: merchantId,
          agentname: 'email-summary',
          agentId: 'email-summary',
          agentName: 'Email Summary Agent',
          schedule: agentData.settings.schedule,
          enabled: agentData.settings.enabled,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        }
        
        await setDoc(scheduleRef, scheduleData)
        
        // Update local state
        setEnrolledAgents(prev => ({
          ...prev,
          'email-summary': agentData
        }))
        
        toast({
          title: "Email Summary Agent Connected!",
          description: "Agent has been activated successfully."
        })
        
        // Close the modal
        setIsEmailSummaryModalOpen(false)
      }
    } catch (error) {
      console.error('Error handling Email Summary agent action:', error)
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "Failed to perform agent action. Please try again.",
        variant: "destructive"
      })
    } finally {
      // Remove loading state
      setConnectingAgents(prev => {
        const newSet = new Set(prev)
        newSet.delete(agent.id)
        return newSet
      })
    }
  }

  // Sample agent logs data - Remove this section
  const statuses = [
    { id: '1', name: 'Success', color: '#10B981' },
    { id: '2', name: 'Failed', color: '#EF4444' },
    { id: '3', name: 'Running', color: '#F59E0B' },
    { id: '4', name: 'Scheduled', color: '#6B7280' },
  ]

  const agentsForLogs = [
    { id: '1', name: 'Customer Service Agent', avatar: '/gmail.png' },
    { id: '2', name: 'Email Summary Agent', avatar: '/gmail.png' },
    { id: '3', name: 'Sales Analysis Agent', avatar: '/square.png' },
  ]

  const sampleLogs = Array.from({ length: 25 }).map((_, index) => ({
    id: `log-${index + 1}`,
    agent: agentsForLogs[index % agentsForLogs.length],
    executedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
    duration: Math.floor(Math.random() * 300) + 5, // 5-305 seconds
    status: statuses[Math.floor(Math.random() * statuses.length)],
    tasksCompleted: Math.floor(Math.random() * 20) + 1,
    message: index % 4 === 1 ? 'Rate limit exceeded' : index % 7 === 2 ? 'Authentication failed' : 'Completed successfully',
    type: ['Scheduled', 'Manual', 'Triggered'][Math.floor(Math.random() * 3)],
  }))

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return '#10B981'
      case 'failed':
      case 'error':
        return '#EF4444'
      case 'running':
      case 'in_progress':
        return '#F59E0B'
      default:
        return '#6B7280'
    }
  }

  // Helper function to get agent avatar
  const getAgentAvatar = (agentname: string) => {
    if (agentname?.toLowerCase().includes('customer') || agentname?.toLowerCase().includes('email')) {
      return '/gmail.png'
    } else if (agentname?.toLowerCase().includes('sales') || agentname?.toLowerCase().includes('square')) {
      return '/square.png'
    }
    return '/gmail.png' // default
  }

  // Define table columns for agent logs
  const logColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'agentname',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Agent" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={getAgentAvatar(row.original.agentname)} />
              <AvatarFallback className="text-xs">
                {row.original.agentname?.slice(0, 2) || 'AG'}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background"
              style={{
                backgroundColor: getStatusColor(row.original.status),
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{row.original.agentname || 'Unknown Agent'}</div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <span>{row.original.toolsExecuted || 0} tools executed</span>
              <ChevronRightIcon size={12} />
              <span>{row.original.successfulTools || 0} successful</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'executedAt',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Executed At" />
      ),
      cell: ({ row }) => {
        const executedAt = row.original.executedAt
        if (!executedAt) return 'Unknown'
        
        // Handle Firestore timestamp
        const date = executedAt.toDate ? executedAt.toDate() : new Date(executedAt)
        return new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date)
      },
    },
    {
      accessorKey: 'toolsCalled',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Tools Called" />
      ),
      cell: ({ row }) => {
        const toolsCalled = row.original.toolsCalled || []
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{toolsCalled.length} tools</span>
            {toolsCalled.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {toolsCalled.slice(0, 2).map((tool: any, index: number) => {
                  // Handle different possible structures
                  let toolName = ''
                  if (typeof tool === 'string') {
                    toolName = tool
                  } else if (tool && typeof tool === 'object') {
                    toolName = tool.name || tool.id || 'Unknown Tool'
                  } else {
                    toolName = 'Unknown Tool'
                  }
                  
                  return (
                    <span key={index} className="block truncate max-w-32" title={toolName}>
                      {toolName}
                    </span>
                  )
                })}
                {toolsCalled.length > 2 && (
                  <span>+{toolsCalled.length - 2} more</span>
                )}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.status || 'unknown'
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: getStatusColor(status) }}
            />
            <span className="text-sm font-medium capitalize">{status}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'details',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Connected Apps" />
      ),
      cell: ({ row }) => {
        const connectedApps = row.original.details?.connectedApps || []
        if (connectedApps.length === 0) return <span className="text-xs text-muted-foreground">None</span>
        
        return (
          <div className="flex items-center gap-1">
            {connectedApps.slice(0, 3).map((app: string, index: number) => (
              <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                {app}
              </div>
            ))}
            {connectedApps.length > 3 && (
              <span className="text-xs text-muted-foreground">+{connectedApps.length - 3}</span>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {!showLogsView ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsCreateAgentModalOpen(true)}
                className="rounded-md gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Agent
              </Button>
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
            </>
          ) : (
            <p className="text-sm text-gray-600">{agentLogs.length} total executions</p>
          )}
        </div>
        
        {/* Logs Tab on the right */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              !showLogsView
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => setShowLogsView(false)}
          >
            Agents
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              showLogsView
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => setShowLogsView(true)}
          >
            Logs
          </button>
        </div>
      </div>

      {/* Content with fade transition */}
      <div className={cn(
        "transition-opacity duration-300 ease-in-out",
        "opacity-100"
      )}>
        {!showLogsView ? (
          <div className="animate-in fade-in-0 duration-300">
      {/* Agents Sections */}
      <div className="space-y-8">
        {Object.entries(agentSections).map(([sectionName, agents]) => (
          <div key={sectionName} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-medium text-gray-900">{sectionName}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className={cn(
                  "bg-gray-50 border border-gray-200 rounded-md p-5 flex flex-col hover:border-gray-300 transition-colors",
                  agent.status === 'coming-soon' && "opacity-60 grayscale"
                )}>
                  {/* Header with title and button */}
                  <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <h3 className="text-base font-medium text-gray-900">{agent.name}</h3>
                          </div>
                    <div className="flex items-center gap-2 ml-3">
                      {(() => {
                        const isEnrolled = enrolledAgents[agent.id]?.status === 'active'
                        const isConnecting = connectingAgents.has(agent.id)
                        const isComingSoon = agent.status === 'coming-soon'
                        
                        return (
                          <>
                            {/* Configure button - only show when enrolled */}
                            {isEnrolled && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="rounded-md h-7 w-7 p-0"
                                onClick={() => handleAgentAction(agent)}
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {/* Main connect/connected button */}
                            <Button 
                              size="sm" 
                              variant={isEnrolled ? 'outline' : (agent.status === 'active' ? 'default' : 'outline')}
                              disabled={isComingSoon || isConnecting || !user}
                              className={cn(
                                "rounded-md text-xs px-3 py-1 h-7",
                                isEnrolled && "bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                              )}
                              onClick={() => !isEnrolled ? handleAgentAction(agent) : undefined}
                            >
                              {isConnecting 
                                      ? 'Connecting...' 
                                : isEnrolled 
                                        ? 'Connected'
                                  : (agent.status === 'active' ? 'Connect' : 'Coming Soon')
                              }
                            </Button>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 flex-1 leading-relaxed">{agent.description}</p>

                  {/* Integration Logos - Bottom */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <TooltipProvider>
                      {/* Required Integrations */}
                      <div className="flex gap-1.5">
                        {(agent.requiredIntegrations || agent.integrations).map((integration, index) => (
                          <Tooltip key={`required-${index}`}>
                            <TooltipTrigger asChild>
                              <div className="w-6 h-6 bg-gray-50 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-help">
                                {integration === 'vault.png' ? (
                                  <FileText className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <Image
                                    src={`/${integration}`}
                                    alt={integration.split('.')[0]}
                                    width={16}
                                    height={16}
                                    className="object-contain"
                                  />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-700">
                              <p>{integrationNames[integration] || integration.split('.')[0]} (Required)</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>

                      {/* Separator */}
                      {agent.optionalIntegrations && agent.optionalIntegrations.length > 0 && (
                        <>
                          <div className="w-px h-4 bg-gray-300"></div>
                          
                          {/* Optional Integrations */}
                          <div className="flex gap-1.5">
                            {agent.optionalIntegrations.map((integration, index) => (
                              <Tooltip key={`optional-${index}`}>
                                <TooltipTrigger asChild>
                                  <div className="w-6 h-6 bg-gray-50 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-help opacity-60">
                                    {integration === 'vault.png' ? (
                                      <FileText className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <Image
                                        src={`/${integration}`}
                                        alt={integration.split('.')[0]}
                                        width={16}
                                        height={16}
                                        className="object-contain"
                                      />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-700">
                                  <p>{integrationNames[integration] || integration.split('.')[0]} (Optional)</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </>
                      )}
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in-0 duration-300">
            {/* Logs View */}
            <div className="space-y-4">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading logs...</span>
                </div>
              ) : agentLogs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No agent execution logs found.</p>
                </div>
              ) : (
                /* Logs Table */
                <div className="border border-gray-200 rounded-md bg-white">
                  <TableProvider columns={logColumns} data={agentLogs}>
                    <TableHeader>
                      {({ headerGroup }) => (
                        <TableHeaderGroup key={headerGroup.id} headerGroup={headerGroup}>
                          {({ header }) => <TableHead key={header.id} header={header} />}
                        </TableHeaderGroup>
                      )}
                    </TableHeader>
                    <TableBody>
                      {({ row }) => (
                        <TableRow key={row.id} row={row}>
                          {({ cell }) => <TableCell key={cell.id} cell={cell} />}
                        </TableRow>
                      )}
                    </TableBody>
                  </TableProvider>
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Customer Service Agent Details Modal */}
      <Dialog open={isCustomerServiceModalOpen} onOpenChange={setIsCustomerServiceModalOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden p-0">
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          <div className="flex h-full">
            {/* Main Content - Left Section */}
            <div className="flex-1 flex flex-col h-full p-6 pr-4 overflow-y-auto">
              <DialogHeader className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-xl font-semibold">Customer Service Agent</DialogTitle>
                    {enrolledAgents['customer-service']?.status === 'active' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600 font-medium">Connected</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConfiguration(!showConfiguration)}
                      className="rounded-md"
                    >
                      {showConfiguration ? 'Back to Overview' : 'Configuration'}
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Main Content */}
              <div className="space-y-6">
                {!showConfiguration ? (
                  <>
                    {/* Agent Description */}
                    <div>
                      <h3 className="text-base font-medium mb-3">How this agent works</h3>
                      <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">1.</span>
                          <span>Receives and analyses incoming emails to determine if they're customer inquiries based on your business services</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">2.</span>
                          <span>Reviews your agent settings and documents in your customer service vault</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">3.</span>
                          <span>Generates an appropriate response using your business context and guidelines</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">4.</span>
                          <span>If human approval is required, sends the response to your agent inbox for review. If not, automatically replies to the customer</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Configuration Settings with Tabs */}
                    <div className="h-full">
                      <h3 className="text-base font-medium mb-4">Agent Configuration</h3>
                      
                      <Tabs value={activeConfigTab} onValueChange={setActiveConfigTab} className="w-full">
                        <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mb-6">
                          <button
                            onClick={() => setActiveConfigTab("general")}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                              activeConfigTab === "general"
                                ? "text-gray-800 bg-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-200/70"
                            )}
                          >
                            <Settings className="h-3 w-3" />
                            General
                          </button>
                          <button
                            onClick={() => setActiveConfigTab("hours")}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                              activeConfigTab === "hours"
                                ? "text-gray-800 bg-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-200/70"
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            Business Hours
                          </button>
                          <button
                            onClick={() => setActiveConfigTab("context")}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                              activeConfigTab === "context"
                                ? "text-gray-800 bg-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-200/70"
                            )}
                          >
                            <FileText className="h-3 w-3" />
                            Business Context
                          </button>
                          <button
                            onClick={() => setActiveConfigTab("forbidden")}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                              activeConfigTab === "forbidden"
                                ? "text-gray-800 bg-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-200/70"
                            )}
                          >
                            <X className="h-3 w-3" />
                            Forbidden
                          </button>
                          <button
                            onClick={() => setActiveConfigTab("advanced")}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                              activeConfigTab === "advanced"
                                ? "text-gray-800 bg-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-200/70"
                            )}
                          >
                            <Brain className="h-3 w-3" />
                            Advanced
                          </button>
                          <button
                            onClick={() => setActiveConfigTab("test")}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                              activeConfigTab === "test"
                                ? "text-gray-800 bg-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-200/70"
                            )}
                          >
                            <MessageSquare className="h-3 w-3" />
                            Test
                          </button>
                        </div>
                        
                        <TabsContent value="general" className="space-y-4 mt-6">
                          <div className="bg-gray-50 p-4 rounded-md space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="auto-reply" className="text-sm font-medium">Auto Reply</Label>
                                <p className="text-xs text-gray-600">
                                  {agentSettings.autoReply 
                                    ? "Automatically respond to incoming emails" 
                                    : "Responses will be sent to your agent inbox for approval"
                                  }
                                </p>
                              </div>
                              <Switch
                                id="auto-reply"
                                checked={agentSettings.autoReply}
                                onCheckedChange={(checked) => 
                                  setAgentSettings(prev => ({ ...prev, autoReply: checked }))
                                }
                              />
                            </div>
                            
                            <Separator />
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="vault-access" className="text-sm font-medium">Allow Access to Customer Service Vault</Label>
                                <p className="text-xs text-gray-600">
                                  {agentSettings.vaultAccess 
                                    ? "Agent can access files and documents in your customer service vault" 
                                    : "Agent will not use vault files for responses"
                                  }
                                </p>
                              </div>
                              <Switch
                                id="vault-access"
                                checked={agentSettings.vaultAccess}
                                onCheckedChange={(checked) => 
                                  setAgentSettings(prev => ({ ...prev, vaultAccess: checked }))
                                }
                              />
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <Label htmlFor="communication-style" className="text-sm font-medium">Communication Style</Label>
                              <p className="text-xs text-gray-600 mb-3">Choose how the agent should communicate with customers</p>
                              <Select
                                value={agentSettings.communicationStyle}
                                onValueChange={(value) => 
                                  setAgentSettings(prev => ({ ...prev, communicationStyle: value }))
                                }
                              >
                                <SelectTrigger className="w-full rounded-md">
                                  <SelectValue placeholder="Select communication style" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="professional">Professional</SelectItem>
                                  <SelectItem value="friendly">Friendly</SelectItem>
                                  <SelectItem value="casual">Casual</SelectItem>
                                  <SelectItem value="relaxed">Relaxed</SelectItem>
                                  <SelectItem value="formal">Formal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <Label htmlFor="greeting" className="text-sm font-medium">Email Greeting</Label>
                              <p className="text-xs text-gray-600 mb-3">How the agent should start emails</p>
                              <Input
                                id="greeting"
                                placeholder="e.g., Hi there, Hello, Dear valued customer"
                                value={agentSettings.greeting}
                                onChange={(e) => 
                                  setAgentSettings(prev => ({ ...prev, greeting: e.target.value }))
                                }
                                className="rounded-md"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="sign-off" className="text-sm font-medium">Email Sign-off</Label>
                              <p className="text-xs text-gray-600 mb-3">How the agent should end emails</p>
                              <Input
                                id="sign-off"
                                placeholder="e.g., Best regards, Kind regards, Thank you"
                                value={agentSettings.signOff}
                                onChange={(e) => 
                                  setAgentSettings(prev => ({ ...prev, signOff: e.target.value }))
                                }
                                className="rounded-md"
                              />
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="hours" className="space-y-4 mt-6">
                          <div className="bg-gray-50 p-4 rounded-md space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="business-hours" className="text-sm font-medium">Enable Business Hours</Label>
                                <p className="text-xs text-gray-600">Only respond during specified business hours</p>
                              </div>
                              <Switch
                                id="business-hours"
                                checked={agentSettings.businessHours.enabled}
                                onCheckedChange={(checked) => 
                                  setAgentSettings(prev => ({ 
                                    ...prev, 
                                    businessHours: { ...prev.businessHours, enabled: checked }
                                  }))
                                }
                              />
                            </div>
                            {agentSettings.businessHours.enabled && (
                              <>
                                <Separator />
                                <div className="space-y-3">
                                  <Label className="text-sm font-medium">Operating Hours</Label>
                                  {Object.entries(agentSettings.businessHours)
                                    .filter(([key]) => !['enabled', 'timezone'].includes(key))
                                    .map(([day, hours]: [string, any]) => (
                                    <div key={day} className="flex items-center gap-3">
                                      <div className="w-20 text-xs font-medium capitalize">{day}</div>
                                      <Switch
                                        checked={hours.enabled}
                                        onCheckedChange={(checked) => 
                                          setAgentSettings(prev => ({
                                            ...prev,
                                            businessHours: {
                                              ...prev.businessHours,
                                              [day]: { ...hours, enabled: checked }
                                            }
                                          }))
                                        }
                                      />
                                      {hours.enabled && (
                                        <>
                                          <Input
                                            type="time"
                                            value={hours.start}
                                            onChange={(e) => 
                                              setAgentSettings(prev => ({
                                                ...prev,
                                                businessHours: {
                                                  ...prev.businessHours,
                                                  [day]: { ...hours, start: e.target.value }
                                                }
                                              }))
                                            }
                                            className="w-20 text-xs rounded-md"
                                          />
                                          <span className="text-xs">to</span>
                                          <Input
                                            type="time"
                                            value={hours.end}
                                            onChange={(e) => 
                                              setAgentSettings(prev => ({
                                                ...prev,
                                                businessHours: {
                                                  ...prev.businessHours,
                                                  [day]: { ...hours, end: e.target.value }
                                                }
                                              }))
                                            }
                                            className="w-20 text-xs rounded-md"
                                          />
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="context" className="space-y-4 mt-6">
                          <div className="bg-gray-50 p-4 rounded-md space-y-4">
                            <div>
                              <Label htmlFor="business-context" className="text-sm font-medium">Business Context</Label>
                              <p className="text-xs text-gray-600 mb-3">Provide context about your business to help the agent respond appropriately</p>
                              <Textarea
                                id="business-context"
                                placeholder="e.g., We're a boutique coffee shop specialising in organic, fair-trade beans. We offer brewing classes and have a loyalty program..."
                                value={agentSettings.businessContext}
                                onChange={(e) => 
                                  setAgentSettings(prev => ({ ...prev, businessContext: e.target.value }))
                                }
                                className="rounded-md min-h-[120px]"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="quick-add-rules" className="text-sm font-medium">Quick Add Rules</Label>
                              <p className="text-xs text-gray-600 mb-3">Type anything in any format - we'll handle the rest</p>
                              <div className="flex gap-2 mb-3">
                                <Input
                                  id="quick-add-rules"
                                  placeholder="e.g., Always mention our 30-day return policy, Never discuss pricing over email..."
                                  value={newRule}
                                  onChange={(e) => setNewRule(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && newRule.trim()) {
                                      setBusinessRules(prev => [...prev, newRule.trim()])
                                      setNewRule('')
                                    }
                                  }}
                                  className="rounded-md flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (newRule.trim()) {
                                      setBusinessRules(prev => [...prev, newRule.trim()])
                                      setNewRule('')
                                    }
                                  }}
                                  className="rounded-md"
                                >
                                  Add
                                </Button>
                              </div>
                              
                              {businessRules.length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium text-gray-600">Added Rules:</Label>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {businessRules.map((rule, index) => (
                                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                        <span className="text-xs text-gray-700 flex-1">{rule}</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setBusinessRules(prev => prev.filter((_, i) => i !== index))
                                          }}
                                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="forbidden" className="space-y-4 mt-6">
                          <div className="bg-gray-50 p-4 rounded-md space-y-4">
                            <div>
                              <Label htmlFor="quick-add-forbidden" className="text-sm font-medium">Quick Add Forbidden Items</Label>
                              <p className="text-xs text-gray-600 mb-3">Type anything in any format - we'll handle the rest</p>
                              <div className="flex gap-2 mb-3">
                                <Input
                                  id="quick-add-forbidden"
                                  placeholder="e.g., Don't give medical advice, No competitor pricing, No delivery promises..."
                                  value={newForbiddenItem}
                                  onChange={(e) => setNewForbiddenItem(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && newForbiddenItem.trim()) {
                                      setForbiddenItems(prev => [...prev, newForbiddenItem.trim()])
                                      setNewForbiddenItem('')
                                    }
                                  }}
                                  className="rounded-md flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (newForbiddenItem.trim()) {
                                      setForbiddenItems(prev => [...prev, newForbiddenItem.trim()])
                                      setNewForbiddenItem('')
                                    }
                                  }}
                                  className="rounded-md"
                                >
                                  Add
                                </Button>
                              </div>
                              
                              {forbiddenItems.length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium text-gray-600">Added Forbidden Items:</Label>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {forbiddenItems.map((item, index) => (
                                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                        <span className="text-xs text-gray-700 flex-1">{item}</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setForbiddenItems(prev => prev.filter((_, i) => i !== index))
                                          }}
                                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="advanced" className="space-y-4 mt-6">
                          <div className="bg-gray-50 p-4 rounded-md space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="web-searching" className="text-sm font-medium">Allow Web Searching</Label>
                                <p className="text-xs text-gray-600">
                                  {agentSettings.webSearching 
                                    ? "Agent can search the web for up-to-date information when responding" 
                                    : "Agent will only use your business context and vault files"
                                  }
                                </p>
                              </div>
                              <Switch
                                id="web-searching"
                                checked={agentSettings.webSearching}
                                onCheckedChange={(checked) => 
                                  setAgentSettings(prev => ({ ...prev, webSearching: checked }))
                                }
                              />
                            </div>
                            
                            {agentSettings.webSearching && (
                              <>
                                <Separator />
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                  <div className="flex gap-2">
                                    <Brain className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-blue-900">Web Search Enabled</p>
                                      <p className="text-xs text-blue-700 mt-1">
                                        The agent will search for current information when needed, such as business hours, 
                                        product availability, or recent company updates. This helps provide more accurate and 
                                        up-to-date responses to customers.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                            
                            <Separator />
                            
                            {/* Lightspeed Integration */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center">
                                    <Image
                                      src="/lslogo.png"
                                      alt="Lightspeed"
                                      width={16}
                                      height={16}
                                      className="object-contain"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="lightspeed-integration" className="text-sm font-medium">Lightspeed Integration</Label>
                                    <p className="text-xs text-gray-600">Enable Lightspeed POS integration features</p>
                                  </div>
                                </div>
                                <Switch
                                  id="lightspeed-integration"
                                  checked={agentSettings.lightspeedIntegration.enabled}
                                  onCheckedChange={(checked) => 
                                    setAgentSettings(prev => ({ 
                                      ...prev, 
                                      lightspeedIntegration: { 
                                        ...prev.lightspeedIntegration, 
                                        enabled: checked,
                                        // Reset sub-options when disabled
                                        priceLookup: checked ? prev.lightspeedIntegration.priceLookup : false,
                                        inventoryLookup: checked ? prev.lightspeedIntegration.inventoryLookup : false
                                      }
                                    }))
                                  }
                                />
                              </div>
                              
                              {agentSettings.lightspeedIntegration.enabled && (
                                <div className="ml-8 space-y-2 border-l border-gray-200 pl-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <Label htmlFor="lightspeed-price" className="text-xs font-medium">Price Lookup</Label>
                                      <p className="text-xs text-gray-500">Allow agent to check product prices</p>
                                    </div>
                                    <Switch
                                      id="lightspeed-price"
                                      checked={agentSettings.lightspeedIntegration.priceLookup}
                                      onCheckedChange={(checked) => 
                                        setAgentSettings(prev => ({ 
                                          ...prev, 
                                          lightspeedIntegration: { 
                                            ...prev.lightspeedIntegration, 
                                            priceLookup: checked 
                                          }
                                        }))
                                      }
                                    />
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <Label htmlFor="lightspeed-inventory" className="text-xs font-medium">Inventory Lookup</Label>
                                      <p className="text-xs text-gray-500">Allow agent to check product availability</p>
                                    </div>
                                    <Switch
                                      id="lightspeed-inventory"
                                      checked={agentSettings.lightspeedIntegration.inventoryLookup}
                                      onCheckedChange={(checked) => 
                                        setAgentSettings(prev => ({ 
                                          ...prev, 
                                          lightspeedIntegration: { 
                                            ...prev.lightspeedIntegration, 
                                            inventoryLookup: checked 
                                          }
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <Separator />
                            
                            {/* Square Integration */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center">
                                    <Image
                                      src="/square.png"
                                      alt="Square"
                                      width={16}
                                      height={16}
                                      className="object-contain"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="square-integration" className="text-sm font-medium">Square Integration</Label>
                                    <p className="text-xs text-gray-600">Enable Square POS integration features</p>
                                  </div>
                                </div>
                                <Switch
                                  id="square-integration"
                                  checked={agentSettings.squareIntegration.enabled}
                                  onCheckedChange={(checked) => 
                                    setAgentSettings(prev => ({ 
                                      ...prev, 
                                      squareIntegration: { 
                                        ...prev.squareIntegration, 
                                        enabled: checked,
                                        // Reset sub-options when disabled
                                        priceLookup: checked ? prev.squareIntegration.priceLookup : false,
                                        inventoryLookup: checked ? prev.squareIntegration.inventoryLookup : false
                                      }
                                    }))
                                  }
                                />
                              </div>
                              
                              {agentSettings.squareIntegration.enabled && (
                                <div className="ml-8 space-y-2 border-l border-gray-200 pl-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <Label htmlFor="square-price" className="text-xs font-medium">Price Lookup</Label>
                                      <p className="text-xs text-gray-500">Allow agent to check product prices</p>
                                    </div>
                                    <Switch
                                      id="square-price"
                                      checked={agentSettings.squareIntegration.priceLookup}
                                      onCheckedChange={(checked) => 
                                        setAgentSettings(prev => ({ 
                                          ...prev, 
                                          squareIntegration: { 
                                            ...prev.squareIntegration, 
                                            priceLookup: checked 
                                          }
                                        }))
                                      }
                                    />
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <Label htmlFor="square-inventory" className="text-xs font-medium">Inventory Lookup</Label>
                                      <p className="text-xs text-gray-500">Allow agent to check product availability</p>
                                    </div>
                                    <Switch
                                      id="square-inventory"
                                      checked={agentSettings.squareIntegration.inventoryLookup}
                                      onCheckedChange={(checked) => 
                                        setAgentSettings(prev => ({ 
                                          ...prev, 
                                          squareIntegration: { 
                                            ...prev.squareIntegration, 
                                            inventoryLookup: checked 
                                          }
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="test" className="space-y-4 mt-6">
                          <div className="bg-gray-50 p-4 rounded-md space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Test Email Response</Label>
                              <p className="text-xs text-gray-600 mb-4">Send a test email to see how the agent would respond</p>
                              
                              <div className="space-y-4">
                                {/* From Field */}
                                <div>
                                  <Label htmlFor="test-from" className="text-xs font-medium">From</Label>
                                  <Input
                                    id="test-from"
                                    placeholder="customer@example.com"
                                    value={testEmail.from}
                                    onChange={(e) => setTestEmail(prev => ({ ...prev, from: e.target.value }))}
                                    className="rounded-md text-sm mt-1"
                                  />
                                </div>
                                
                                {/* Subject Field */}
                                <div>
                                  <Label htmlFor="test-subject" className="text-xs font-medium">Subject</Label>
                                  <Input
                                    id="test-subject"
                                    placeholder="Question about my order"
                                    value={testEmail.subject}
                                    onChange={(e) => setTestEmail(prev => ({ ...prev, subject: e.target.value }))}
                                    className="rounded-md text-sm mt-1"
                                  />
                                </div>
                                
                                {/* Email Body */}
                                <div>
                                  <Label htmlFor="test-body" className="text-xs font-medium">Email Body</Label>
                                  <Textarea
                                    id="test-body"
                                    placeholder="Hi, I placed an order yesterday but haven't received a confirmation email. Can you help me check the status? My order number is #12345. Thanks!"
                                    value={testEmail.body}
                                    onChange={(e) => setTestEmail(prev => ({ ...prev, body: e.target.value }))}
                                    className="rounded-md min-h-[100px] text-sm mt-1"
                                  />
                                </div>
                                
                                {/* Generate Response Button */}
                                <div className="flex justify-end">
                                  <Button
                                    onClick={() => {
                                      setTestEmail(prev => ({ ...prev, isGenerating: true }))
                                      // Simulate API call
                                      setTimeout(() => {
                                        setTestEmail(prev => ({ 
                                          ...prev, 
                                          isGenerating: false,
                                          response: `Hi there!\n\nThank you for reaching out about your order #12345. I'd be happy to help you check the status.\n\nI can see that your order was placed yesterday and is currently being processed in our warehouse. You should receive a confirmation email with tracking details within the next 2-4 hours.\n\nIf you don't receive the confirmation email by tomorrow morning, please don't hesitate to contact us again and we'll investigate further.\n\nIs there anything else I can help you with today?\n\nBest regards,\nCustomer Service Team`
                                        }))
                                      }, 2000)
                                    }}
                                    disabled={!testEmail.from || !testEmail.subject || !testEmail.body || testEmail.isGenerating}
                                    className="rounded-md"
                                  >
                                    {testEmail.isGenerating ? 'Generating Response...' : 'Generate Response'}
                                  </Button>
                                </div>
                                
                                {/* Response Area */}
                                {(testEmail.response || testEmail.isGenerating) && (
                                  <div>
                                    <Label className="text-xs font-medium">Agent Response</Label>
                                    <div className="mt-1 p-3 bg-white border border-gray-200 rounded-md min-h-[120px]">
                                      {testEmail.isGenerating ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                          Generating response...
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{testEmail.response}</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="w-px bg-gray-200"></div>

            {/* Right Sidebar */}
            <div className="w-80 p-6 pl-4 bg-gray-50 flex flex-col">
              {/* Integrations Section */}
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-3 text-gray-600">Integrations</h3>
                <div className="space-y-1">
                  <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center">
                        <Image
                          src="/gmail.png"
                          alt="Gmail"
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium">Gmail</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center">
                        <FileText className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium">Vault</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Files Section */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-600">Files in Vault</h3>
                  <button
                    onClick={() => router.push('/vault')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Manage vault files"
                  >
                    <ArrowUpRight className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <div className="space-y-1">
                  {[
                    { name: 'Customer Service Guide.pdf', type: 'PDF', size: '2.3 MB' },
                    { name: 'FAQ Template.docx', type: 'DOC', size: '1.1 MB' },
                    { name: 'Response Templates.txt', type: 'TXT', size: '45 KB' },
                    { name: 'Escalation Process.pdf', type: 'PDF', size: '890 KB' }
                  ].map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 hover:bg-white rounded-md transition-colors">
                      <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                        <FileText className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.type} • {file.size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connect Button Section - Fixed to bottom */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="space-y-3">
                  {showConfiguration ? (
                    <>
                    <Button
                      onClick={async () => {
                        if (!user?.uid) return
                        
                        try {
                          const agentRef = doc(db, 'merchants', user.uid, 'agentsenrolled', 'customer-service')
                          
                          // Update the agent configuration
                          await updateDoc(agentRef, {
                            settings: {
                              autoReply: agentSettings.autoReply,
                                vaultAccess: agentSettings.vaultAccess,
                                webSearching: agentSettings.webSearching,
                                lightspeedIntegration: agentSettings.lightspeedIntegration,
                                squareIntegration: agentSettings.squareIntegration,
                              businessHours: agentSettings.businessHours,
                              businessContext: agentSettings.businessContext,
                              greeting: agentSettings.greeting,
                              signOff: agentSettings.signOff,
                              communicationStyle: agentSettings.communicationStyle,
                              businessRules: businessRules,
                              forbiddenItems: forbiddenItems,
                              forbiddenResponses: agentSettings.forbiddenResponses
                            },
                            lastUpdated: serverTimestamp()
                          })
                          
                          toast({
                            title: "Configuration Saved",
                            description: "Agent settings have been updated successfully."
                          })
                          setShowConfiguration(false)
                        } catch (error) {
                          console.error('Error saving configuration:', error)
                          toast({
                            title: "Save Failed",
                            description: "Failed to save configuration. Please try again.",
                            variant: "destructive"
                          })
                        }
                      }}
                      className="w-full rounded-md"
                    >
                      Save Configuration
                    </Button>
                      {enrolledAgents['customer-service']?.status === 'active' && (
                        <Button
                          variant="destructive"
                          onClick={handleCustomerServiceConnect}
                          disabled={connectingAgents.has('customer-service')}
                          className="w-full rounded-md"
                        >
                          {connectingAgents.has('customer-service') ? 'Disconnecting...' : 'Disconnect Agent'}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {enrolledAgents['customer-service']?.status === 'active' ? (
                    <Button
                          variant="destructive"
                      onClick={handleCustomerServiceConnect}
                      disabled={connectingAgents.has('customer-service')}
                      className="w-full rounded-md"
                    >
                          {connectingAgents.has('customer-service') ? 'Disconnecting...' : 'Disconnect Agent'}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleCustomerServiceConnect}
                          disabled={connectingAgents.has('customer-service')}
                          className="w-full rounded-md"
                        >
                          {connectingAgents.has('customer-service') ? 'Connecting...' : 'Connect Agent'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Email Summary Agent Details Modal */}
      <Dialog open={isEmailSummaryModalOpen} onOpenChange={setIsEmailSummaryModalOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl h-[85vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden p-0">
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          <div className="flex h-full">
            {/* Main Content - Left Section */}
            <div className="flex-1 flex flex-col h-full p-6 pr-4 overflow-y-auto">
              <DialogHeader className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-xl font-semibold">Email Summary Agent</DialogTitle>
                    {enrolledAgents['email-summary']?.status === 'active' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600 font-medium">Connected</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmailSummaryConfiguration(!showEmailSummaryConfiguration)}
                      className="rounded-md"
                    >
                      {showEmailSummaryConfiguration ? 'Back to Overview' : 'Configuration'}
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Main Content */}
              <div className="space-y-6">
                {!showEmailSummaryConfiguration ? (
                  <>
                    {/* Objective Section */}
                    <div>
                      <h3 className="text-base font-medium mb-3">Objective</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Automatically analyse and summarise your email communications on a scheduled basis, providing insights into customer inquiries, priority issues, and key action items to help you stay on top of your business communications.
                      </p>
                    </div>

                    {/* How it works */}
                    <div>
                      <h3 className="text-base font-medium mb-3">How this agent works</h3>
                      <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">1.</span>
                          <span>Scans your Gmail inbox for the specified lookback period (1, 3, 7, or 30 days)</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">2.</span>
                          <span>Analyses email content, sender information, and identifies customer inquiries and business-related communications</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">3.</span>
                          <span>Generates a comprehensive summary including key themes, urgent items, and suggested actions</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">4.</span>
                          <span>Delivers the summary to your inbox at your scheduled time (daily, weekly, or custom schedule)</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Configuration Settings */}
                    <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <h3 className="text-base font-medium">Agent Configuration</h3>
                      
                      {/* Configuration Tabs */}
                      <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mb-6">
                        <button
                          onClick={() => setActiveConfigTab("general")}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                            activeConfigTab === "general"
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <Settings className="h-3 w-3" />
                          General
                        </button>
                        <button
                          onClick={() => setActiveConfigTab("schedule")}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                            activeConfigTab === "schedule"
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          Schedule
                        </button>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md space-y-4">
                        {activeConfigTab === "general" ? (
                          <>
                            {/* Enable/Disable */}
                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="email-summary-enabled" className="text-sm font-medium">Enable Email Summaries</Label>
                                <p className="text-xs text-gray-600">
                                  {emailSummarySettings.enabled 
                                    ? "Automated email summaries will be sent according to your schedule" 
                                    : "Email summaries are disabled"
                                  }
                                </p>
                              </div>
                              <Switch
                                id="email-summary-enabled"
                                checked={emailSummarySettings.enabled}
                                onCheckedChange={(checked) => 
                                  setEmailSummarySettings(prev => ({ ...prev, enabled: checked }))
                                }
                              />
                            </div>

                            <Separator />

                            {/* Lookback Period */}
                            <div>
                              <Label htmlFor="lookback-period" className="text-sm font-medium">Lookback Period</Label>
                              <p className="text-xs text-gray-600 mb-3">How many days of emails to include in the summary</p>
                              <Select
                                value={emailSummarySettings.lookbackPeriod}
                                onValueChange={(value) => 
                                  setEmailSummarySettings(prev => ({ ...prev, lookbackPeriod: value }))
                                }
                              >
                                <SelectTrigger className="w-full rounded-md">
                                  <SelectValue placeholder="Select lookback period" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Today's emails (1 day)</SelectItem>
                                  <SelectItem value="3">Last 3 days</SelectItem>
                                  <SelectItem value="7">Last 7 days</SelectItem>
                                  <SelectItem value="14">Last 2 weeks</SelectItem>
                                  <SelectItem value="30">Last 30 days</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Separator />

                            {/* Summary Format */}
                            <div>
                              <Label htmlFor="email-format" className="text-sm font-medium">Summary Format</Label>
                              <p className="text-xs text-gray-600 mb-3">Choose how detailed you want the summaries to be</p>
                              <Select
                                value={emailSummarySettings.emailFormat}
                                onValueChange={(value) => 
                                  setEmailSummarySettings(prev => ({ ...prev, emailFormat: value }))
                                }
                              >
                                <SelectTrigger className="w-full rounded-md">
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="summary">Brief Summary</SelectItem>
                                  <SelectItem value="detailed">Detailed Analysis</SelectItem>
                                  <SelectItem value="bullets">Bullet Points</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Separator />

                            {/* Additional Options */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="priority-only" className="text-sm font-medium">Priority Emails Only</Label>
                                  <p className="text-xs text-gray-600">Only include emails marked as important or urgent</p>
                                </div>
                                <Switch
                                  id="priority-only"
                                  checked={emailSummarySettings.priorityOnly}
                                  onCheckedChange={(checked) => 
                                    setEmailSummarySettings(prev => ({ ...prev, priorityOnly: checked }))
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="include-attachments" className="text-sm font-medium">Include Attachment Info</Label>
                                  <p className="text-xs text-gray-600">Mention emails with attachments in the summary</p>
                                </div>
                                <Switch
                                  id="include-attachments"
                                  checked={emailSummarySettings.includeAttachments}
                                  onCheckedChange={(checked) => 
                                    setEmailSummarySettings(prev => ({ ...prev, includeAttachments: checked }))
                                  }
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Schedule Configuration */}
                            {emailSummarySettings.enabled ? (
                              <>
                                {/* Schedule Frequency */}
                                <div>
                                  <Label htmlFor="schedule-frequency" className="text-sm font-medium">Schedule Frequency</Label>
                                  <p className="text-xs text-gray-600 mb-3">How often to send email summaries</p>
                                  <Select
                                    value={emailSummarySettings.schedule.frequency}
                                    onValueChange={(value) => 
                                      setEmailSummarySettings(prev => ({ 
                                        ...prev, 
                                        schedule: { ...prev.schedule, frequency: value }
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-full rounded-md">
                                      <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="daily">Daily</SelectItem>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                      <SelectItem value="custom">Custom Days</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <Separator />

                                {/* Time Selection */}
                                <div>
                                  <Label htmlFor="schedule-time" className="text-sm font-medium">Delivery Time</Label>
                                  <p className="text-xs text-gray-600 mb-3">What time to send the summary</p>
                                  <Input
                                    id="schedule-time"
                                    type="time"
                                    value={emailSummarySettings.schedule.time}
                                    onChange={(e) => 
                                      setEmailSummarySettings(prev => ({ 
                                        ...prev, 
                                        schedule: { ...prev.schedule, time: e.target.value }
                                      }))
                                    }
                                    className="w-32 rounded-md"
                                  />
                                </div>

                                {/* Days Selection for Weekly/Custom */}
                                {(emailSummarySettings.schedule.frequency === 'weekly' || emailSummarySettings.schedule.frequency === 'custom') && (
                                  <>
                                    <Separator />
                                    <div>
                                      <Label className="text-sm font-medium">
                                        {emailSummarySettings.schedule.frequency === 'weekly' ? 'Day of Week' : 'Days to Send'}
                                      </Label>
                                      <p className="text-xs text-gray-600 mb-3">
                                        {emailSummarySettings.schedule.frequency === 'weekly' 
                                          ? 'Which day of the week to send the summary'
                                          : 'Select which days to send summaries'
                                        }
                                      </p>
                                      <div className="grid grid-cols-4 gap-2">
                                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                          <label key={day} className="flex items-center space-x-2 text-xs">
                                            <input
                                              type={emailSummarySettings.schedule.frequency === 'weekly' ? 'radio' : 'checkbox'}
                                              name={emailSummarySettings.schedule.frequency === 'weekly' ? 'weekday' : 'days'}
                                              checked={emailSummarySettings.schedule.days.includes(day)}
                                              onChange={(e) => {
                                                if (emailSummarySettings.schedule.frequency === 'weekly') {
                                                  setEmailSummarySettings(prev => ({ 
                                                    ...prev, 
                                                    schedule: { ...prev.schedule, days: [day] }
                                                  }))
                                                } else {
                                                  setEmailSummarySettings(prev => ({ 
                                                    ...prev, 
                                                    schedule: { 
                                                      ...prev.schedule, 
                                                      days: e.target.checked 
                                                        ? [...prev.schedule.days, day]
                                                        : prev.schedule.days.filter(d => d !== day)
                                                    }
                                                  }))
                                                }
                                              }}
                                              className="rounded"
                                            />
                                            <span className="capitalize">{day.slice(0, 3)}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-sm text-gray-500">Enable email summaries in the General tab to configure scheduling options.</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="w-px bg-gray-200"></div>

            {/* Right Sidebar */}
            <div className="w-80 p-6 pl-4 bg-gray-50 flex flex-col">
              {/* Integrations Section */}
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-3 text-gray-600">Integrations</h3>
                <div className="space-y-1">
                  <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center">
                        <Image
                          src="/gmail.png"
                          alt="Gmail"
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium">Gmail</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Summary Info */}
              {emailSummarySettings.enabled && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium mb-3 text-gray-600">Next Summary</h3>
                  <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Frequency:</span>
                        <span className="text-xs font-medium capitalize">{emailSummarySettings.schedule.frequency}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Time:</span>
                        <span className="text-xs font-medium">{emailSummarySettings.schedule.time}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Lookback:</span>
                        <span className="text-xs font-medium">{emailSummarySettings.lookbackPeriod} day{emailSummarySettings.lookbackPeriod !== '1' ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Connect Button Section */}
              <div className="border-t border-gray-200 pt-4 mt-auto">
                <div className="space-y-3">
                  {showEmailSummaryConfiguration ? (
                    <Button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        if (!user?.uid) return
                        
                        try {
                          const agentRef = doc(db, 'merchants', user.uid, 'agentsenrolled', 'email-summary')
                          
                          // Get the current document to preserve other fields
                          const currentDoc = await getDoc(agentRef)
                          const currentData = currentDoc.exists() ? currentDoc.data() : {}
                          
                          // Completely overwrite the document with new settings
                          await setDoc(agentRef, {
                            ...currentData,
                            settings: emailSummarySettings, // This will completely replace the settings object
                            lastUpdated: serverTimestamp()
                          })
                          
                          // Also update the schedule in the top-level agentschedule collection if it exists
                          if (currentData.scheduleId) {
                            const scheduleRef = doc(db, 'agentschedule', currentData.scheduleId)
                            await setDoc(scheduleRef, {
                              merchantId: user.uid,
                              agentname: 'email-summary',
                              agentId: 'email-summary',
                              agentName: 'Email Summary Agent',
                              schedule: emailSummarySettings.schedule,
                              enabled: emailSummarySettings.enabled,
                              createdAt: serverTimestamp(),
                              lastUpdated: serverTimestamp()
                            })
                          }
                          
                          toast({
                            title: "Configuration Saved",
                            description: "Email Summary Agent settings have been updated successfully."
                          })
                          setShowEmailSummaryConfiguration(false)
                        } catch (error) {
                          console.error('Error saving Email Summary configuration:', error)
                          toast({
                            title: "Save Failed",
                            description: "Failed to save configuration. Please try again.",
                            variant: "destructive"
                          })
                        }
                      }}
                      className="w-full rounded-md"
                    >
                      Save Configuration
                    </Button>
                  ) : null}
                  
                  {enrolledAgents['email-summary']?.status === 'active' ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleEmailSummaryConnect}
                      disabled={connectingAgents.has('email-summary')}
                      className="w-full rounded-md"
                    >
                      {connectingAgents.has('email-summary') ? 'Disconnecting...' : 'Disconnect Agent'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleEmailSummaryConnect}
                      disabled={connectingAgents.has('email-summary')}
                      className="w-full rounded-md"
                    >
                      {connectingAgents.has('email-summary') ? 'Connecting...' : 'Connect Agent'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Create Agent Modal */}
      <Dialog open={isCreateAgentModalOpen} onOpenChange={setIsCreateAgentModalOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden p-0">
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          <div className="flex h-full">
            {/* Main Content - Left Section */}
            <div className="flex-1 flex flex-col h-full p-6 pr-4 overflow-y-auto">
              <DialogHeader className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isEditingAgentName ? (
                      <Input
                        value={createAgentForm.name || 'New Agent'}
                        onChange={(e) => setCreateAgentForm(prev => ({ ...prev, name: e.target.value }))}
                        onBlur={() => setIsEditingAgentName(false)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') {
                            setIsEditingAgentName(false)
                          }
                        }}
                        className="text-xl font-semibold border-0 p-0 h-auto focus:ring-0 bg-transparent"
                        autoFocus
                      />
                    ) : (
                      <DialogTitle 
                        className="text-xl font-semibold cursor-text hover:bg-gray-100 px-2 py-1 rounded-md"
                        onDoubleClick={() => setIsEditingAgentName(true)}
                      >
                        {createAgentForm.name || 'New Agent'}
                      </DialogTitle>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!user?.uid) {
                          toast({
                              title: "Authentication Required",
                              description: "Please sign in to generate agent ideas.",
                              variant: "destructive"
                            })
                            return
                          }

                          try {
                            setIsLoadingAgentIdeas(true) // Start loading
                            console.log('🚀 [Agent Ideas] Starting agent ideas generation...')
                            
                            toast({
                              title: "Generating Agent Ideas",
                              description: "AI is analysing your business and available tools...",
                            })

                            // Call Firebase function
                            const functions = getFunctions()
                            const generateAgentIdeas = httpsCallable(functions, 'generateAgentIdeas')
                            
                            const result = await generateAgentIdeas({
                              merchantId: user.uid
                            })

                            console.log('✅ [Agent Ideas] Full Firebase function result:', result)
                            const data = result.data as any
                            console.log('✅ [Agent Ideas] Firebase function response data:', data)
                            console.log('✅ [Agent Ideas] Full response structure:', JSON.stringify(data, null, 2))

                            // Store the agent ideas response
                            setAgentIdeas(data)

                            // Handle the response - you can customize this based on what the function returns
                            if (data && data.agentIdeas) {
                              toast({
                                title: "Agent Ideas Generated!",
                                description: `Found ${data.agentIdeas.length} agent ideas for your business.`,
                              })
                              
                              // You can add logic here to display the ideas in a modal or update the UI
                              console.log('Generated agent ideas:', data.agentIdeas)
                            } else {
                              toast({
                                title: "Ideas Generated",
                                description: "Agent ideas have been generated successfully.",
                              })
                            }
                          } catch (error) {
                            console.error('❌ [Agent Ideas] Error generating agent ideas:', error)
                            toast({
                              title: "Generation Failed",
                              description: error instanceof Error ? error.message : "Failed to generate agent ideas. Please try again.",
                              variant: "destructive"
                            })
                          } finally {
                            setIsLoadingAgentIdeas(false) // Stop loading
                          }
                        }}
                        disabled={isLoadingAgentIdeas}
                        className="rounded-md gap-2"
                      >
                        {isLoadingAgentIdeas ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        ) : (
                          <Brain className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                        className="rounded-md gap-2"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      
                      {/* Schedule Dropdown */}
                      {showScheduleDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-20 p-4">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Frequency</Label>
                              <Select
                                value={createAgentSchedule.frequency}
                                onValueChange={(value) => 
                                  setCreateAgentSchedule(prev => ({ 
                                    ...prev, 
                                    frequency: value,
                                    days: value === 'daily' ? [] : prev.days,
                                    selectedDay: value === 'weekly' ? 'monday' : prev.selectedDay
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full rounded-md mt-1">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Time</Label>
                              <Input
                                type="time"
                                value={createAgentSchedule.time}
                                onChange={(e) => 
                                  setCreateAgentSchedule(prev => ({ ...prev, time: e.target.value }))
                                }
                                className="w-full rounded-md mt-1"
                              />
                            </div>
                            
                            {createAgentSchedule.frequency === 'weekly' && (
                              <div>
                                <Label className="text-sm font-medium">Day of Week</Label>
                                <Select
                                  value={createAgentSchedule.selectedDay}
                                  onValueChange={(value) => 
                                    setCreateAgentSchedule(prev => ({ ...prev, selectedDay: value, days: [value] }))
                                  }
                                >
                                  <SelectTrigger className="w-full rounded-md mt-1">
                                    <SelectValue placeholder="Select day" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="monday">Monday</SelectItem>
                                    <SelectItem value="tuesday">Tuesday</SelectItem>
                                    <SelectItem value="wednesday">Wednesday</SelectItem>
                                    <SelectItem value="thursday">Thursday</SelectItem>
                                    <SelectItem value="friday">Friday</SelectItem>
                                    <SelectItem value="saturday">Saturday</SelectItem>
                                    <SelectItem value="sunday">Sunday</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            
                            {createAgentSchedule.frequency === 'monthly' && (
                              <div>
                                <Label className="text-sm font-medium">Day of Month</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="28"
                                  placeholder="e.g., 1, 15"
                                  value={createAgentSchedule.days[0] || ''}
                                  onChange={(e) => 
                                    setCreateAgentSchedule(prev => ({ ...prev, days: [e.target.value] }))
                                  }
                                  className="w-full rounded-md mt-1"
                                />
                              </div>
                            )}
                            
                            <div className="flex justify-end gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowScheduleDropdown(false)}
                                className="rounded-md"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setShowScheduleDropdown(false)}
                                className="rounded-md"
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Main Content */}
              <div className="space-y-6">
                {/* Agent Steps */}
                <div>
                  
                  {/* Small Tabs for Smart Create and Manual Create */}
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mb-4">
                    <button
                      onClick={() => setCreateAgentStepsTab('smart')}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                        createAgentStepsTab === 'smart'
                          ? "text-gray-800 bg-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200/70"
                      )}
                    >
                      Smart Create
                    </button>
                    <button
                      onClick={() => setCreateAgentStepsTab('manual')}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                        createAgentStepsTab === 'manual'
                          ? "text-gray-800 bg-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200/70"
                      )}
                    >
                      Manual Create
                    </button>
                  </div>

                  {/* Tab Content */}
                  {createAgentStepsTab === 'smart' ? (
                    <div className="space-y-4">
                      <div>
                        <Textarea
                          placeholder="Describe what you want the agent to do..."
                          value={smartCreatePrompt}
                          onChange={(e) => setSmartCreatePrompt(e.target.value)}
                          className="rounded-md min-h-[120px]"
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!user?.uid) {
                            toast({
                              title: "Authentication Required",
                              description: "Please sign in to create agents.",
                              variant: "destructive"
                            })
                            return
                          }

                          if (!smartCreatePrompt.trim()) {
                            toast({
                              title: "Prompt Required",
                              description: "Please describe what you want the agent to do.",
                              variant: "destructive"
                            })
                            return
                          }

                          try {
                            setIsGeneratingSteps(true)
                            console.log('🚀 [Smart Create] Starting agent plan generation...')
                            
                            toast({
                              title: "Generating Agent Steps",
                              description: "AI is analysing your request...",
                            })

                            // Call Firebase function
                            const functions = getFunctions()
                            const createAgentExecutionPlan = httpsCallable(functions, 'createAgentExecutionPlan')
                            
                            const result = await createAgentExecutionPlan({
                              prompt: smartCreatePrompt,
                              merchantId: user.uid
                            })

                            const data = result.data as any
                            console.log('✅ [Smart Create] Firebase function response:', data)
                            
                            // 🔍 COMPREHENSIVE DEBUGGING - Full Response Structure
                            console.group('🔍 [DEBUG] Complete createAgentExecutionPlan Response')
                            console.log('📦 Raw result object:', result)
                            console.log('📊 Response data:', data)
                            console.log('🔢 Data type:', typeof data)
                            console.log('📋 Data keys:', data ? Object.keys(data) : 'No data')
                            
                            if (data) {
                              console.log('✨ Steps property:', data.steps)
                              console.log('🔢 Steps type:', typeof data.steps)
                              console.log('📏 Steps length:', Array.isArray(data.steps) ? data.steps.length : 'Not array')
                              
                              if (Array.isArray(data.steps)) {
                                console.log('📝 Individual steps:')
                                data.steps.forEach((step: any, index: number) => {
                                  console.log(`   Step ${index + 1}:`, step)
                                  console.log(`   Step ${index + 1} type:`, typeof step)
                                  if (typeof step === 'object' && step !== null) {
                                    console.log(`   Step ${index + 1} keys:`, Object.keys(step))
                                  }
                                })
                              }
                              
                              // Log any other properties in the response
                              Object.keys(data).forEach(key => {
                                if (key !== 'steps') {
                                  console.log(`🔑 ${key}:`, data[key])
                                }
                              })
                            }
                            
                            console.log('📄 Full response JSON:', JSON.stringify(data, null, 2))
                            console.groupEnd()

                            // Process the response and display in text area
                            if (data && data.steps) {
                              let formattedSteps = ""
                              
                              if (Array.isArray(data.steps)) {
                                formattedSteps = data.steps.map((step: any, index: number) => {
                                  if (typeof step === 'string') {
                                    try {
                                      // Check if it's a JSON string
                                      if (step.trim().startsWith('{') && step.trim().endsWith('}')) {
                                        const parsedStep = JSON.parse(step)
                                        if (parsedStep.stepNumber && parsedStep.action) {
                                          const toolInfo = parsedStep.toolName ? ` (${parsedStep.toolName})` : ''
                                          return `Step ${parsedStep.stepNumber}: ${parsedStep.action}${toolInfo}`
                                        }
                                      }
                                    } catch (e) {
                                      // Use step as is if not JSON
                                    }
                                    return step
                                  } else if (typeof step === 'object' && step !== null) {
                                    if (step.stepNumber && step.action) {
                                      const toolInfo = step.toolName ? ` (${step.toolName})` : ''
                                      return `Step ${step.stepNumber}: ${step.action}${toolInfo}`
                                    }
                                    return step.description || step.text || step.step || JSON.stringify(step)
                                  }
                                  return String(step)
                                }).join('\n\n')
                              } else {
                                formattedSteps = String(data.steps)
                              }

                              setGeneratedStepsText(formattedSteps)
                              
                              toast({
                                title: "Steps Generated!",
                                description: "Review and edit the generated steps as needed.",
                              })
                            } else {
                              throw new Error('No steps found in response')
                            }
                          } catch (error) {
                            console.error('❌ [Smart Create] Error generating agent steps:', error)
                            toast({
                              title: "Generation Failed",
                              description: error instanceof Error ? error.message : "Failed to generate agent steps. Please try again.",
                              variant: "destructive"
                            })
                          } finally {
                            setIsGeneratingSteps(false)
                          }
                        }}
                        disabled={!smartCreatePrompt.trim() || isGeneratingSteps}
                        className="rounded-md gap-2"
                      >
                        {isGeneratingSteps ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4" />
                            Generate Steps
                          </>
                        )}
                      </Button>

                      {/* Generated Steps Display */}
                      {generatedStepsText && (
                        <div>
                          <Label className="text-sm font-medium">Generated Steps</Label>
                          <p className="text-xs text-gray-600 mb-2">Review and edit the steps as needed</p>
                          <Textarea
                            value={generatedStepsText}
                            onChange={(e) => setGeneratedStepsText(e.target.value)}
                            className="rounded-md min-h-[200px]"
                            placeholder="Generated steps will appear here..."
                          />
                        </div>
                      )}

                      {/* Agent Ideas Display - Below Generated Steps */}
                      {agentIdeas && (
                        <div className="animate-in fade-in-0 duration-500">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-900">AI Generated Agent Ideas</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAgentIdeas(null)}
                              className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {/* Agent Ideas Grid - Minimal styling */}
                          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {agentIdeas.agentIdeas?.map((idea: any, index: number) => (
                              <div 
                                key={idea.id}
                                className="bg-gray-50 border border-gray-200 rounded-md p-2 flex flex-col hover:border-gray-300 transition-colors animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                {/* Just title */}
                                <div className="mb-2">
                                  <h3 className="text-xs font-medium text-gray-900 leading-tight">{idea.name}</h3>
                                </div>
                                
                                {/* Use button */}
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    // Pre-fill the agent form with this idea
                                    setCreateAgentForm({
                                      name: idea.name,
                                      steps: idea.workflow.split(/\d+\./).filter((step: string) => step.trim()).map((step: string) => step.trim())
                                    })
                                    setAgentIdeas(null) // Hide ideas to show the form
                                    setExpandedAgentIdeas(new Set()) // Reset expanded state
                                    toast({
                                      title: "Agent Idea Applied",
                                      description: `${idea.name} has been loaded into the form.`
                                    })
                                  }}
                                  className="rounded-md text-xs px-2 py-1 h-5 w-full"
                                >
                                  Use
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {createAgentForm.steps.map((step, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-2">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <Textarea
                              placeholder={`Step ${index + 1}: Describe what the agent should do...`}
                              value={step}
                              onChange={(e) => {
                                const newSteps = [...createAgentForm.steps]
                                newSteps[index] = e.target.value
                                setCreateAgentForm(prev => ({ ...prev, steps: newSteps }))
                              }}
                              className="rounded-md min-h-[80px]"
                            />
                          </div>
                          {createAgentForm.steps.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newSteps = createAgentForm.steps.filter((_, i) => i !== index)
                                setCreateAgentForm(prev => ({ ...prev, steps: newSteps }))
                              }}
                              className="mt-2 h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCreateAgentForm(prev => ({ ...prev, steps: [...prev.steps, ''] }))
                        }}
                        className="rounded-md gap-2 mt-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Step
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="w-px bg-gray-200"></div>

            {/* Right Sidebar */}
            <div className="w-80 p-6 pl-4 bg-gray-50 flex flex-col h-full">
              {/* Available Tools - Right Panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {/* Available Tools - Right Panel */}
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-600">Available Tools</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard/integrations')}
                        className="rounded-md h-6 w-6 ml-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Tools Search */}
                    <div className="mb-3">
                      <Input
                        placeholder="Search tools..."
                        value={toolsSearchQuery}
                        onChange={(e) => setToolsSearchQuery(e.target.value)}
                        className="rounded-md h-8 text-sm"
                      />
                    </div>
                    {/* Tools Grid */}
                    <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                      {toolsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                          <span className="ml-2 text-xs text-gray-600">Loading...</span>
                        </div>
                      ) : composioTools.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-xs text-gray-500 mb-2">No connected tools</p>
                          <p className="text-xs text-gray-400">Connect integrations first</p>
                        </div>
                      ) : (
                        <div className="p-2">
                          <div className="space-y-1">
                            {composioTools.map((tool) => (
                              <TooltipProvider key={tool.slug}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => {
                                        const newSelected = new Set(selectedTools)
                                        if (newSelected.has(tool.slug)) {
                                          newSelected.delete(tool.slug)
                                        } else {
                                          newSelected.add(tool.slug)
                                        }
                                        setSelectedTools(newSelected)
                                      }}
                                      className={`w-full p-2 rounded-md border transition-all duration-200 hover:shadow-sm ${
                                        selectedTools.has(tool.slug)
                                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {tool.deprecated?.toolkit?.logo ? (
                                          <img
                                            src={tool.deprecated.toolkit.logo}
                                            alt={tool.toolkit?.name || tool.name}
                                            className="w-5 h-5 rounded flex-shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        ) : (
                                          <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-medium text-gray-600">
                                              {tool.name.charAt(0)}
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-xs font-medium text-left truncate flex-1">
                                          {tool.name.replace(/^(GMAIL_|GOOGLECALENDAR_)/i, '').toLowerCase().replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </span>
                                      </div>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 text-white border-gray-700 max-w-xs">
                                    <div className="space-y-1">
                                      <div className="font-medium">{tool.name}</div>
                                      <div className="text-gray-300 text-xs">{tool.description}</div>
                                      {tool.toolkit && (
                                        <div className="flex items-center gap-1 text-blue-300 text-xs">
                                          {tool.deprecated?.toolkit?.logo && (
                                            <img
                                              src={tool.deprecated.toolkit.logo}
                                              alt={tool.toolkit.name}
                                              className="w-3 h-3 rounded"
                                            />
                                          )}
                                          <span>{tool.toolkit.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Tools Details */}
                  {selectedTools.size > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3 text-gray-600">Selected Tools</h3>
                      <div className="bg-white border border-gray-200 rounded-md shadow-sm max-h-40 overflow-y-auto">
                        {Array.from(selectedTools).map(toolSlug => {
                          const tool = composioTools.find(t => t.slug === toolSlug)
                          if (!tool) return null
                          
                          return (
                            <div key={toolSlug} className="flex items-center gap-2 p-2 border-b border-gray-100 last:border-b-0">
                              {tool.deprecated?.toolkit?.logo ? (
                                <img
                                  src={tool.deprecated.toolkit.logo}
                                  alt={tool.toolkit?.name || tool.name}
                                  className="w-4 h-4 rounded flex-shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-gray-600">
                                    {tool.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{tool.name}</p>
                                <p className="text-xs text-gray-500 truncate">{tool.toolkit?.name}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Schedule Information */}
                  {createAgentSchedule.frequency && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3 text-gray-600">Schedule</h3>
                      <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Frequency:</span>
                            <span className="text-xs font-medium capitalize">{createAgentSchedule.frequency}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Time:</span>
                            <span className="text-xs font-medium">{createAgentSchedule.time}</span>
                          </div>
                          {createAgentSchedule.frequency === 'weekly' && createAgentSchedule.selectedDay && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Day:</span>
                              <span className="text-xs font-medium capitalize">{createAgentSchedule.selectedDay}</span>
                            </div>
                          )}
                          {createAgentSchedule.frequency === 'monthly' && createAgentSchedule.days[0] && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Day of Month:</span>
                              <span className="text-xs font-medium">{createAgentSchedule.days[0]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Create Button Section - Fixed at bottom */}
                <div className="border-t border-gray-200 pt-4 mt-auto sticky bottom-0 bg-gray-50">
                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        if (!createAgentForm.name.trim()) {
                          toast({
                            title: "Agent Name Required",
                            description: "Please provide a name for your agent.",
                            variant: "destructive"
                          })
                          return
                        }
                        
                        if (createAgentForm.steps.filter(s => s.trim()).length === 0) {
                          toast({
                            title: "Steps Required",
                            description: "Please define at least one step for your agent.",
                            variant: "destructive"
                          })
                          return
                        }
                        
                        // Prepare agent data with selected tools
                        const agentData = {
                          name: createAgentForm.name,
                          steps: createAgentForm.steps.filter(s => s.trim()),
                          selectedTools: Array.from(selectedTools),
                          schedule: createAgentSchedule.frequency ? createAgentSchedule : null,
                          merchantId: user?.uid
                        }
                        
                        console.log('Creating agent with data:', agentData)
                        
                        // Here you would save the agent to your backend
                        toast({
                          title: "Agent Created!",
                          description: `${createAgentForm.name} has been created with ${selectedTools.size} tools.`
                        })
                        
                        // Reset form and close modal
                        setCreateAgentForm({ name: '', steps: [''] })
                        setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
                        setSelectedTools(new Set())
                        setToolsSearchQuery('')
                        setSmartCreatePrompt('') // Reset smart create prompt
                        setCreateAgentStepsTab('smart') // Reset to smart tab
                        setIsEditingAgentName(false) // Reset editing state
                        setIsGeneratingSteps(false) // Reset generating state
                        setGeneratedStepsText('') // Reset generated steps
                        setAgentIdeas(null) // Reset agent ideas
                        setIsLoadingAgentIdeas(false) // Reset loading state
                        setIsCreateAgentModalOpen(false)
                      }}
                      className="w-full rounded-md"
                      disabled={!createAgentForm.name.trim() || createAgentForm.steps.filter(s => s.trim()).length === 0}
                    >
                      Create Agent
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCreateAgentForm({ name: '', steps: [''] })
                        setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
                        setSelectedTools(new Set())
                        setToolsSearchQuery('')
                        setSmartCreatePrompt('') // Reset smart create prompt
                        setCreateAgentStepsTab('smart') // Reset to smart tab
                        setIsEditingAgentName(false) // Reset editing state
                        setIsGeneratingSteps(false) // Reset generating state
                        setGeneratedStepsText('') // Reset generated steps
                        setAgentIdeas(null) // Reset agent ideas
                        setIsLoadingAgentIdeas(false) // Reset loading state
                        setIsCreateAgentModalOpen(false)
                      }}
                      className="w-full rounded-md"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  )
} 