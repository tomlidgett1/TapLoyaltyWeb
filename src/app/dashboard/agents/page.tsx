'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Bell, Headphones, Inbox, Brain, BarChart3, Receipt, Users, ShoppingCart, DollarSign, Calculator, Settings, Plus, FileText, Mail, MessageSquare, Clock, CheckCircle, X, ArrowUpRight, ChevronRightIcon, ChevronDown, Calendar, Wand2, Terminal, Puzzle, AlignLeft, Trash2, Bug } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, collection, getDocs, query, orderBy, limit, addDoc, deleteDoc, where } from 'firebase/firestore'
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
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function AgentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false)
  const [isRequestAgentOpen, setIsRequestAgentOpen] = useState(false)
  const [isCustomerServiceModalOpen, setIsCustomerServiceModalOpen] = useState(false)
  const [isEmailSummaryModalOpen, setIsEmailSummaryModalOpen] = useState(false)
  const [isEmailExecutiveModalOpen, setIsEmailExecutiveModalOpen] = useState(false)
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
  const [showEmailExecutiveConfiguration, setShowEmailExecutiveConfiguration] = useState(false)
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
  const [emailExecutiveSettings, setEmailExecutiveSettings] = useState({
    enabled: true,
    integration: 'gmail', // 'gmail' or 'outlook'
    categories: [
      { 
        id: 'to-respond',
        name: 'To respond', 
        description: 'Emails you need to respond to',
        color: '#EF4444',
        enabled: true
      },
      { 
        id: 'fyi',
        name: 'FYI', 
        description: 'Emails that don\'t require your response, but are important',
        color: '#3B82F6',
        enabled: true
      },
      { 
        id: 'actioned',
        name: 'Actioned', 
        description: 'Emails you\'ve sent that you\'re not expecting a reply to',
        color: '#6B7280',
        enabled: true
      },
      { 
        id: 'invoices',
        name: 'Invoices', 
        description: 'Billing and payment related emails',
        color: '#10B981',
        enabled: true
      },
      { 
        id: 'customer-inquiries',
        name: 'Customer inquiries', 
        description: 'Questions and support requests from customers',
        color: '#F59E0B',
        enabled: true
      },
      { 
        id: 'notifications',
        name: 'Notifications', 
        description: 'Automated updates from tools and services',
        color: '#8B5CF6',
        enabled: true
      }
    ],
    draftSettings: {
      enabled: true,
      mode: 'all', // 'all', 'selected', 'none'
      selectedCategories: [] as string[],
      autoSend: false,
      approvalRequired: true,
      template: 'professional'
    },
    schedule: {
      frequency: 'realtime', // 'realtime', 'hourly', 'daily'
      time: '09:00'
    },
    rules: [] as Array<{
      id: string;
      emailAddresses: string;
      domains: string;
      subjects: string;
      categoryId: string;
    }>
  })
  const [showLogsView, setShowLogsView] = useState(false)
  const [agentLogs, setAgentLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    sendToInbox: true,
    sendViaEmail: false,
    emailAddress: "",
    emailFormat: "professional" // "professional" or "simple"
  })

  // Create Agent Modal State
  const [createAgentForm, setCreateAgentForm] = useState({
    name: 'New Agent',
    steps: ['']
  })
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false)
  const [showToolsInLeftPanel, setShowToolsInLeftPanel] = useState(false) // Control tools visibility in left panel
  const [createAgentSchedule, setCreateAgentSchedule] = useState({
    frequency: '',
    time: '12:00',
    days: [] as string[],
    selectedDay: '' // for weekly
  })
  const [isCreatingAgent, setIsCreatingAgent] = useState(false) // Add state for creating agent loading
  const [composioTools, setComposioTools] = useState<any[]>([])
  const [toolsLoading, setToolsLoading] = useState(false)
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set())
  const [toolsSearchQuery, setToolsSearchQuery] = useState('') // Search query for tools in left panel
  const [createAgentStepsTab, setCreateAgentStepsTab] = useState('smart') // Add tab state for agent steps
  const [smartCreatePrompt, setSmartCreatePrompt] = useState('') // Add state for smart create prompt
  const [isEditingAgentName, setIsEditingAgentName] = useState(false) // Add state for editing agent name
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false) // Add state for generating steps
  const [generatedStepsText, setGeneratedStepsText] = useState('') // Add state for generated steps text
  const [structuredPrompt, setStructuredPrompt] = useState('') // Add state for structured prompt
  const [agentIdeas, setAgentIdeas] = useState<any>(null) // Add state for agent ideas response
  const [isLoadingAgentIdeas, setIsLoadingAgentIdeas] = useState(false) // Add state for loading agent ideas
  const [expandedAgentIdeas, setExpandedAgentIdeas] = useState<Set<string>>(new Set()) // Add state for expanded agent ideas
  const [showSmartCreateInput, setShowSmartCreateInput] = useState(false) // Add state for smart create input
  const [agentCanvasContent, setAgentCanvasContent] = useState('') // Add state for agent canvas content
  const [showToolsDropdown, setShowToolsDropdown] = useState(false) // Add state for tools dropdown
  const [toolsDropdownQuery, setToolsDropdownQuery] = useState('') // Add state for tools dropdown query
  const [selectedToolIndex, setSelectedToolIndex] = useState(0) // Add state for selected tool index
  const [filteredTools, setFilteredTools] = useState<any[]>([]) // Add state for filtered tools
  const [atMentionPosition, setAtMentionPosition] = useState(0) // Add state for @ mention position
  const [createAgentDebugResponse, setCreateAgentDebugResponse] = useState<string | null>(null) // Add state for debugging
  const [isEditingCanvas, setIsEditingCanvas] = useState(false) // Add state for canvas edit mode
  const [showDebugDialog, setShowDebugDialog] = useState(false) // Control debug dialog visibility
  const [agentDescription, setAgentDescription] = useState<string>('')

  // Email Rule State for adding new rules
  const [emailRule, setEmailRule] = useState({
    emailAddresses: '',
    domains: '',
    subjects: '',
    categoryId: ''
  })

  // Custom Agents State
  const [customAgents, setCustomAgents] = useState<any[]>([])
  const [customAgentsLoading, setCustomAgentsLoading] = useState(false)
  const [selectedCustomAgent, setSelectedCustomAgent] = useState<any>(null) // Add state for selected custom agent

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
      },
      {
        id: 'email-executive',
        name: 'Email Executive Assistant',
        description: 'Automatically categorise incoming emails and draft professional responses based on your custom categories',
        status: 'active' as const,
        features: ['Email categorisation', 'Auto-draft responses', 'Custom categories', 'Multi-platform support'],
        integrations: ['gmail.png'],
        requiredIntegrations: ['gmail.png'],
        optionalIntegrations: ['outlook.png']
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
    'vault.png': 'Vault',
    'outlook.png': 'Outlook'
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

        // Load email-executive agent
        const emailExecutiveRef = doc(db, 'merchants', user.uid, 'agentsenrolled', 'email-executive')
        const emailExecutiveDoc = await getDoc(emailExecutiveRef)
        
        if (emailExecutiveDoc.exists()) {
          const agentData = emailExecutiveDoc.data()
          setEnrolledAgents(prev => ({
            ...prev,
            'email-executive': agentData
          }))
          
          // Update local settings if they exist
          if (agentData.settings) {
            // Preserve the new predefined categories but load other settings
            setEmailExecutiveSettings(prev => ({
              ...prev,
              enabled: agentData.settings.enabled ?? prev.enabled,
              integration: agentData.settings.integration ?? prev.integration,
              draftSettings: agentData.settings.draftSettings ?? prev.draftSettings,
              schedule: agentData.settings.schedule ?? prev.schedule,
              rules: agentData.settings.rules ?? prev.rules
            }))
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

  // Load custom agents function
  const loadCustomAgents = async () => {
    if (!user?.uid) return
    
    setCustomAgentsLoading(true)
    try {
      const agentsRef = collection(db, 'merchants', user.uid, 'agentsenrolled')
      const customAgentsQuery = query(agentsRef, orderBy('enrolledAt', 'desc'))
      const querySnapshot = await getDocs(customAgentsQuery)
      
      const customAgentsList = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((agent: any) => agent.type === 'custom')
      
      setCustomAgents(customAgentsList)
    } catch (error) {
      console.error('Error loading custom agents:', error)
      toast({
        title: "Failed to Load Custom Agents",
        description: "Could not load your custom agents. Please try again.",
        variant: "destructive"
      })
    } finally {
      setCustomAgentsLoading(false)
    }
  }

  // Load custom agents when component mounts
  useEffect(() => {
    loadCustomAgents()
  }, [user?.uid, toast])

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
        // Fetch merchant's primary email for notification settings
        try {
          const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
          if (merchantDoc.exists() && merchantDoc.data().primaryemail) {
            setNotificationSettings(prev => ({
              ...prev,
              emailAddress: merchantDoc.data().primaryemail
            }))
          }
        } catch (error) {
          console.error('Error fetching merchant data:', error)
        }
        
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

  // Filter tools based on @ mention query
  useEffect(() => {
    if (toolsDropdownQuery !== undefined) {
      const filtered = composioTools.filter(tool => 
        tool.name.toLowerCase().includes(toolsDropdownQuery) ||
        tool.toolkit?.name?.toLowerCase().includes(toolsDropdownQuery)
      )
      setFilteredTools(filtered)
      setSelectedToolIndex(0) // Reset selection
    }
  }, [toolsDropdownQuery, composioTools])

  const handleAgentAction = async (agent: Agent) => {
    if (agent.id === 'email-summary') {
      setIsEmailSummaryModalOpen(true)
    } else if (agent.id === 'email-executive') {
      setIsEmailExecutiveModalOpen(true)
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

  const handleEmailExecutiveConnect = async () => {
    const agent = agentSections['Customer Service'].find(a => a.id === 'email-executive')
    if (!agent) return

    // Set loading state
    setConnectingAgents(prev => new Set([...prev, agent.id]))
    
    try {
      // Get merchantId from authenticated user
      if (!user?.uid) {
        throw new Error('User not authenticated')
      }
      
      const merchantId = user.uid
      const isEnrolled = enrolledAgents['email-executive']?.status === 'active'
      
      if (isEnrolled) {
        // Handle disconnect
        const agentEnrollmentRef = doc(db, 'merchants', merchantId, 'agentsenrolled', 'email-executive')
        await updateDoc(agentEnrollmentRef, {
          status: 'inactive',
          deactivatedAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        })
        
        // Update local state
        setEnrolledAgents(prev => ({
          ...prev,
          'email-executive': {
            ...prev['email-executive'],
            status: 'inactive'
          }
        }))
        
        toast({
          title: "Email Executive Assistant Disconnected",
          description: "Agent has been deactivated successfully."
        })
      } else {
        // Handle connect
        const agentEnrollmentRef = doc(db, 'merchants', merchantId, 'agentsenrolled', 'email-executive')
        const existingDoc = await getDoc(agentEnrollmentRef)
        
        // Generate a unique schedule ID
        const scheduleId = `${merchantId}_email-executive_${Date.now()}`
        
        // Prepare the base agent data
        const baseAgentData = {
          agentId: 'email-executive',
          agentName: 'Email Executive Assistant',
          agentType: 'email-executive',
          status: 'active',
          enrolledAt: serverTimestamp(),
          description: 'Automatically categorise incoming emails and draft professional responses based on your custom categories',
          features: ['Email categorisation', 'Auto-draft responses', 'Custom categories', 'Multi-platform support'],
          integrations: [emailExecutiveSettings.integration],
          lastUpdated: serverTimestamp(),
          scheduleId: scheduleId // Store reference to schedule document
        }
        
        // Prepare settings with capitalised category IDs for Firestore
        const settingsForFirestore = prepareSettingsForFirestore(emailExecutiveSettings)
        
        // If document exists, preserve existing settings, otherwise use defaults
        const agentData = existingDoc.exists() 
          ? {
              ...baseAgentData,
              settings: existingDoc.data().settings || settingsForFirestore
            }
          : {
              ...baseAgentData,
              settings: settingsForFirestore
            }
        
        await setDoc(agentEnrollmentRef, agentData)
        
        // Also save schedule data to top-level agentschedule collection if not realtime
        if (emailExecutiveSettings.schedule.frequency !== 'realtime') {
          const scheduleRef = doc(db, 'agentschedule', scheduleId)
          const scheduleData = {
            merchantId: merchantId,
            agentname: 'email-executive',
            agentId: 'email-executive',
            agentName: 'Email Executive Assistant',
            schedule: agentData.settings.schedule,
            enabled: agentData.settings.enabled,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
          }
          
          await setDoc(scheduleRef, scheduleData)
        }
        
        // Update local state
        setEnrolledAgents(prev => ({
          ...prev,
          'email-executive': agentData
        }))
        
        // Call categorizeEmails Firebase function
        try {
          const functions = getFunctions()
          const categorizeEmails = httpsCallable(functions, 'categorizeEmails')
          
          await categorizeEmails({
            merchantId: merchantId
          })
          
          console.log('✅ categorizeEmails function called successfully')
        } catch (functionError) {
          console.error('❌ Error calling categorizeEmails function:', functionError)
          // Don't fail the whole connection process if the function call fails
        }
        
        toast({
          title: "Email Executive Assistant Connected!",
          description: "Agent has been activated successfully."
        })
        
        // Close the modal
        setIsEmailExecutiveModalOpen(false)
      }
    } catch (error) {
      console.error('Error handling Email Executive assistant action:', error)
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
      size: 280,
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0 w-full">
          <div className="relative flex-shrink-0">
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
      size: 180,
      cell: ({ row }) => {
        const executedAt = row.original.executedAt
        if (!executedAt) return <span className="text-sm text-gray-500">Unknown</span>
        
        // Handle Firestore timestamp
        const date = executedAt.toDate ? executedAt.toDate() : new Date(executedAt)
        return (
          <div className="text-sm">
            {new Intl.DateTimeFormat('en-AU', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(date)}
          </div>
        )
      },
    },
    {
      accessorKey: 'toolsCalled',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Tools Called" />
      ),
      size: 280,
      cell: ({ row }) => {
        // Try to get tools from details array first, then fallback to toolsCalled
        const rawTools = row.original.details?.toolsCalled || row.original.toolsCalled || []
        
        // Debug logging to understand the structure (will only show in browser console)
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Agent Logs] Tools Called Structure:', {
            rawTools,
            fromDetails: Boolean(row.original.details?.toolsCalled),
            fromToolsCalled: Boolean(row.original.toolsCalled),
            type: typeof rawTools,
            isArray: Array.isArray(rawTools),
            rowId: row.original.id
          })
        }
        
        // Ensure toolsCalled is always an array
        const toolsArray = Array.isArray(rawTools) ? rawTools : 
          (typeof rawTools === 'string' ? [rawTools] : [])
        
        if (toolsArray.length === 0) {
          return <span className="text-sm text-gray-500">No tools used</span>
        }
        
        return (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {toolsArray.map((tool: any, index: number) => {
                // Extract tool name based on the Firestore structure
                let toolName = '';
                
                if (typeof tool === 'object' && tool !== null) {
                  // Check for the specific structure from Firestore
                  if (tool.name) {
                    toolName = tool.name;
                  } else if (tool.id) {
                    toolName = tool.id;
                  }
                } else if (typeof tool === 'string') {
                  toolName = tool;
                }
                
                // If no valid name found, use a placeholder
                if (!toolName) {
                  toolName = 'Unknown Tool';
                }
                
                // Log tool name to help with debugging
                if (process.env.NODE_ENV !== 'production') {
                  console.debug('[Agent Logs] Tool Name:', toolName);
                }
                
                // Format the tool name for display (remove prefixes, format nicely)
                const displayName = formatToolName(toolName);
                
                // Use the original unformatted name for logo lookup to match exactly what's in the API
                const logo = getToolLogo(toolName);
                
                return (
                  <div 
                    key={index} 
                    className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-700"
                    title={`${displayName}${tool.arguments ? ` (${typeof tool.arguments === 'string' ? tool.arguments : JSON.stringify(tool.arguments)})` : ''}`}
                  >
                    {logo ? (
                      <img src={logo} alt={displayName} className="w-3.5 h-3.5 rounded" />
                    ) : (
                      <div className="w-3.5 h-3.5 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-[9px] font-bold text-gray-600">
                          {displayName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="truncate max-w-[100px]">{displayName}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Status" />
      ),
      size: 140,
      cell: ({ row }) => {
        const status = row.original.status || 'unknown'
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: getStatusColor(status) }}
            />
            <span className="text-sm font-medium capitalize truncate">{status}</span>
          </div>
        )
      },
    }
  ]

  // Helper function to insert tool mention
  const insertToolMention = (tool: any) => {
    const toolName = tool.name.replace(/^(GMAIL_|GOOGLECALENDAR_|GOOGLEDOCS_|GOOGLESHEETS_)/i, '').toLowerCase().replace(/_/g, ' ')
    const beforeAt = agentCanvasContent.substring(0, atMentionPosition)
    const afterMention = agentCanvasContent.substring(agentCanvasContent.indexOf(' ', atMentionPosition) === -1 
      ? agentCanvasContent.length 
      : agentCanvasContent.indexOf(' ', atMentionPosition))
    
    const newContent = beforeAt + `@${toolName}` + afterMention
    setAgentCanvasContent(newContent)
    setShowToolsDropdown(false)
    setSelectedToolIndex(0)
  }

  // Helper function to capitalise the first letter of a string
  const capitaliseFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Helper function to prepare settings for Firestore with capitalised category IDs
  const prepareSettingsForFirestore = (settings: typeof emailExecutiveSettings) => {
    return {
      ...settings,
      categories: settings.categories.map(category => ({
        ...category,
        id: capitaliseFirstLetter(category.id)
      })),
      rules: settings.rules.map(rule => ({
        ...rule,
        categoryId: capitaliseFirstLetter(rule.categoryId)
      })),
      draftSettings: {
        ...settings.draftSettings,
        selectedCategories: settings.draftSettings.selectedCategories.map(categoryId => 
          capitaliseFirstLetter(categoryId)
        )
      }
    }
  }

  // Helper function to get tool logo for a given tool name
  const getToolLogo = (toolName: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[getToolLogo] Looking for logo for:', toolName);
    }
    
    // Extract the toolkit prefix (GMAIL_, GOOGLECALENDAR_, etc.)
    const toolkitMatch = toolName.match(/^([A-Z]+)_/);
    const toolkitPrefix = toolkitMatch ? toolkitMatch[1].toLowerCase() : '';
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[getToolLogo] Toolkit prefix:', toolkitPrefix);
    }
    
    // First, try to find the tool in composioTools by matching the name
    const tool = composioTools.find(t => {
      // Try exact match first
      if (t.name?.toLowerCase() === toolName.toLowerCase()) return true
      
      // Try match without common prefixes
      const cleanedToolName = toolName.replace(/^(gmail_|googlecalendar_|googlesheets_|googledocs_)/i, '')
      const cleanedApiName = t.name?.replace(/^(GMAIL_|GOOGLECALENDAR_|GOOGLESHEETS_|GOOGLEDOCS_)/i, '')
      if (cleanedApiName?.toLowerCase() === cleanedToolName.toLowerCase()) return true
      
      // Try slug match
      if (t.slug?.toLowerCase() === toolName.toLowerCase()) return true
      
      return false
    })

    // If we found a matching tool, return its logo
    if (tool?.deprecated?.toolkit?.logo) {
      return tool.deprecated.toolkit.logo
    }

    // Direct toolkit matching based on prefix
    if (toolkitPrefix) {
      // For specific tools from the screenshot example
      if (toolkitPrefix === 'googlecalendar') {
        const calendarTool = composioTools.find(t => t.deprecated?.toolkit?.name?.toLowerCase().includes('calendar'));
        if (calendarTool?.deprecated?.toolkit?.logo) {
          return calendarTool.deprecated.toolkit.logo;
        }
        return '/google_calendar.png'; // Fallback specific to calendar
      }
      
      if (toolkitPrefix === 'gmail') {
        const gmailTool = composioTools.find(t => t.deprecated?.toolkit?.name?.toLowerCase().includes('gmail'));
        if (gmailTool?.deprecated?.toolkit?.logo) {
          return gmailTool.deprecated.toolkit.logo;
        }
        return '/gmail.png'; // Fallback specific to Gmail
      }
      
      if (toolkitPrefix === 'googlesheets') {
        const sheetsTool = composioTools.find(t => t.deprecated?.toolkit?.name?.toLowerCase().includes('sheets'));
        if (sheetsTool?.deprecated?.toolkit?.logo) {
          return sheetsTool.deprecated.toolkit.logo;
        }
        return '/google_sheets.png'; // Fallback specific to Sheets
      }
      
      if (toolkitPrefix === 'googledocs') {
        const docsTool = composioTools.find(t => t.deprecated?.toolkit?.name?.toLowerCase().includes('docs'));
        if (docsTool?.deprecated?.toolkit?.logo) {
          return docsTool.deprecated.toolkit.logo;
        }
        return '/google_docs.png'; // Fallback specific to Docs
      }
    }

    // Fallback: try to find by toolkit name/prefix (existing logic)
    const toolkitTool = composioTools.find(t => {
      const toolkitName = t.deprecated?.toolkit?.name?.toLowerCase()
      if (!toolkitName) return false
      
      if (toolName.toLowerCase().startsWith('gmail') && toolkitName.includes('gmail')) return true
      if (toolName.toLowerCase().startsWith('googlecalendar') && toolkitName.includes('calendar')) return true
      if (toolName.toLowerCase().startsWith('googlesheets') && toolkitName.includes('sheets')) return true
      if (toolName.toLowerCase().startsWith('googledocs') && toolkitName.includes('docs')) return true
      
      return false
    })

    if (toolkitTool?.deprecated?.toolkit?.logo) {
      return toolkitTool.deprecated.toolkit.logo
    }
    
    // Default mappings for known tools
    if (toolName.toLowerCase().includes('googlecalendar')) return '/google_calendar.png';
    if (toolName.toLowerCase().includes('gmail')) return '/gmail.png';
    if (toolName.toLowerCase().includes('googlesheets')) return '/google_sheets.png';
    if (toolName.toLowerCase().includes('googledocs')) return '/google_docs.png';
    
    // Default fallback
    return '/api_tool.png'
  }
  // Helper function to format tool name for display
  const formatToolName = (toolName: string) => {
    return toolName
      .replace(/^(gmail_|googlecalendar_|googlesheets_|googledocs_)/i, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  // Helper function to render text with tools highlighting
  const renderTextWithTools = (text: string) => {
    if (!text) return <span className="text-gray-500">Enter your agent definition here...</span>

    // Split text by tool patterns and bold markdown patterns
    const parts = text.split(/(tool:\w+|toolname:[a-zA-Z_]+|\*\*[^*]+\*\*)/g)
    
    return parts.map((part, index) => {
      if (part.match(/^tool:\w+$/) || part.match(/^toolname:[a-zA-Z_]+$/)) {
        // This is a tool mention - show in gray box (now handling both patterns the same way)
        const toolName = part.replace(/^(tool:|toolname:)/, '')
        const logo = getToolLogo(toolName)
        const displayName = formatToolName(toolName)
        
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-700 mx-0.5"
          >
            {logo ? (
              <img src={logo} alt={displayName} className="w-3.5 h-3.5 rounded" />
            ) : (
              <div className="w-3.5 h-3.5 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-xs font-bold text-gray-600">
                  {toolName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {displayName}
          </span>
        )
      } else if (part.match(/^\*\*[^*]+\*\*$/)) {
        // This is bold markdown - render as bold text
        const boldText = part.replace(/^\*\*/, '').replace(/\*\*$/, '')
        return <strong key={index} className="font-semibold text-gray-900">{boldText}</strong>
      } else {
        // Regular text
        return <span key={index}>{part}</span>
      }
    })
  }

  // Reset create agent form when modal closes
  useEffect(() => {
    if (!isCreateAgentModalOpen) {
      setIsEditingAgentName(false)
      setCreateAgentForm({
        name: 'New Agent',
        steps: ['']
      })
      setShowSmartCreateInput(false)
    }
  }, [isCreateAgentModalOpen])

  // Handle modal open/close effects
  useEffect(() => {
    if (isCreateAgentModalOpen && user?.uid) {
      // Reset tools search when modal opens
      setToolsSearchQuery('')
      setFilteredTools([])
      
      // Load merchant's primary email for notification settings
      const loadMerchantEmail = async () => {
        try {
          const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
          if (merchantDoc.exists() && merchantDoc.data().primaryemail) {
            setNotificationSettings(prev => ({
              ...prev,
              emailAddress: merchantDoc.data().primaryemail
            }))
          }
        } catch (error) {
          console.error('Error fetching merchant data:', error)
        }
      }
      
      loadMerchantEmail()
    }
  }, [isCreateAgentModalOpen, user])

  // Handle clicking on a custom agent
  const handleCustomAgentClick = (agent: any) => {
    setSelectedCustomAgent(agent)
    
    // Set form data based on the selected agent
    setCreateAgentForm({
      name: agent.agentName || 'Custom Agent',
      steps: agent.steps || ['']
    })
    
    // Set schedule if available
    if (agent.settings?.schedule) {
      setCreateAgentSchedule({
        frequency: agent.settings.schedule.frequency || '',
        time: agent.settings.schedule.time || '12:00',
        days: agent.settings.schedule.days || [],
        selectedDay: agent.settings.schedule.selectedDay || ''
      })
    } else {
      setCreateAgentSchedule({
        frequency: '',
        time: '12:00',
        days: [],
        selectedDay: ''
      })
    }
    
    // Set selected tools if available
    if (agent.settings?.selectedTools) {
      setSelectedTools(new Set(agent.settings.selectedTools))
    } else {
      setSelectedTools(new Set())
    }
    
    // Set agent canvas content if available
    if (agent.prompt) {
      setAgentCanvasContent(agent.prompt)
    } else {
      setAgentCanvasContent('')
    }
    
    // Set agent description if available
    if (agent.agentDescription) {
      setAgentDescription(agent.agentDescription)
    } else {
      setAgentDescription('')
    }
    
    // Set notification settings if available
    if (agent.settings?.notifications) {
      setNotificationSettings({
        sendToInbox: agent.settings.notifications.sendToInbox ?? true,
        sendViaEmail: agent.settings.notifications.sendViaEmail ?? false,
        emailAddress: agent.settings.notifications.emailAddress || notificationSettings.emailAddress,
        emailFormat: agent.settings.notifications.emailFormat || "professional"
      })
    }
    
    // Open the create agent modal
    setIsCreateAgentModalOpen(true)
  }

  // Handle deleting a custom agent
  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    try {
      if (!user?.uid) {
        toast({
          title: "Error",
          description: "You must be logged in to delete an agent.",
          variant: "destructive"
        })
        return
      }

      // Get the agent data first to find the scheduleId
      const agentDocRef = doc(db, 'merchants', user.uid, 'agentsenrolled', agentId)
      const agentDoc = await getDoc(agentDocRef)
      const agentData = agentDoc.data()

      // Delete the agent from Firestore
      await deleteDoc(agentDocRef)
      
      // Also delete from the top-level agentschedule collection if scheduleId exists
      if (agentData?.scheduleId) {
        const scheduleRef = doc(db, 'agentschedule', agentData.scheduleId)
        await deleteDoc(scheduleRef).catch(err => {
          // Ignore errors if the schedule document doesn't exist
          console.log('Schedule may not exist or was already deleted:', err.message)
        })
      }
      
      // Refresh the custom agents list
      await loadCustomAgents()
      
      toast({
        title: "Agent Deleted",
        description: `${agentName} has been deleted successfully.`
      })
    } catch (error) {
      console.error('Error deleting agent:', error)
      toast({
        title: "Error",
        description: "Failed to delete the agent. Please try again.",
        variant: "destructive"
      })
    }
  }

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
                onClick={() => {
                  setIsCreateAgentModalOpen(true)
                  setIsEditingAgentName(true)
                }}
                className="rounded-md gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Agent
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
              {agents.map((agent) => {
                const isCustomerServiceSection = sectionName === 'Customer Service';
                return (
                  <div 
                    key={agent.id} 
                    className={cn(
                      "bg-gray-50 border border-gray-200 rounded-md p-5 flex flex-col hover:border-gray-300 transition-colors",
                      agent.status === 'coming-soon' && "opacity-60 grayscale",
                      isCustomerServiceSection && "cursor-pointer"
                    )}
                    onClick={() => {
                      // Make all boxes in Customer Service section clickable
                      if (isCustomerServiceSection && agent.status === 'active') {
                        handleAgentAction(agent);
                      }
                    }}
                  >
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
                          
                          // For all agents in Customer Service section, just show status indicator
                          if (isCustomerServiceSection) {
                            return (
                              <>
                                {/* Only show status indicator for Customer Service section agents */}
                                {isEnrolled ? (
                                  <div className="flex items-center gap-1 py-1 px-2 text-xs font-medium text-green-700 bg-green-50 rounded-md">
                                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                    <span>Connected</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 py-1 px-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-md">
                                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                                    <span>Not Connected</span>
                                  </div>
                                )}
                              </>
                            )
                          }
                          
                          // For all other sections, show the buttons as before
                          return (
                            <>
                              {/* Configure button - only show when enrolled */}
                              {isEnrolled && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="rounded-md h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering parent onClick
                                    handleAgentAction(agent);
                                  }}
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
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering parent onClick
                                  if (!isEnrolled) handleAgentAction(agent);
                                }}
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

                    {/* Integration Logos - Show for all agents */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <TooltipProvider>
                        {/* Required Integrations */}
                        <div className="flex gap-1.5">
                          {(agent.requiredIntegrations || agent.integrations).map((integration, index) => (
                            <Tooltip key={`required-${index}`}>
                              <TooltipTrigger asChild>
                                <div 
                                  className="w-6 h-6 bg-gray-50 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-help"
                                  onClick={(e) => e.stopPropagation()} // Prevent triggering parent onClick
                                >
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
                                    <div 
                                      className="w-6 h-6 bg-gray-50 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-help opacity-60"
                                      onClick={(e) => e.stopPropagation()} // Prevent triggering parent onClick
                                    >
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
                );
              })}
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
                <div 
                  className="border border-gray-200 rounded-md bg-white overflow-hidden agent-logs-table"
                  onClick={(event) => {
                    // Only proceed if handleLogClick function exists and user is logged in
                    if (!(window as any).handleLogClick || !user?.uid) return;
                    
                    // Find the closest table row element to get the row index
                    const rowElement = (event.target as HTMLElement).closest('tr');
                    if (!rowElement) return;
                    
                    // Get the row index and find the corresponding log data
                    const allRows = Array.from(rowElement.closest('tbody')?.querySelectorAll('tr') || []);
                    const rowIndex = allRows.indexOf(rowElement);
                    if (rowIndex === -1 || rowIndex >= agentLogs.length) return;
                    
                    // Call the handleLogClick function with the log ID
                    (window as any).handleLogClick(agentLogs[rowIndex].id, user.uid);
                  }}
                >
                  <div className="overflow-x-auto">
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
                          <TableRow 
                            key={row.id} 
                            row={row}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            {({ cell }) => <TableCell key={cell.id} cell={cell} />}
                          </TableRow>
                        )}
                      </TableBody>
                    </TableProvider>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Agents Section - Only show in agents view */}
        {!showLogsView && (
          <div className="mt-12 pt-8 border-t border-gray-100">
            <div className="space-y-4">
              <h2 className="text-base font-medium text-gray-900">Custom Agents</h2>
              
              {customAgentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading custom agents...</span>
                </div>
              ) : customAgents.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No custom agents exist.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customAgents.map((agent) => (
                    <div 
                      key={agent.id} 
                      className="bg-gray-50 border border-gray-200 rounded-md p-5 flex flex-col hover:border-gray-300 transition-colors cursor-pointer"
                      onClick={() => handleCustomAgentClick(agent)}
                    >
                      {/* Header with title and status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <h3 className="text-base font-medium text-gray-900">{agent.agentName}</h3>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          
                          {/* Status indicator */}
                          {agent.status === 'active' ? (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600 font-medium">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-xs text-gray-600 font-medium">Inactive</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description/Prompt preview */}
                      <p className="text-sm text-gray-600 mb-4 flex-1 leading-relaxed line-clamp-3">
                        {agent.agentDescription || agent.prompt ? 
                          (agent.agentDescription || agent.prompt.substring(0, 150) + (agent.prompt.length > 150 ? '...' : '')) 
                          : 'No description available'}
                      </p>

                      {/* Schedule Info */}
                      {agent.settings?.schedule && (
                        <div className="flex items-center mb-3">
                          <Badge variant="outline" className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 border-gray-200 rounded-md">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span className="text-xs">{agent.settings.schedule.frequency.charAt(0).toUpperCase() + agent.settings.schedule.frequency.slice(1)} at {agent.settings.schedule.time.includes('AM') || agent.settings.schedule.time.includes('PM') ? agent.settings.schedule.time : agent.settings.schedule.time + (parseInt(agent.settings.schedule.time.split(':')[0]) >= 12 ? ' PM' : ' AM')}</span>
                          </Badge>
                        </div>
                      )}

                      {/* Tools Used */}
                      {agent.settings?.selectedTools && agent.settings.selectedTools.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500 font-medium">Tools:</span>
                      <div className="flex gap-1">
                            {agent.settings.selectedTools.slice(0, 3).map((toolSlug: string, index: number) => (
                              <div key={index} className="w-4 h-4 bg-gray-100 rounded-md flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {toolSlug.charAt(0).toUpperCase()}
                                </span>
                      </div>
                            ))}
                            {agent.settings.selectedTools.length > 3 && (
                              <span className="text-xs text-gray-500">+{agent.settings.selectedTools.length - 3} more</span>
                            )}
                    </div>
                  </div>
                      )}
                    </div>
                  ))}
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
          <div className="flex h-full focus:outline-none">
            {/* Main Content - Left Section */}
            <div className="flex-1 flex flex-col h-full p-6 pr-4 overflow-y-auto focus:outline-none">
              <DialogHeader className="mb-6 focus:outline-none">
                <div className="flex items-center justify-between focus:outline-none">
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
          <div className="flex h-full focus:outline-none">
            {/* Main Content - Left Section */}
            <div className="flex-1 flex flex-col h-full p-6 pr-4 overflow-y-auto focus:outline-none">
              <DialogHeader className="mb-6 focus:outline-none">
                <div className="flex items-center justify-between focus:outline-none">
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

      {/* Email Executive Assistant Details Modal */}
      <Dialog open={isEmailExecutiveModalOpen} onOpenChange={setIsEmailExecutiveModalOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden p-0">
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          <div className="flex h-full focus:outline-none">
            {/* Main Content - Left Section */}
            <div className="flex-1 flex flex-col h-full p-6 pr-4 overflow-y-auto focus:outline-none">
              <DialogHeader className="mb-6 focus:outline-none">
                <div className="flex items-center justify-between focus:outline-none">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-xl font-semibold">Email Executive Assistant</DialogTitle>
                    {enrolledAgents['email-executive']?.status === 'active' && (
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
                      onClick={() => setShowEmailExecutiveConfiguration(!showEmailExecutiveConfiguration)}
                      className="rounded-md"
                    >
                      {showEmailExecutiveConfiguration ? 'Back to Overview' : 'Configuration'}
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Main Content */}
              <div className="space-y-6">
                {!showEmailExecutiveConfiguration ? (
                  <>
                    {/* Objective Section */}
                    <div>
                      <h3 className="text-base font-medium mb-3">Objective</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Automatically categorise incoming emails based on your custom categories and draft professional responses to streamline your email management workflow and improve response times.
                      </p>
                    </div>

                    {/* How it works */}
                    <div>
                      <h3 className="text-base font-medium mb-3">How this agent works</h3>
                      <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">1.</span>
                          <span>Monitors your email inbox (Gmail or Outlook) for new incoming messages</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">2.</span>
                          <span>Analyses email content, subject lines, and sender information against your custom categories</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">3.</span>
                          <span>Automatically categorises emails and applies appropriate labels or tags</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-gray-900">4.</span>
                          <span>Drafts professional responses based on category-specific templates and sends them for approval or automatically (based on your settings)</span>
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
                          onClick={() => setActiveConfigTab("categories")}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                            activeConfigTab === "categories"
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <Inbox className="h-3 w-3" />
                          Categories
                        </button>
                        <button
                          onClick={() => setActiveConfigTab("drafting")}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                            activeConfigTab === "drafting"
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <Mail className="h-3 w-3" />
                          Drafting
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
                                <Label htmlFor="email-executive-enabled" className="text-sm font-medium">Enable Email Executive Assistant</Label>
                                <p className="text-xs text-gray-600">
                                  {emailExecutiveSettings.enabled 
                                    ? "Agent will categorise and draft emails according to your settings" 
                                    : "Email executive assistant is disabled"
                                  }
                                </p>
                              </div>
                              <Switch
                                id="email-executive-enabled"
                                checked={emailExecutiveSettings.enabled}
                                onCheckedChange={(checked) => 
                                  setEmailExecutiveSettings(prev => ({ ...prev, enabled: checked }))
                                }
                              />
                            </div>

                            <Separator />

                            {/* Integration Selection */}
                            <div>
                              <Label htmlFor="integration-type" className="text-sm font-medium">Email Platform</Label>
                              <p className="text-xs text-gray-600 mb-3">Choose which email platform to integrate with</p>
                              
                              {/* Icon Selection */}
                              <div className="flex gap-4">
                                <button
                                  onClick={() => setEmailExecutiveSettings(prev => ({ ...prev, integration: 'gmail' }))}
                                  className={cn(
                                    "group relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 min-w-[140px]",
                                    emailExecutiveSettings.integration === 'gmail'
                                      ? "border-blue-500 bg-blue-50 shadow-md"
                                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                    emailExecutiveSettings.integration === 'gmail'
                                      ? "bg-white shadow-sm"
                                      : "bg-gray-50 group-hover:bg-white"
                                  )}>
                                    <Image
                                      src="/gmail.png"
                                      alt="Gmail"
                                      width={28}
                                      height={28}
                                      className="object-contain"
                                    />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <div className="text-sm font-semibold text-gray-900">Gmail</div>
                                    <div className="text-xs text-gray-500">Google Email</div>
                                  </div>
                                  {emailExecutiveSettings.integration === 'gmail' && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => setEmailExecutiveSettings(prev => ({ ...prev, integration: 'outlook' }))}
                                  className={cn(
                                    "group relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 min-w-[140px]",
                                    emailExecutiveSettings.integration === 'outlook'
                                      ? "border-blue-500 bg-blue-50 shadow-md"
                                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                    emailExecutiveSettings.integration === 'outlook'
                                      ? "bg-white shadow-sm"
                                      : "bg-gray-50 group-hover:bg-white"
                                  )}>
                                    <Image
                                      src="/outlook.png"
                                      alt="Outlook"
                                      width={28}
                                      height={28}
                                      className="object-contain"
                                    />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <div className="text-sm font-semibold text-gray-900">Outlook</div>
                                    <div className="text-xs text-gray-500">Microsoft Email</div>
                                  </div>
                                  {emailExecutiveSettings.integration === 'outlook' && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                                  )}
                                </button>
                              </div>
                            </div>
                          </>
                        ) : activeConfigTab === "categories" ? (
                          <>
                            {/* Email Categories Management */}
                            <div>
                              <Label className="text-sm font-medium">Email Categories</Label>
                              <p className="text-xs text-gray-600 mb-3">Enable or disable categories for automatic email classification.</p>
                              
                              {/* Simple Category List - More Condensed */}
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                {emailExecutiveSettings.categories.map((category, index) => (
                                  <div key={category.id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: category.color }}
                                      ></div>
                                      <span className="font-medium text-xs text-gray-900">{category.name}</span>
                                    </div>
                                    <Switch
                                      checked={category.enabled}
                                      onCheckedChange={(checked) => {
                                        const newCategories = [...emailExecutiveSettings.categories]
                                        newCategories[index] = { ...newCategories[index], enabled: checked }
                                        setEmailExecutiveSettings(prev => ({ ...prev, categories: newCategories }))
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>

                              <Separator className="my-4" />

                              {/* Add Rules Section - Simplified */}
                              <div>
                                <Label className="text-sm font-medium">Add Rules</Label>
                                <p className="text-xs text-gray-600 mb-3">Enter email addresses, domains, or subject keywords to automatically assign to a category.</p>
                                
                                <div className="space-y-3">
                                  {/* Single Input for all rule types */}
                                  <div>
                                    <Input
                                      value={emailRule.emailAddresses}
                                      onChange={(e) => setEmailRule(prev => ({ ...prev, emailAddresses: e.target.value, domains: '', subjects: '' }))}
                                      placeholder="user@example.com, example.com, subject keywords, etc."
                                      className="text-xs rounded-md"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separate multiple entries with commas</p>
                                  </div>

                                  {/* Category Selection and Add Button in same row */}
                                  <div className="flex gap-2">
                                    <Select
                                      value={emailRule.categoryId}
                                      onValueChange={(value) => setEmailRule(prev => ({ ...prev, categoryId: value }))}
                                    >
                                      <SelectTrigger className="flex-1 rounded-md">
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {emailExecutiveSettings.categories.filter(cat => cat.enabled).map((category) => (
                                          <SelectItem key={category.id} value={category.id}>
                                            <div className="flex items-center gap-2">
                                              <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: category.color }}
                                              ></div>
                                              {category.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (emailRule.categoryId && emailRule.emailAddresses.trim()) {
                                          const newRule = {
                                            id: Date.now().toString(),
                                            emailAddresses: emailRule.emailAddresses,
                                            domains: '',
                                            subjects: '',
                                            categoryId: emailRule.categoryId
                                          }
                                          setEmailExecutiveSettings(prev => ({
                                            ...prev,
                                            rules: [...(prev.rules || []), newRule]
                                          }))
                                          setEmailRule({
                                            emailAddresses: '',
                                            domains: '',
                                            subjects: '',
                                            categoryId: ''
                                          })
                                        }
                                      }}
                                      disabled={!emailRule.categoryId || !emailRule.emailAddresses.trim()}
                                      className="rounded-md"
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>

                                {/* Existing Rules List */}
                                {emailExecutiveSettings.rules && emailExecutiveSettings.rules.length > 0 && (
                                  <div className="mt-4">
                                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Current Rules</Label>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                      {emailExecutiveSettings.rules.map((rule) => {
                                        const category = emailExecutiveSettings.categories.find(cat => cat.id === rule.categoryId)
                                        return (
                                          <div key={rule.id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <div 
                                                  className="w-2 h-2 rounded-full flex-shrink-0" 
                                                  style={{ backgroundColor: category?.color }}
                                                ></div>
                                                <span className="text-xs font-medium">{category?.name}</span>
                                              </div>
                                              <div className="text-xs text-gray-600 truncate">
                                                {rule.emailAddresses}
                                              </div>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => {
                                                setEmailExecutiveSettings(prev => ({
                                                  ...prev,
                                                  rules: (prev.rules || []).filter(r => r.id !== rule.id)
                                                }))
                                              }}
                                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 ml-2 flex-shrink-0"
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        ) : activeConfigTab === "drafting" ? (
                          <>
                            {/* Draft Settings */}
                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="drafting-enabled" className="text-sm font-medium">Enable Email Drafting</Label>
                                <p className="text-xs text-gray-600">Automatically draft responses to categorised emails</p>
                              </div>
                              <Switch
                                id="drafting-enabled"
                                checked={emailExecutiveSettings.draftSettings.enabled}
                                onCheckedChange={(checked) => 
                                  setEmailExecutiveSettings(prev => ({ 
                                    ...prev, 
                                    draftSettings: { ...prev.draftSettings, enabled: checked }
                                  }))
                                }
                              />
                            </div>

                            {emailExecutiveSettings.draftSettings.enabled && (
                              <>
                                <Separator />

                                {/* Draft Mode */}
                                <div>
                                  <Label className="text-sm font-medium">Draft Mode</Label>
                                  <p className="text-xs text-gray-600 mb-3">Choose which emails to draft responses for</p>
                                  <Select
                                    value={emailExecutiveSettings.draftSettings.mode}
                                    onValueChange={(value) => 
                                      setEmailExecutiveSettings(prev => ({ 
                                        ...prev, 
                                        draftSettings: { ...prev.draftSettings, mode: value }
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-full rounded-md">
                                      <SelectValue placeholder="Select draft mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All categorised emails</SelectItem>
                                      <SelectItem value="selected">Selected categories only</SelectItem>
                                      <SelectItem value="none">No automatic drafting</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Selected Categories for Drafting */}
                                {emailExecutiveSettings.draftSettings.mode === 'selected' && (
                                  <>
                                    <Separator />
                                    <div>
                                      <Label className="text-sm font-medium">Categories to Draft For</Label>
                                      <p className="text-xs text-gray-600 mb-3">Select which categories should have draft responses</p>
                                      <div className="space-y-2">
                                        {emailExecutiveSettings.categories.map((category, index) => (
                                          <label key={index} className="flex items-center space-x-2 text-sm">
                                            <input
                                              type="checkbox"
                                              checked={emailExecutiveSettings.draftSettings.selectedCategories.includes(category.name)}
                                              onChange={(e) => {
                                                const selectedCategories = e.target.checked
                                                  ? [...emailExecutiveSettings.draftSettings.selectedCategories, category.name]
                                                  : emailExecutiveSettings.draftSettings.selectedCategories.filter(name => name !== category.name)
                                                setEmailExecutiveSettings(prev => ({ 
                                                  ...prev, 
                                                  draftSettings: { ...prev.draftSettings, selectedCategories }
                                                }))
                                              }}
                                              className="rounded"
                                            />
                                            <div className="flex items-center gap-2">
                                              <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: category.color }}
                                              ></div>
                                              <span>{category.name}</span>
                                            </div>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}

                                <Separator />

                                {/* Response Template */}
                                <div>
                                  <Label className="text-sm font-medium">Response Template Style</Label>
                                  <p className="text-xs text-gray-600 mb-3">Choose the tone and style for drafted responses</p>
                                  <Select
                                    value={emailExecutiveSettings.draftSettings.template}
                                    onValueChange={(value) => 
                                      setEmailExecutiveSettings(prev => ({ 
                                        ...prev, 
                                        draftSettings: { ...prev.draftSettings, template: value }
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-full rounded-md">
                                      <SelectValue placeholder="Select template style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="professional">Professional</SelectItem>
                                      <SelectItem value="friendly">Friendly</SelectItem>
                                      <SelectItem value="formal">Formal</SelectItem>
                                      <SelectItem value="casual">Casual</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <Separator />

                                {/* Approval Settings */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Label htmlFor="approval-required" className="text-sm font-medium">Require Approval</Label>
                                    <p className="text-xs text-gray-600">
                                      {emailExecutiveSettings.draftSettings.approvalRequired 
                                        ? "Drafted emails will be sent to your inbox for review before sending" 
                                        : "Drafted emails will be sent automatically"
                                      }
                                    </p>
                                  </div>
                                  <Switch
                                    id="approval-required"
                                    checked={emailExecutiveSettings.draftSettings.approvalRequired}
                                    onCheckedChange={(checked) => 
                                      setEmailExecutiveSettings(prev => ({ 
                                        ...prev, 
                                        draftSettings: { ...prev.draftSettings, approvalRequired: checked }
                                      }))
                                    }
                                  />
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Schedule Configuration */}
                            {emailExecutiveSettings.enabled ? (
                              <>
                                {/* Processing Frequency */}
                                <div>
                                  <Label htmlFor="processing-frequency" className="text-sm font-medium">Processing Frequency</Label>
                                  <p className="text-xs text-gray-600 mb-3">How often to check and process emails</p>
                                  <Select
                                    value={emailExecutiveSettings.schedule.frequency}
                                    onValueChange={(value) => 
                                      setEmailExecutiveSettings(prev => ({ 
                                        ...prev, 
                                        schedule: { ...prev.schedule, frequency: value }
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-full rounded-md">
                                      <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="realtime">Real-time (as emails arrive)</SelectItem>
                                      <SelectItem value="hourly">Every hour</SelectItem>
                                      <SelectItem value="daily">Daily</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Time Selection for scheduled processing */}
                                {(emailExecutiveSettings.schedule.frequency === 'hourly' || emailExecutiveSettings.schedule.frequency === 'daily') && (
                                  <>
                                    <Separator />
                                    <div>
                                      <Label htmlFor="processing-time" className="text-sm font-medium">Processing Time</Label>
                                      <p className="text-xs text-gray-600 mb-3">
                                        {emailExecutiveSettings.schedule.frequency === 'hourly' 
                                          ? 'Starting time for hourly processing'
                                          : 'Daily processing time'
                                        }
                                      </p>
                                      <Input
                                        id="processing-time"
                                        type="time"
                                        value={emailExecutiveSettings.schedule.time}
                                        onChange={(e) => 
                                          setEmailExecutiveSettings(prev => ({ 
                                            ...prev, 
                                            schedule: { ...prev.schedule, time: e.target.value }
                                          }))
                                        }
                                        className="w-32 rounded-md"
                                      />
                                    </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-sm text-gray-500">Enable the Email Executive Assistant in the General tab to configure scheduling options.</p>
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
                          src={emailExecutiveSettings.integration === 'outlook' ? '/outlook.png' : '/gmail.png'}
                          alt={emailExecutiveSettings.integration === 'outlook' ? 'Outlook' : 'Gmail'}
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium capitalize">{emailExecutiveSettings.integration}</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings Summary */}
              {emailExecutiveSettings.enabled && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium mb-3 text-gray-600">Current Settings</h3>
                  <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Categories:</span>
                      <span className="text-xs font-medium">{emailExecutiveSettings.categories.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Draft Mode:</span>
                      <span className="text-xs font-medium capitalize">{emailExecutiveSettings.draftSettings.mode}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Processing:</span>
                      <span className="text-xs font-medium capitalize">{emailExecutiveSettings.schedule.frequency}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Approval:</span>
                      <span className="text-xs font-medium">{emailExecutiveSettings.draftSettings.approvalRequired ? 'Required' : 'Auto-send'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Connect Button Section */}
              <div className="border-t border-gray-200 pt-4 mt-auto">
                <div className="space-y-3">
                  {showEmailExecutiveConfiguration ? (
                    <Button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        if (!user?.uid) return
                        
                        try {
                          const agentRef = doc(db, 'merchants', user.uid, 'agentsenrolled', 'email-executive')
                          
                          // Get the current document to preserve other fields
                          const currentDoc = await getDoc(agentRef)
                          const currentData = currentDoc.exists() ? currentDoc.data() : {}
                          
                          // Prepare settings with capitalised category IDs for Firestore
                          const settingsForFirestore = prepareSettingsForFirestore(emailExecutiveSettings)
                          
                          // Completely overwrite the document with new settings
                          await setDoc(agentRef, {
                            ...currentData,
                            settings: settingsForFirestore, // Use the prepared settings with capitalised IDs
                            lastUpdated: serverTimestamp()
                          })
                          
                          // Also update the schedule in the top-level agentschedule collection if it exists and not realtime
                          if (currentData.scheduleId && emailExecutiveSettings.schedule.frequency !== 'realtime') {
                            const scheduleRef = doc(db, 'agentschedule', currentData.scheduleId)
                            await setDoc(scheduleRef, {
                              merchantId: user.uid,
                              agentname: 'email-executive',
                              agentId: 'email-executive',
                              agentName: 'Email Executive Assistant',
                              schedule: settingsForFirestore.schedule,
                              enabled: settingsForFirestore.enabled,
                              createdAt: serverTimestamp(),
                              lastUpdated: serverTimestamp()
                            })
                          }
                          
                          toast({
                            title: "Configuration Saved",
                            description: "Email Executive Assistant settings have been updated successfully."
                          })
                          setShowEmailExecutiveConfiguration(false)
                        } catch (error) {
                          console.error('Error saving Email Executive configuration:', error)
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
                  
                  {enrolledAgents['email-executive']?.status === 'active' ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleEmailExecutiveConnect}
                      disabled={connectingAgents.has('email-executive')}
                      className="w-full rounded-md"
                    >
                      {connectingAgents.has('email-executive') ? 'Disconnecting...' : 'Disconnect Agent'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleEmailExecutiveConnect}
                      disabled={connectingAgents.has('email-executive')}
                      className="w-full rounded-md"
                    >
                      {connectingAgents.has('email-executive') ? 'Connecting...' : 'Connect Agent'}
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
      <Dialog 
        open={isCreateAgentModalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // Reset selected custom agent when closing
            setSelectedCustomAgent(null)
            // Reset form when closing
            setCreateAgentForm({ name: 'New Agent', steps: [''] })
            setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
            setSelectedTools(new Set())
            setToolsSearchQuery('')
            setSmartCreatePrompt('')
            setShowSmartCreateInput(false)
            setAgentCanvasContent('')
            setShowToolsDropdown(false)
            setToolsDropdownQuery('')
            setSelectedToolIndex(0)
            setFilteredTools([])
            setAtMentionPosition(0)
            setCreateAgentDebugResponse(null)
            setNotificationSettings({
              sendToInbox: true,
              sendViaEmail: false,
              emailAddress: notificationSettings.emailAddress, // Keep the merchant's email
              emailFormat: "professional"
            })
          }
          setIsCreateAgentModalOpen(open)
        }}
      >
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden p-0">
            <DialogPrimitive.Title className="sr-only">Create Custom Agent</DialogPrimitive.Title>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          <div className="flex h-full focus:outline-none">
            {/* Main Content - Left Section */}
            <div className="flex-1 flex flex-col h-full p-6 pr-4 overflow-y-auto focus:outline-none">
              <DialogHeader className="mb-6 focus:outline-none">
                <div className="flex items-center justify-between focus:outline-none">
                  <div className="flex items-center gap-3">
                    {isEditingAgentName ? (
                      <Input
                        value={createAgentForm.name}
                        onChange={(e) => setCreateAgentForm(prev => ({ ...prev, name: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            setIsEditingAgentName(false)
                          }
                        }}
                        onBlur={() => setIsEditingAgentName(false)}
                        className="text-xl font-semibold border-0 p-0 h-auto focus:ring-0 bg-transparent outline-none focus:outline-none shadow-none"
                        autoFocus
                      />
                    ) : (
                      <DialogTitle 
                        className="text-xl font-semibold cursor-text px-0 py-0"
                        onDoubleClick={() => setIsEditingAgentName(true)}
                      >
                        {createAgentForm.name}
                      </DialogTitle>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Schedule Information Display */}
                    {createAgentSchedule.frequency && (
                      <div className="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3 text-gray-600" />
                          <span className="font-medium text-gray-700 capitalize">{createAgentSchedule.frequency}</span>
                          <span className="text-gray-500">at {createAgentSchedule.time}</span>
                          {createAgentSchedule.frequency === 'weekly' && createAgentSchedule.selectedDay && (
                            <span className="text-gray-500">on {capitaliseFirstLetter(createAgentSchedule.selectedDay)}</span>
                          )}
                          {createAgentSchedule.frequency === 'monthly' && createAgentSchedule.days[0] && (
                            <span className="text-gray-500">on day {createAgentSchedule.days[0]}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <TooltipProvider>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowSmartCreateInput(!showSmartCreateInput)
                              }}
                              className="rounded-md h-8 w-8 p-0"
                            >
                              <Wand2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Smart Create - Generate agent with AI</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
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
                                  setIsLoadingAgentIdeas(true)
                            
                            toast({
                              title: "Generating Agent Ideas",
                              description: "AI is analysing your business and available tools...",
                            })

                            const functions = getFunctions()
                            const generateAgentIdeas = httpsCallable(functions, 'generateAgentIdeas')
                            
                            const result = await generateAgentIdeas({
                              merchantId: user.uid
                            })

                            const data = result.data as any

                            setAgentIdeas(data)

                            if (data && data.agentIdeas) {
                              toast({
                                title: "Agent Ideas Generated!",
                                description: `Found ${data.agentIdeas.length} agent ideas for your business.`,
                              })
                            } else {
                              toast({
                                title: "Ideas Generated",
                                description: "Agent ideas have been generated successfully.",
                              })
                            }
                          } catch (error) {
                                  console.error('Error generating agent ideas:', error)
                            toast({
                              title: "Generation Failed",
                              description: error instanceof Error ? error.message : "Failed to generate agent ideas. Please try again.",
                              variant: "destructive"
                            })
                          } finally {
                                  setIsLoadingAgentIdeas(false)
                          }
                        }}
                        disabled={isLoadingAgentIdeas}
                              className="rounded-md h-8 w-8 p-0"
                      >
                        {isLoadingAgentIdeas ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        ) : (
                          <Brain className="h-4 w-4" />
                        )}
                      </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate Ideas - Get AI agent suggestions</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                                className="rounded-md h-8 w-8 p-0"
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
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Schedule - Set when agent runs</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {/* Vertical Separator */}
                        <div className="h-6 w-px bg-gray-200 mx-2"></div>
                        
                        {/* Tools Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowToolsInLeftPanel(!showToolsInLeftPanel)}
                              className={cn(
                                "rounded-md h-8 w-8 p-0",
                                showToolsInLeftPanel && "bg-gray-100"
                              )}
                            >
                              <Puzzle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tools - View available integrations</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </div>
              </DialogHeader>

              {/* Main Content */}
              <div className="space-y-6">
                {/* Agent Canvas */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold">Instructions</h3>
                    {agentCanvasContent && typeof agentCanvasContent === 'string' && agentCanvasContent.trim() && isEditingCanvas && !showSmartCreateInput && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingCanvas(false)}
                        className="rounded-md opacity-70 hover:opacity-100"
                      >
                        Done
                      </Button>
                    )}
                  </div>

                  {/* Smart Create Input */}
                  {showSmartCreateInput && (
                    <div className="mb-4">
                      <div className={cn(
                        "overflow-hidden transition-all duration-700 ease-in-out",
                        isGeneratingSteps ? "max-h-0 opacity-0" : "max-h-[200px] opacity-100"
                      )}>
                        <Textarea
                          placeholder="What are you trying to achieve..."
                          value={smartCreatePrompt}
                          onChange={(e) => setSmartCreatePrompt(e.target.value)}
                          className="min-h-[120px] rounded-md focus:ring-0 focus:ring-offset-0"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              
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
                              
                              console.log('🔧 [CreateAgent] Starting createAgentExecutionPlan call')
                              console.log('🔧 [CreateAgent] User ID:', user.uid)
                              console.log('🔧 [CreateAgent] Smart prompt:', smartCreatePrompt)
                              
                              toast({
                                  title: "Generating Agent Definition",
                                  description: "AI is creating your agent definition...",
                              })

                              const functions = getFunctions()
                              const createAgentExecutionPlan = httpsCallable(functions, 'createAgentExecutionPlan')
                              
                              console.log('🔧 [CreateAgent] Calling function with params:', {
                                prompt: smartCreatePrompt,
                                merchantId: user.uid
                              })
                              
                              const result = await createAgentExecutionPlan({
                                prompt: smartCreatePrompt,
                                merchantId: user.uid
                              })

                              console.log('🔧 [CreateAgent] Function call completed')
                              console.log('🔧 [CreateAgent] Raw result:', result)
                              
                              const data = result.data as any
                              console.log('🔧 [CreateAgent] Extracted data:', data)
                              console.log('🔧 [CreateAgent] Data type:', typeof data)
                              console.log('🔧 [CreateAgent] Data keys:', data ? Object.keys(data) : 'No data')
                                
                              // Store the full response for debugging
                              setCreateAgentDebugResponse(JSON.stringify(data, null, 2))
                              console.log('🔧 [CreateAgent] Debug response stored in UI')
                              if (data && data.promptv2) {
                                  console.log('✅ [CreateAgent] Found promptv2:', data.promptv2)
                                  setAgentCanvasContent(data.promptv2)
                                  setIsEditingCanvas(false) // Exit edit mode to show formatted content
                                  setShowSmartCreateInput(false)
                                  setSmartCreatePrompt('')
                                
                                  // Extract and store the agent description
                                  if (data.executionPlan && data.executionPlan.agentDescription) {
                                    console.log('✅ [CreateAgent] Found agentDescription:', data.executionPlan.agentDescription)
                                    setAgentDescription(data.executionPlan.agentDescription)
                                  }
                                  
                                  // Check if schedule information is provided in the response
                                  if (data.executionPlan && data.executionPlan.schedule) {
                                    console.log('✅ [CreateAgent] Found schedule information:', data.executionPlan.schedule)
                                    setCreateAgentSchedule({
                                      frequency: data.executionPlan.schedule.frequency || 'weekly',
                                      time: data.executionPlan.schedule.time || '07:00',
                                      days: data.executionPlan.schedule.days || ['monday'],
                                      selectedDay: data.executionPlan.schedule.days && data.executionPlan.schedule.days[0] ? data.executionPlan.schedule.days[0] : 'monday'
                                    })
                                  } else if (data.schedule) {
                                    console.log('✅ [CreateAgent] Found direct schedule information:', data.schedule)
                                    setCreateAgentSchedule({
                                      frequency: data.schedule.frequency || 'weekly',
                                      time: data.schedule.time || '07:00',
                                      days: data.schedule.days || ['monday'],
                                      selectedDay: data.schedule.days && data.schedule.days[0] ? data.schedule.days[0] : 'monday'
                                    })
                                  }
                                
                                  toast({
                                    title: "Agent Definition Generated!",
                                    description: "Review and edit the generated definition below.",
                                  })
                              } else {
                                console.error('❌ [CreateAgent] No promptv2 found in response')
                                console.error('❌ [CreateAgent] Available fields:', data ? Object.keys(data) : 'No data object')
                                throw new Error('No promptv2 found in response')
                              }
                            } catch (error) {
                                console.error('❌ [CreateAgent] Error in createAgentExecutionPlan:', error)
                                console.error('❌ [CreateAgent] Error type:', error instanceof Error ? error.constructor.name : typeof error)
                                console.error('❌ [CreateAgent] Error message:', error instanceof Error ? error.message : String(error))
                                console.error('❌ [CreateAgent] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
                              toast({
                                title: "Generation Failed",
                                  description: error instanceof Error ? error.message : "Failed to generate agent definition. Please try again.",
                                variant: "destructive"
                              })
                            } finally {
                              console.log('🔧 [CreateAgent] Cleaning up, setting isGeneratingSteps to false')
                              setIsGeneratingSteps(false)
                              }
                            }
                          }}
                          style={{ whiteSpace: 'pre-wrap' }}
                        />
                      </div>

                      <div className={cn(
                        "transition-all duration-700 ease-in-out",
                        isGeneratingSteps ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 absolute"
                      )}>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                          <span 
                            className="font-medium relative"
                            style={{
                              background: 'linear-gradient(90deg, #007AFF, #5E6D7A, #8E8E93, #007AFF)',
                              backgroundSize: '200% 100%',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              animation: 'gradient-shift 2s ease-in-out infinite'
                            }}
                          >
                            Generating...
                          </span>
                        </div>
                      </div>
                      
                      {!isGeneratingSteps && (
                        <div className="mt-4 text-sm text-gray-900">
                          <h4 className="font-medium mb-2">How to prompt effectively:</h4>
                          <ul className="space-y-2 pl-4 list-disc">
                            <li>Be specific about what you want the agent to achieve</li>
                            <li>Include any specific tools you want to use (e.g., Gmail, Calendar)</li>
                            <li>Mention the frequency of execution if relevant (daily, weekly)</li>
                            <li>Include any specific data formats or outputs you need</li>
                            <li>Describe the problem you're solving rather than implementation details</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Agent Canvas or Tools Panel */}
                  {!showSmartCreateInput && (
                    <>
                      {!showToolsInLeftPanel ? (
                        <div className="relative flex-1" style={{ height: "auto", minHeight: "500px" }}>
                          {agentCanvasContent && typeof agentCanvasContent === 'string' && agentCanvasContent.trim() && !isEditingCanvas ? (
                            /* Display mode with tool highlighting - Moved outside container */
                            <div 
                              onDoubleClick={() => setIsEditingCanvas(true)} 
                              style={{ cursor: "pointer" }} 
                              className="h-[500px] overflow-y-auto py-1 text-sm leading-relaxed whitespace-pre-wrap [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300"
                            >
                              {renderTextWithTools(agentCanvasContent)}
                            </div>
                          ) : (
                            /* Edit mode - textarea */
                            <div className="relative h-full">
                              <Textarea
                                placeholder={`## Objective
Describe the main purpose and goal of your agent...

## Steps
1. First step the agent should take...
2. Second step the agent should take...
3. Continue adding steps...

## Tools Used
@gmail - For email operations
@calendar - For scheduling
@sheets - For data management
(Type @ to see available tools)`}
                                value={agentCanvasContent}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setAgentCanvasContent(value)
                                  
                                  // Check for @ mentions
                                  const cursorPosition = e.target.selectionStart
                                  const textBeforeCursor = value.substring(0, cursorPosition)
                                  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
                                  
                                  if (lastAtIndex !== -1) {
                                    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
                                    // Show tools dropdown if @ is followed by word characters or is at the end
                                    if (/^\w*$/.test(textAfterAt)) {
                                      setShowToolsDropdown(true)
                                      setToolsDropdownQuery(textAfterAt.toLowerCase())
                                      setAtMentionPosition(lastAtIndex)
                                    } else {
                                      setShowToolsDropdown(false)
                                    }
                                  } else {
                                    setShowToolsDropdown(false)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Handle tool selection with Enter or Tab
                                  if ((e.key === 'Enter' || e.key === 'Tab') && showToolsDropdown && filteredTools.length > 0) {
                                    e.preventDefault()
                                    const selectedTool = filteredTools[selectedToolIndex]
                                    insertToolMention(selectedTool)
                                  }
                                  // Handle arrow keys for tool selection
                                  else if (e.key === 'ArrowDown' && showToolsDropdown) {
                                    e.preventDefault()
                                    setSelectedToolIndex(prev => Math.min(prev + 1, filteredTools.length - 1))
                                  }
                                  else if (e.key === 'ArrowUp' && showToolsDropdown) {
                                    e.preventDefault()
                                    setSelectedToolIndex(prev => Math.max(prev - 1, 0))
                                  }
                                  // Hide dropdown on Escape
                                  else if (e.key === 'Escape') {
                                    setShowToolsDropdown(false)
                                  }
                                }}
                                className="rounded-md h-[500px] text-sm leading-relaxed resize-none"
                                style={{ whiteSpace: 'pre-wrap' }}
                              />
                            </div>
                          )}
                          
                          {/* Tools Dropdown */}
                          {showToolsDropdown && (
                            <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
                                 style={{
                                   top: '200px', // Approximate position, you might want to calculate this dynamically
                                   left: '20px',
                                   minWidth: '200px'
                                 }}>
                              {filteredTools.length > 0 ? (
                                filteredTools.map((tool, index) => (
                                  <button
                                    key={tool.slug}
                                    onClick={() => insertToolMention(tool)}
                                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                                      index === selectedToolIndex ? 'bg-blue-50' : ''
                                    }`}
                                  >
                                    {tool.deprecated?.toolkit?.logo ? (
                                      <img
                                        src={tool.deprecated.toolkit.logo}
                                        alt={tool.toolkit?.name || tool.name}
                                        className="w-4 h-4 rounded flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-medium text-gray-600">
                                          {tool.name.charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-sm font-medium">
                                        {tool.name.replace(/^(GMAIL_|GOOGLECALENDAR_|GOOGLEDOCS_|GOOGLESHEETS_)/i, '').toLowerCase().replace(/_/g, ' ')}
                                      </div>
                                      <div className="text-xs text-gray-500">{tool.toolkit?.name}</div>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">No tools found</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Tools Panel */
                        <div className="relative flex-1" style={{ height: "auto", minHeight: "500px" }}>
                          <div className="border border-gray-200 rounded-md h-[500px] overflow-y-auto p-4 bg-white [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
                            <div className="mb-4">
                              <h3 className="text-sm font-medium text-gray-700">Available Tools</h3>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Select tools to use in your agent or mention them with @ in your agent definition.</p>
                            
                            {/* Tools Search */}
                            <div className="mb-4">
                              <Input
                                placeholder="Search tools..."
                                value={toolsSearchQuery}
                                onChange={(e) => setToolsSearchQuery(e.target.value)}
                                className="rounded-md h-8 text-sm"
                              />
                            </div>
                            
                            {/* Tools List with Descriptions */}
                            <div className="space-y-3">
                              {toolsLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                  <span className="ml-2 text-xs text-gray-600">Loading tools...</span>
                                </div>
                              ) : composioTools.length === 0 ? (
                                <div className="text-center py-6">
                                  <p className="text-xs text-gray-500 mb-2">No connected tools</p>
                                  <p className="text-xs text-gray-400">Connect integrations first</p>
                                </div>
                              ) : (
                                composioTools.map((tool) => (
                                  <div 
                                    key={tool.slug}
                                    className={cn(
                                      "border rounded-md p-3 transition-all duration-200",
                                      selectedTools.has(tool.slug)
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    )}
                                  >
                                    <div 
                                      className="flex items-start gap-3 cursor-pointer"
                                      onClick={() => {
                                        const newSelected = new Set(selectedTools)
                                        if (newSelected.has(tool.slug)) {
                                          newSelected.delete(tool.slug)
                                        } else {
                                          newSelected.add(tool.slug)
                                        }
                                        setSelectedTools(newSelected)
                                      }}
                                    >
                                      <div className="flex-shrink-0 mt-0.5">
                                        {tool.deprecated?.toolkit?.logo ? (
                                          <img
                                            src={tool.deprecated.toolkit.logo}
                                            alt={tool.toolkit?.name || tool.name}
                                            className="w-5 h-5 rounded"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        ) : (
                                          <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center">
                                            <span className="text-xs font-medium text-gray-600">
                                              {tool.name.charAt(0)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <h4 className="text-sm font-medium text-gray-800 truncate">
                                            {tool.name.replace(/^(GMAIL_|GOOGLECALENDAR_|GOOGLEDOCS_|GOOGLESHEETS_)/i, '').toLowerCase().replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                          </h4>
                                          <div className="flex-shrink-0">
                                            <CheckCircle className={cn(
                                              "h-4 w-4 transition-opacity",
                                              selectedTools.has(tool.slug) ? "text-blue-500 opacity-100" : "text-gray-300 opacity-0"
                                            )} />
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-1">{tool.description || "No description available"}</p>
                                        {tool.toolkit && (
                                          <div className="flex items-center gap-1 text-xs text-gray-500">
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
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="w-px bg-gray-200"></div>
            {/* Right Sidebar */}
            <div className="w-80 p-6 pl-4 bg-gray-50 flex flex-col h-full">
              {/* Right Panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {/* Notification Options */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3 text-gray-600">Notification Options</h3>
                    
                    <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Agent Inbox</p>
                            <p className="text-xs text-gray-500">Receive notifications in your agent inbox</p>
                          </div>
                          <Switch 
                            id="inbox-notification" 
                            checked={notificationSettings.sendToInbox}
                            onCheckedChange={(checked) => {
                              // If turning off inbox and email is also off, force email on
                              if (!checked && !notificationSettings.sendViaEmail) {
                                setNotificationSettings(prev => ({ 
                                  ...prev, 
                                  sendToInbox: false,
                                  sendViaEmail: true 
                                }))
                              } else {
                                setNotificationSettings(prev => ({ ...prev, sendToInbox: checked }))
                              }
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Email Notifications</p>
                            <p className="text-xs text-gray-500">Receive email updates when the agent runs</p>
                          </div>
                          <Switch 
                            id="email-notification" 
                            checked={notificationSettings.sendViaEmail}
                            onCheckedChange={(checked) => {
                              // If turning off email and inbox is also off, force inbox on
                              if (!checked && !notificationSettings.sendToInbox) {
                                setNotificationSettings(prev => ({ 
                                  ...prev, 
                                  sendViaEmail: false,
                                  sendToInbox: true 
                                }))
                              } else {
                                setNotificationSettings(prev => ({ ...prev, sendViaEmail: checked }))
                              }
                            }}
                          />
                        </div>
                        
                        {/* Email Settings - conditionally shown */}
                        {notificationSettings.sendViaEmail && (
                          <div className="space-y-3 border-t border-gray-100 pt-3 mt-2">
                            <Label htmlFor="email-address" className="text-sm font-medium">Email Address</Label>
                            <Input 
                              id="email-address" 
                              placeholder="you@example.com" 
                              value={notificationSettings.emailAddress}
                              onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailAddress: e.target.value }))}
                              className="text-xs h-8 rounded-md bg-gray-50"
                            />
                            <p className="text-xs text-gray-500">We'll send notifications to this email address</p>
                            
                            <div className="pt-2">
                              <Label htmlFor="email-format" className="text-sm font-medium">Email Format</Label>
                              {/* Sub-Tab Container */}
                              <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mt-1">
                                <button
                                  type="button"
                                  onClick={() => setNotificationSettings(prev => ({ ...prev, emailFormat: "professional" }))}
                                  className={cn(
                                    "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    notificationSettings.emailFormat === "professional"
                                      ? "text-gray-800 bg-white shadow-sm"
                                      : "text-gray-600 hover:bg-gray-200/70"
                                  )}
                                >
                                  <FileText className="h-3 w-3" />
                                  Professional
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNotificationSettings(prev => ({ ...prev, emailFormat: "simple" }))}
                                  className={cn(
                                    "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                                    notificationSettings.emailFormat === "simple"
                                      ? "text-gray-800 bg-white shadow-sm"
                                      : "text-gray-600 hover:bg-gray-200/70"
                                  )}
                                >
                                  <AlignLeft className="h-3 w-3" />
                                  Simple
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
                                <div className="w-4 h-4 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
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

                  {/* Debugging Section */}
                  {createAgentDebugResponse && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3 text-gray-600">Debugging</h3>
                      
                      <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Debug Response Available</p>
                              <p className="text-xs text-gray-500">View detailed execution plan response</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDebugDialog(true)}
                              className="rounded-md h-8 text-xs"
                            >
                              <Bug className="w-3 h-3 mr-1" />
                              View Debug
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Selected Tools Details */}
                </div>

                {/* Create Button Section - Fixed at bottom */}
                <div className="border-t border-gray-200 pt-4 mt-auto sticky bottom-0 bg-gray-50">
                  <div className="space-y-3">
                    <Button
                      type="button"
                      onClick={async () => {
                        try {
                          setIsCreatingAgent(true)
                          
                          // Validate that schedule is set
                          if (!createAgentSchedule.frequency) {
                            toast({
                              title: "Schedule Required",
                              description: "Please select a schedule frequency before creating the agent.",
                              variant: "destructive"
                            })
                            setIsCreatingAgent(false)
                            return
                          }
                          
                          // Validate agentCanvasContent
                          if (!agentCanvasContent || typeof agentCanvasContent !== 'string' || !agentCanvasContent.trim()) {
                            toast({
                              title: "Agent Definition Required",
                              description: "Please define your agent in the canvas above.",
                              variant: "destructive"
                            })
                            setIsCreatingAgent(false)
                            return
                          }
                          
                          // Generate a unique schedule ID for this custom agent
                          const scheduleId = `${user?.uid}_custom_${Date.now()}`
                          
                          const agentData = {
                            agentName: createAgentForm.name,
                            type: 'custom',
                            status: 'active',
                            prompt: agentCanvasContent,
                            agentDescription: agentDescription || 'AI agent that executes multi-step tasks',
                            scheduleId: scheduleId, // Store reference to schedule document
                            settings: {
                              schedule: {
                                frequency: createAgentSchedule.frequency,
                                time: createAgentSchedule.time,
                                days: createAgentSchedule.days,
                                selectedDay: createAgentSchedule.selectedDay
                              },
                              selectedTools: Array.from(selectedTools),
                              notifications: {
                                sendToInbox: notificationSettings.sendToInbox,
                                sendViaEmail: notificationSettings.sendViaEmail,
                                emailAddress: notificationSettings.emailAddress,
                                emailFormat: notificationSettings.emailFormat
                              }
                            },
                            enrolledAt: new Date(),
                            lastUpdated: new Date()
                          }
                          
                          let agentDocRef;
                          
                          // If we're editing an existing agent, update it
                          if (selectedCustomAgent) {
                            const agentId = selectedCustomAgent.id
                            agentDocRef = doc(db, 'merchants', user?.uid || '', 'agentsenrolled', agentId)
                            
                            // Ensure agentId is set in the agent data
                            const updatedAgentData = {
                              ...agentData,
                              agentId: agentId // Explicitly set the agentId to the document ID
                            }
                            
                            await updateDoc(agentDocRef, updatedAgentData)
                            
                            // Also update the agentschedule collection
                            const scheduleRef = doc(db, 'agentschedule', selectedCustomAgent.scheduleId || scheduleId)
                            const scheduleData = {
                              merchantId: user?.uid,
                              agentname: createAgentForm.name,
                              agentId: agentId, // Use the document ID as agentId
                              agentName: createAgentForm.name,
                              schedule: updatedAgentData.settings.schedule,
                              enabled: true,
                              lastUpdated: new Date()
                            }
                            await updateDoc(scheduleRef, scheduleData).catch(async err => {
                              console.log('Schedule document may not exist, creating new one:', err.message)
                              // If update fails (document doesn't exist), create a new one
                              await setDoc(scheduleRef, {
                                ...scheduleData,
                                createdAt: new Date()
                              })
                            })
                            
                            toast({
                              title: "Agent Updated!",
                              description: `${createAgentForm.name} has been updated successfully.`
                            })
                          } else {
                            // Otherwise create a new agent
                            agentDocRef = await addDoc(collection(db, 'merchants', user?.uid || '', 'agentsenrolled'), agentData)
                            
                            // Update the agent document with its own ID as agentId
                            const agentId = agentDocRef.id
                            await updateDoc(agentDocRef, { agentId })
                            
                            // Also save schedule data to top-level agentschedule collection
                            const scheduleRef = doc(db, 'agentschedule', scheduleId)
                            const scheduleData = {
                              merchantId: user?.uid,
                              agentname: createAgentForm.name,
                              agentId: agentId, // Use the document ID as agentId
                              agentName: createAgentForm.name,
                              schedule: agentData.settings.schedule,
                              enabled: true,
                              createdAt: new Date(),
                              lastUpdated: new Date()
                            }
                            await setDoc(scheduleRef, scheduleData)
                            
                            toast({
                              title: "Agent Created!",
                              description: `${createAgentForm.name} has been created successfully.`
                            })
                          }
                          
                          // Refresh custom agents list
                          const customAgentsRef = collection(db, 'merchants', user?.uid || '', 'agentsenrolled')
                          const customAgentsQuery = query(customAgentsRef, orderBy('enrolledAt', 'desc'))
                          const refreshSnapshot = await getDocs(customAgentsQuery)
                          const refreshedCustomAgents = refreshSnapshot.docs
                            .map(doc => ({
                              id: doc.id,
                              ...doc.data()
                            }))
                            .filter((agent: any) => agent.type === 'custom')
                          setCustomAgents(refreshedCustomAgents)
                        
                          // Reset form and close modal
                          setSelectedCustomAgent(null)
                          setCreateAgentForm({ name: 'New Agent', steps: [''] })
                          setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
                          setSelectedTools(new Set())
                          setToolsSearchQuery('')
                          setSmartCreatePrompt('')
                          setShowSmartCreateInput(false)
                          setAgentCanvasContent('')
                          setAgentDescription('')
                          setShowToolsDropdown(false)
                          setToolsDropdownQuery('')
                          setSelectedToolIndex(0)
                          setFilteredTools([])
                          setAtMentionPosition(0)
                          setCreateAgentDebugResponse(null)
                          setIsCreateAgentModalOpen(false)
                        } catch (error) {
                          console.error('Error saving agent:', error)
                          toast({
                            title: "Error",
                            description: "Failed to save agent. Please try again.",
                            variant: "destructive"
                          })
                        } finally {
                          setIsCreatingAgent(false)
                        }
                      }}
                      disabled={isCreatingAgent || !agentCanvasContent || typeof agentCanvasContent !== 'string' || !agentCanvasContent.trim() || !createAgentForm.name.trim() || !createAgentSchedule.frequency}
                      className="w-full rounded-md"
                    >
                      {isCreatingAgent ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {selectedCustomAgent ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        selectedCustomAgent ? 'Update Agent' : 'Create Agent'
                      )}
                    </Button>
                    
                    {selectedCustomAgent && (
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          try {
                            if (confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
                              const agentId = selectedCustomAgent.id
                              
                              // Delete the agent from agentsenrolled collection
                              await deleteDoc(doc(db, 'merchants', user?.uid || '', 'agentsenrolled', agentId))
                              
                              // Also delete from the top-level agentschedule collection if it exists
                              if (selectedCustomAgent.scheduleId) {
                                const scheduleRef = doc(db, 'agentschedule', selectedCustomAgent.scheduleId)
                                await deleteDoc(scheduleRef).catch(err => {
                                  // Ignore errors if the schedule document doesn't exist
                                  console.log('Schedule may not exist or was already deleted:', err.message)
                                })
                              }
                              
                              toast({
                                title: "Agent Deleted",
                                description: `${selectedCustomAgent.agentName} has been deleted successfully.`
                              })
                              
                              // Refresh custom agents list
                              await loadCustomAgents()
                              
                              // Reset form and close modal
                              setSelectedCustomAgent(null)
                              setCreateAgentForm({ name: 'New Agent', steps: [''] })
                              setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
                              setSelectedTools(new Set())
                              setToolsSearchQuery('')
                              setSmartCreatePrompt('')
                              setShowSmartCreateInput(false)
                              setAgentCanvasContent('')
                              setAgentDescription('')
                              setShowToolsDropdown(false)
                              setToolsDropdownQuery('')
                              setSelectedToolIndex(0)
                              setFilteredTools([])
                              setAtMentionPosition(0)
                              setCreateAgentDebugResponse(null)
                              setIsCreateAgentModalOpen(false)
                            }
                          } catch (error) {
                            console.error('Error deleting agent:', error)
                            toast({
                              title: "Error",
                              description: "Failed to delete agent. Please try again.",
                              variant: "destructive"
                            })
                          }
                        }}
                        className="w-full rounded-md"
                      >
                        Delete Agent
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCustomAgent(null)
                        setCreateAgentForm({ name: 'New Agent', steps: [''] })
                        setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
                        setSelectedTools(new Set())
                        setToolsSearchQuery('')
                        setSmartCreatePrompt('')
                        setShowSmartCreateInput(false)
                        setAgentCanvasContent('')
                        setAgentDescription('')
                        setShowToolsDropdown(false)
                        setToolsDropdownQuery('')
                        setSelectedToolIndex(0)
                        setFilteredTools([])
                        setAtMentionPosition(0)
                        setCreateAgentDebugResponse(null)
                        setNotificationSettings({
                          sendToInbox: true,
                          sendViaEmail: false,
                          emailAddress: notificationSettings.emailAddress, // Keep the merchant's email
                          emailFormat: "professional"
                        })
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

      {/* Debug Dialog */}
      {createAgentDebugResponse && (
        <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
          <DialogPortal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden p-6">
              <DialogPrimitive.Title className="sr-only">Debug Information</DialogPrimitive.Title>
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
              <div>
                <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
                  <h3 className="text-sm font-medium mb-2 text-gray-700">createAgentExecutionPlan Response</h3>
                  <pre className="text-xs overflow-auto bg-white p-3 rounded-md max-h-[60vh] text-gray-700 whitespace-pre-wrap border border-gray-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
                    {createAgentDebugResponse}
                  </pre>
                </div>
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setShowDebugDialog(false);
                      setCreateAgentDebugResponse(null);
                    }}
                    className="rounded-md"
                  >
                    Clear & Close
                  </Button>
                </div>
              </div>
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      )}
    </div>
  )
} 

