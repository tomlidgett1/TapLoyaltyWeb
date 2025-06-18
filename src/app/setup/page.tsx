"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  ChevronRight,
  Gift,
  Store,
  LinkIcon,
  Database,
  Users,
  Bot,
  BarChart,
  Zap,
  Sparkles,
  Layers,
  Lock,
  Shield,
  ExternalLink,
  ChevronDown,
  Info,
  Globe,
  Target,
  TrendingUp,
  FileText,
  HelpCircle,
  X,
  CreditCard,
  DollarSign,
  ChevronLeft,
  Clock,
  Mail,
  ShoppingCart,
  Brain,
  Image as ImageIcon,
  Star,
  RotateCcw,
  Settings
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Add custom styles
const setupStyles = `
  .tab-section {
    opacity: 0;
    animation: fadeIn 0.6s ease-out forwards;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .integration-card {
    background: #f7f7f7;
    border-radius: 12px;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    overflow: hidden;
  }
  
  .integration-card:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  }
  
  /* Discreet scrollbar styles */
  .content-area::-webkit-scrollbar {
    width: 4px;
  }
  
  .content-area::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.02);
  }
  
  .content-area::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
  
  .content-area::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.15);
  }
  
  /* GitHub-style tabs */
  .github-tabs {
    display: flex;
    border-bottom: 1px solid #e1e4e8;
    margin-bottom: 24px;
  }
  
  .tab-item {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    color: #24292f;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    margin-right: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .tab-item:hover {
    border-bottom-color: #d0d0d0;
  }
  
  .tab-item.active {
    border-bottom-color: #0969da;
    font-weight: 600;
  }
  
  /* Cards */
  .card-group {
    margin-bottom: 48px;
  }
  
  .card-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #333;
  }
  
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }
  
  .logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    margin-bottom: 16px;
  }
  
  .logo-container.large {
    height: 60px;
  }
  
  .connect-btn {
    transition: all 0.2s ease;
  }
  
  .connect-btn:hover {
    transform: translateX(2px);
  }
  
  .connected-badge {
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #34A853;
    padding: 6px 10px;
    background-color: rgba(52, 168, 83, 0.1);
    border-radius: 6px;
  }
  
  .page-header {
    margin-bottom: 24px;
  }
  
  .enterprise-banner {
    margin-bottom: 28px;
    padding: 16px;
    background-color: #f6f9fe;
    border-radius: 12px;
    border: 1px solid #e1e9f6;
  }
  
  .info-icon {
    color: #9ca3af;
    width: 14px;
    height: 14px;
    cursor: help;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }
  
  .info-icon:hover {
    opacity: 1;
  }
  
  /* Custom tooltip styling */
  .custom-tooltip {
    background-color: #262626;
    color: #f3f4f6;
    font-size: 11px;
    line-height: 1.4;
    max-width: 250px;
    padding: 6px 10px;
    border-radius: 4px;
  }
  
  /* Drawer styling */
  .info-drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    z-index: 40;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }
  
  .info-drawer-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }
  
  .info-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 500px;
    height: 100%;
    max-width: 90vw;
    background: white;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
    z-index: 50;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }
  
  .info-drawer.open {
    transform: translateX(0);
  }
  
  .info-drawer-content {
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .info-section {
    margin-bottom: 2rem;
    animation: fadeIn 0.3s ease-out forwards;
    animation-delay: 0.2s;
    opacity: 0;
  }
  
  .info-section-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .info-section-content {
    font-size: 0.875rem;
    line-height: 1.5;
    color: #4b5563;
  }
  
  .info-section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    background: #f3f4f6;
  }
  
  .integration-logo {
    padding: 0.5rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    margin-right: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
  }
  
  .integration-item {
    display: flex;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .integration-item:last-child {
    border-bottom: none;
  }
  
  .integration-content {
    flex: 1;
  }
  
  .integration-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
    font-size: 0.9375rem;
    color: #111827;
  }
  
  .integration-description {
    font-size: 0.875rem;
    color: #4b5563;
    line-height: 1.5;
  }
  
  .info-tabs {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 1.5rem;
  }
  
  .info-tab {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  
  .info-tab.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
  }
`;

// Simple Setup Card Component
const SetupCard = ({ 
  title, 
  description, 
  icon, 
  buttonText = "Connect", 
  buttonAction, 
  connected = false,
  linkHref,
  tooltip
}: { 
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText?: string;
  buttonAction?: () => void;
  connected?: boolean;
  linkHref?: string;
  tooltip?: string;
}) => {
  return (
    <div className="integration-card p-6 border border-gray-100">
      <div className="flex items-start gap-4">
        <div className="text-gray-600">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="info-icon" />
                  </TooltipTrigger>
                  <TooltipContent className="custom-tooltip" side="top" sideOffset={5}>
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">{description}</p>
          
          {connected ? (
            <div className="connected-badge">
              <Check size={14} />
              <span>Connected</span>
            </div>
          ) : (
            linkHref ? (
              <Link href={linkHref} className="inline-block">
                <Button variant="outline" size="sm" className="connect-btn rounded-md">
                  {buttonText}
                  <ChevronRight size={14} className="ml-1 opacity-70" />
                </Button>
              </Link>
            ) : (
              <Button 
                variant="outline"
                size="sm" 
                onClick={buttonAction} 
                className="connect-btn rounded-md"
              >
                {buttonText}
                <ChevronRight size={14} className="ml-1 opacity-70" />
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// Integration Logo Card
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-md bg-white">
      <button
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-gray-900">{question}</span>
        <ChevronDown 
          className={`h-5 w-5 text-gray-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-4 pt-0">
          <p className="text-gray-600 text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

const LogoCard = ({
  logo,
  title,
  connected,
  onConnect,
  large = false,
  tooltip
}: {
  logo: string;
  title: string;
  connected: boolean;
  onConnect: () => void;
  large?: boolean;
  tooltip?: string;
}) => {
  // Special case for CDR logo to make it extra large
  const isExtraLarge = logo === "/cdr.png";
  const logoSize = isExtraLarge ? 75 : (large ? 60 : 40);
  
  return (
    <div className="integration-card p-5 border border-gray-100 flex flex-col items-center">
      <div className={`logo-container ${large || isExtraLarge ? 'large' : ''}`}>
        <Image 
          src={logo} 
          alt={title} 
          width={logoSize} 
          height={logoSize}
          className="object-contain" 
        />
      </div>
      
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <h3 className="text-sm font-medium text-center text-gray-900">{title}</h3>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="info-icon" />
              </TooltipTrigger>
              <TooltipContent className="custom-tooltip" side="top" sideOffset={5}>
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      {connected ? (
        <div className="connected-badge">
          <Check size={14} />
          <span>Connected</span>
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onConnect} 
          className="connect-btn w-full rounded-md"
        >
          Connect
          <ChevronRight size={14} className="ml-1 opacity-70" />
        </Button>
      )}
    </div>
  );
};

export default function SetupPage() {
  const router = useRouter()
  const [gmailConnected, setGmailConnected] = useState(false);
  const [vaultActivated, setVaultActivated] = useState(false);
  const [csVaultActivated, setCsVaultActivated] = useState(false);
  const [csAgentActivated, setCsAgentActivated] = useState(false);
  const [insightsActivated, setInsightsActivated] = useState(false);
  const [squareConnected, setSquareConnected] = useState(false);
  const [lightspeedConnected, setLightspeedConnected] = useState(false);
  const [xeroConnected, setXeroConnected] = useState(false);
  const [openBankingConnected, setOpenBankingConnected] = useState(false);
  const [tapAgentActivated, setTapAgentActivated] = useState(false);
  const [competitorAgentActivated, setCompetitorAgentActivated] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("merchant");
  
  // Info drawer state
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState("merchant");
  
  // Integrations popup state
  const [showIntegrationsPopup, setShowIntegrationsPopup] = useState(false);
  
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
  ];
  
  // Function to handle integration connection
  const handleIntegrationConnect = (integration: typeof availableIntegrations[0]) => {
    if (integration.status === 'active') {
      toast({
        title: `${integration.name} Connected`,
        description: `Successfully connected to ${integration.name}!`
      });
      
      // Update connection state based on integration type
      if (integration.id === 'gmail') {
        setGmailConnected(true);
      } else if (integration.id === 'square') {
        setSquareConnected(true);
      } else if (integration.id === 'lightspeed') {
        setLightspeedConnected(true);
      } else if (integration.id === 'xero') {
        setXeroConnected(true);
      }
    } else {
      toast({
        title: `${integration.name}`,
        description: `${integration.name} integration coming soon!`
      });
    }
    setShowIntegrationsPopup(false);
  };

  // Mock handlers for connect buttons
  const handleConnectGmail = () => {
    toast({ 
      title: "Gmail Connection Started",
      description: "Follow the instructions to connect your Gmail account."
    });
    setTimeout(() => setGmailConnected(true), 1000);
  };

  const handleActivateVault = () => {
    toast({ 
      title: "Knowledge Vault Activated"
    });
    setVaultActivated(true);
  };

  const handleActivateCSVault = () => {
    toast({ 
      title: "CS Vault Activated"
    });
    setCsVaultActivated(true);
  };

  const handleActivateCSAgent = () => {
    toast({ 
      title: "Customer Service Agent Activated"
    });
    setCsAgentActivated(true);
  };

  const handleActivateInsights = () => {
    toast({ 
      title: "Insights Agent Activated"
    });
    setInsightsActivated(true);
  };

  const handleConnectPos = (posType: string) => {
    toast({ 
      title: `${posType} Connection Started`
    });
    if (posType === 'Square') setSquareConnected(true);
    else if (posType === 'Lightspeed') setLightspeedConnected(true);
  };

  const handleConnectXero = () => {
    toast({ 
      title: "Xero Connection Started"
    });
    setXeroConnected(true);
  };

  const handleConnectOpenBanking = () => {
    toast({ 
      title: "Open Banking Connection Started"
    });
    setOpenBankingConnected(true);
  };

  const handleActivateTapAgent = () => {
    toast({ 
      title: "Tap Agent Activated"
    });
    setTapAgentActivated(true);
  };

  const handleActivateCompetitorAgent = () => {
    toast({ 
      title: "Competitor Intel Agent Activated"
    });
    setCompetitorAgentActivated(true);
  };

  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{ __html: setupStyles }} />
      
      <div className="flex flex-col h-full max-w-full">
        {/* Header Section */}
        <div className="px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <Button
                variant="outline"
                className="rounded-md flex items-center gap-1.5"
                onClick={() => setInfoDrawerOpen(true)}
              >
                <Info className="h-4 w-4" />
                <span>Learn More</span>
              </Button>
            </div>
            
            {/* Back button for tab pages */}
            {(activeTab === "merchant" || activeTab === "loyalty") && (
              <div>
                <Button 
                  variant="outline" 
                  className="rounded-md flex items-center gap-2"
                  onClick={() => setActiveTab("main")}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="px-6 pt-6 pb-14 flex-1 overflow-y-auto bg-white content-area">
          {/* Main Get Started Content */}
          {activeTab === "main" && (
            <div className="tab-section">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Tap Merchant Box */}
                <div className="border border-gray-200 rounded-md p-6 flex flex-col bg-gray-50">
                  <div>
                    <h3 className="text-md font-semibold mb-2">Tap Merchant</h3>
                    <p className="text-sm text-gray-600 mb-4">Connect your business systems, manage data, and build powerful integrations with POS systems, accounting software, and communication tools.</p>
                    
                    {/* Integration Icons */}
                    <div className="mb-6">
                      <p className="text-xs text-gray-500 mb-3 font-medium">INTEGRATIONS AVAILABLE</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                          <Image src="/gmailnew.png" alt="Gmail" width={20} height={20} className="object-contain" />
                        </div>
                        <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                          <Image src="/square.png" alt="Square" width={20} height={20} className="object-contain" />
                        </div>
                        <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                          <Image src="/lslogo.png" alt="Lightspeed" width={20} height={20} className="object-contain" />
                        </div>
                        <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                          <Image src="/xero.png" alt="Xero" width={20} height={20} className="object-contain" />
                        </div>
                        <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                          <Image src="/mailchimp.png" alt="Mailchimp" width={20} height={20} className="object-contain" />
                        </div>
                        <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                          <Database className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button 
                      variant="outline" 
                      className="rounded-md"
                      onClick={() => setActiveTab("merchant")}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
                
                {/* Tap Loyalty Box */}
                <div className="border border-gray-200 rounded-md p-6 flex flex-col bg-gray-50">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Image src="/taplogo.png" alt="Tap" width={24} height={24} className="object-contain rounded-sm" />
                      <h3 className="text-md font-semibold">Tap Loyalty</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Create engaging loyalty programs, manage customer rewards, and build lasting relationships with your customers through personalised experiences.</p>
                    
                    {/* Platform Icons */}
                    <div className="mb-6">
                      <p className="text-xs text-gray-500 mb-3 font-medium">POWERED BY</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm h-9 w-9 flex items-center justify-center">
                          <Image src="/apple.jpg" alt="iOS App" width={20} height={20} className="object-contain" />
                        </div>
                        <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm h-9 w-9 flex items-center justify-center">
                          <Image src="/cdr.png" alt="Consumer Data Right" width={20} height={20} className="object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button 
                      variant="outline" 
                      className="rounded-md"
                      onClick={() => setActiveTab("loyalty")}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Tap Merchant Tab Content */}
          {activeTab === "merchant" && (
            <div className="tab-section">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Set up integrations */}
                <div className="border border-gray-200 rounded-md p-6 flex flex-col bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <Settings className="h-8 w-8 text-blue-500" />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                          <Image src="/gmailnew.png" alt="Gmail" width={16} height={16} className="object-contain" />
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                          <Image src="/integrations/square.png" alt="Square" width={16} height={16} className="object-contain" />
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                          <Image src="/integrations/ls.png" alt="Lightspeed" width={16} height={16} className="object-contain" />
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                          <Image src="/xero.png" alt="Xero" width={16} height={16} className="object-contain" />
                        </div>
                        <div className="bg-gray-200 p-2 rounded border border-gray-300 text-xs font-medium text-gray-600 min-w-[28px] text-center">
                          +6
                        </div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-3">Set up integrations</h3>
                  <p className="text-sm text-gray-600 mb-6">Connect your business systems like POS, email, and accounting software to centralise your data.</p>
                  <div className="mt-auto">
                    <Button 
                      variant="outline" 
                      className="w-full rounded-md"
                      onClick={() => router.push('/dashboard/integrations')}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
                
                {/* Set up your vault */}
                <div className="border border-gray-200 rounded-md p-6 flex flex-col bg-gray-50">
                  <div className="mb-4">
                    <Database className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">Set up your vault</h3>
                  <p className="text-sm text-gray-600 mb-6">Create an AI-powered knowledge base using RAG (Retrieval Augmented Generation). Upload PDFs, documents, and notes to build a searchable vault you can query and interact with.</p>
                  <div className="mt-auto">
                    <Button 
                      variant="outline" 
                      className="w-full rounded-md"
                      onClick={handleActivateVault}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
                
                {/* Create your first agent */}
                <div className="border border-gray-200 rounded-md p-6 flex flex-col bg-gray-50">
                  <div className="mb-4">
                    <Bot className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">Create your first agent</h3>
                  <p className="text-sm text-gray-600 mb-6">Build AI agents that can automate tasks, respond to customers, and analyse your business data.</p>
                  
                  {/* Agent Type Icons */}
                  <div className="mb-6">
                    <p className="text-xs text-gray-500 mb-3 font-medium">AGENT TYPES</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Customer Service</span>
                          <Image src="/gmailnew.png" alt="Gmail" width={16} height={16} className="object-contain" />
                          <Image src="/outlook.png" alt="Outlook" width={16} height={16} className="object-contain" />
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Email Agent</span>
                          <Image src="/gmailnew.png" alt="Gmail" width={16} height={16} className="object-contain" />
                          <Image src="/outlook.png" alt="Outlook" width={16} height={16} className="object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    {csAgentActivated ? (
                      <Link href="/dashboard/agent-inbox">
                        <Button variant="outline" className="w-full rounded-md">
                          Manage Agent
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full rounded-md"
                        onClick={handleActivateCSAgent}
                      >
                        Get Started
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* FAQ Section */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold mb-6 text-gray-900">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  <FAQItem 
                    question="How long does it take to set up integrations?"
                    answer="Most integrations can be set up in 5-10 minutes. Gmail and POS systems typically connect instantly, while accounting software like Xero may take a few minutes to sync your data."
                  />
                  <FAQItem 
                    question="What data is stored in the vault?"
                    answer="Your vault securely stores business documents, customer information, product catalogues, and any other business knowledge you choose to upload. All data is encrypted and only accessible by your authorised team members."
                  />
                  <FAQItem 
                    question="Can I create multiple agents?"
                    answer="Yes, you can create multiple agents for different purposes. Start with one agent type and add more as your business needs grow. Each agent can be customised for specific tasks and integrations."
                  />
                  <FAQItem 
                    question="Is my business data secure?"
                    answer="Absolutely. We use enterprise-grade encryption, secure data centres, and follow strict privacy protocols. Your data is never shared with third parties and you maintain full control over your information."
                  />
                  <FAQItem 
                    question="What if I need help during setup?"
                    answer="Our support team is available to help you through the setup process. You can access live chat support, detailed guides, or schedule a personalised onboarding session with our team."
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Tap Loyalty Tab Content */}
          {activeTab === "loyalty" && (
            <div className="tab-section">
              
              {/* Core Features */}
              <div className="mb-8">
                <h2 className="text-lg font-medium mb-4">Core Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Create Individual Reward */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50">
                    <div className="mb-2">
                      <Gift className="h-5 w-5 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Create Individual Reward</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Create one-time rewards and promotions for your customers.</p>
                    <Link href="/store/rewards">
                      <Button size="sm" variant="outline" className="w-full rounded-md">
                        Create Reward
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Create Banner */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50">
                    <div className="mb-2">
                      <ImageIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Create Banner</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Design promotional banners for your loyalty program.</p>
                    <Link href="/store/banners">
                      <Button size="sm" variant="outline" className="w-full rounded-md">
                        Create Banner
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Create Intro Reward */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50">
                    <div className="mb-2">
                      <Star className="h-5 w-5 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Create Intro Reward</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Set up welcome rewards for new customers joining your program.</p>
                    <Link href="/store/intro-rewards">
                      <Button size="sm" variant="outline" className="w-full rounded-md">
                        Create Intro Reward
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Create Points Rule */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50">
                    <div className="mb-2">
                      <Zap className="h-5 w-5 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Create Points Rule</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Configure how customers earn loyalty points in your program.</p>
                    <Link href="/store/points-rules">
                      <Button size="sm" variant="outline" className="w-full rounded-md">
                        Create Rule
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Create Recurring Program */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50">
                    <div className="mb-2">
                      <RotateCcw className="h-5 w-5 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Create Recurring Program</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Set up ongoing loyalty programs like coffee cards and recurring vouchers.</p>
                    <Link href="/store/recurring">
                      <Button size="sm" variant="outline" className="w-full rounded-md">
                        Create Program
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* AI Features */}
              <div>
                <h2 className="text-lg font-medium mb-4">AI Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Explore Tap Agent */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50">
                    <div className="mb-2">
                      <Sparkles className="h-5 w-5 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Explore Tap Agent</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">AI-powered personalized rewards and customer communications.</p>
                    {tapAgentActivated ? (
                      <Link href="/tap-agent/intro">
                        <Button size="sm" variant="outline" className="w-full rounded-md">
                          Configure
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" onClick={handleActivateTapAgent} variant="outline" className="w-full rounded-md">
                        Explore
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* FAQ Section */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold mb-6 text-gray-900">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  <FAQItem 
                    question="How do loyalty points work?"
                    answer="Customers earn points for purchases based on your configured points rules. They can redeem these points for rewards, discounts, or free items. You can set custom earning rates and redemption values to match your business model."
                  />
                  <FAQItem 
                    question="What types of rewards can I create?"
                    answer="You can create percentage discounts, fixed amount discounts, free items, bundles, recurring programs like coffee cards, and special promotional banners. Each reward type can be customised with specific conditions and expiry dates."
                  />
                  <FAQItem 
                    question="How does the AI agent personalise rewards?"
                    answer="Tap Agent analyses customer purchase history, preferences, and behaviour patterns to suggest personalised rewards and communications. It can automatically create targeted offers and send customised messages to increase engagement and retention."
                  />
                  <FAQItem 
                    question="Can I track customer engagement and program performance?"
                    answer="Yes, you get detailed analytics on customer activity, reward redemptions, points issued, and program performance. Track metrics like active customers, redemption rates, and popular rewards to optimise your loyalty strategy."
                  />
                  <FAQItem 
                    question="How do I set up recurring programs like coffee cards?"
                    answer="Use the 'Create Recurring Program' feature to set up programs where customers collect stamps or points towards a free reward. Configure the number of purchases required, reward type, and program duration to match your business needs."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Info Drawer */}
      <div 
        className={`info-drawer-backdrop ${infoDrawerOpen ? 'open' : ''}`} 
        onClick={() => setInfoDrawerOpen(false)}
      ></div>
      <div className={`info-drawer ${infoDrawerOpen ? 'open' : ''}`}>
        <div className="info-drawer-content">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              <span className="font-bold text-[#007AFF]">Tap</span> Platform Overview
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 rounded-full"
              onClick={() => setInfoDrawerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="info-tabs mb-6">
            <button 
              className={`info-tab ${activeInfoTab === 'merchant' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('merchant')}
            >
              Tap Merchant
            </button>
            <button 
              className={`info-tab ${activeInfoTab === 'loyalty' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('loyalty')}
            >
              Tap Loyalty
            </button>
          </div>
          
          {activeInfoTab === 'merchant' && (
            <div>
              <div className="info-section">
                <div className="info-section-title">
                  <div className="info-section-icon bg-blue-50">
                    <LinkIcon className="h-4 w-4 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium">Business Systems Integration</h3>
                </div>
                <div className="info-section-content">
                  <p className="mb-4">
                    Connecting your business systems provides a centralised data source that powers our AI analytics and automation capabilities.
                  </p>
                  
                  <div className="integration-item">
                    <div className="integration-logo">
                      <Image 
                        src="/gmailnew.png"
                        alt="Gmail"
                        width={30}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <div className="integration-content">
                      <h4 className="integration-title">Gmail</h4>
                      <p className="integration-description">
                        Automatically extracts invoices, receipts and documents from your email, generates 
                        AI summaries of important messages, and integrates with the customer service 
                        agent to handle inquiries, locate order information, and automate responses.
                      </p>
                    </div>
                  </div>
                  
                  <div className="integration-item">
                    <div className="integration-logo">
                      <Image 
                        src="/square.png"
                        alt="Square POS"
                        width={30}
                        height={30}
                        className="object-contain"
                      />
                    </div>
                    <div className="integration-content">
                      <h4 className="integration-title">Square POS</h4>
                      <p className="integration-description">
                        Provides real-time business analytics on sales performance, customer behavior, and inventory management.
                        Integrates with the customer service agent to look up orders, enables detailed reporting
                        on business trends, and powers AI-driven insights for optimizing your operations.
                      </p>
                    </div>
                  </div>
                  
                  <div className="integration-item">
                    <div className="integration-logo">
                      <Image 
                        src="/lslogo.png"
                        alt="Lightspeed"
                        width={30}
                        height={30}
                        className="object-contain"
                      />
                    </div>
                    <div className="integration-content">
                      <h4 className="integration-title">Lightspeed</h4>
                      <p className="integration-description">
                        Syncs inventory, transactions, and customer data to enable comprehensive sales analytics,
                        powers customer loyalty tracking, and provides AI-driven insights on product performance.
                        Enables seamless customer service with complete order history access.
                      </p>
                    </div>
                  </div>
                  
                  <div className="integration-item">
                    <div className="integration-logo">
                      <Image 
                        src="/xero.png"
                        alt="Xero"
                        width={30}
                        height={30}
                        className="object-contain"
                      />
                    </div>
                    <div className="integration-content">
                      <h4 className="integration-title">Xero</h4>
                      <p className="integration-description">
                        Streamlines financial management by syncing accounting data, provides AI-generated insights
                        on cash flow patterns, expense categorization, and profit margins. Enables automated invoice 
                        reconciliation and financial forecasting to improve business planning.
                      </p>
                    </div>
                  </div>
                  
                  <div className="integration-item">
                    <div className="integration-logo">
                      <Image 
                        src="/cdr.png"
                        alt="Open Banking"
                        width={36}
                        height={36}
                        className="object-contain"
                      />
                    </div>
                    <div className="integration-content">
                      <h4 className="integration-title">Open Banking</h4>
                      <p className="integration-description">
                        Connects your bank accounts securely through Australia's Consumer Data Right (CDR) 
                        framework to provide real-time financial insights, cash position monitoring, 
                        and transaction analysis. Helps identify spending patterns and opportunities 
                        for cost optimization with AI-powered recommendations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="info-section">
                <div className="info-section-title">
                  <div className="info-section-icon bg-indigo-50">
                    <Database className="h-4 w-4 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-medium">Secure Data Storage</h3>
                </div>
                <div className="info-section-content">
                  <p className="mb-4">
                    We prioritize your data security while making it accessible for powerful business intelligence capabilities.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-indigo-500">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Bank-Level Security</h4>
                        <p className="text-gray-600 text-sm">
                          Your data is encrypted using industry-leading standards and stored in secure databases
                          with bank-level protection. We implement multi-layer security protocols to ensure 
                          your sensitive business information remains confidential.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-indigo-500">
                        <Database className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Vector Database Technology</h4>
                        <p className="text-gray-600 text-sm">
                          We use advanced vector database technology (Pinecone) to transform your documents and data 
                          into searchable knowledge. This enables natural language interactions with your business 
                          data, allowing you to ask questions and receive precise answers instantly.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-indigo-500">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Compartmentalized Access</h4>
                        <p className="text-gray-600 text-sm">
                          Our knowledge vault system ensures that sensitive information is only accessible
                          to authorized systems and users. You maintain complete control over which data
                          is utilized by which services, with transparent access logging.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="info-section">
                <div className="info-section-title">
                  <div className="info-section-icon bg-green-50">
                    <Bot className="h-4 w-4 text-green-500" />
                  </div>
                  <h3 className="text-lg font-medium">Intelligent Agents & Automation</h3>
                </div>
                <div className="info-section-content">
                  <p className="mb-4">
                    Our AI agents and automation systems work tirelessly to save you time, provide insights, and enhance customer engagement.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-green-500">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Customer Service Agent</h4>
                        <p className="text-gray-600 text-sm">
                          Automatically responds to customer inquiries using your knowledge base, handles
                          routine questions, looks up order status, and escalates complex issues when needed.
                          Saves hours of repetitive customer service work while maintaining a consistent brand voice.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-green-500">
                        <BarChart className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Insights Agent</h4>
                        <p className="text-gray-600 text-sm">
                          Continuously analyzes your business data to identify trends, opportunities, and potential
                          issues. Provides regular reports on key performance indicators, customer behavior patterns,
                          and actionable recommendations to optimize your operations.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-green-500">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Competitor Intel Agent</h4>
                        <p className="text-gray-600 text-sm">
                          Monitors your competitive landscape to provide strategic insights about market positioning,
                          pricing trends, and competitive advantages. Helps you stay ahead by identifying emerging
                          industry patterns and opportunities for differentiation.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-green-500">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Tap Loyalty</h4>
                        <p className="text-gray-600 text-sm">
                          Powers personalized customer engagement through AI-driven loyalty programs.
                          Analyzes customer behavior to design targeted rewards and communications
                          that maximize engagement and retention while building lasting relationships.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeInfoTab === 'loyalty' && (
            <div>
              <div className="info-section">
                <div className="info-section-title">
                  <div className="info-section-icon bg-blue-50">
                    <Gift className="h-4 w-4 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium">About Tap Loyalty</h3>
                </div>
                <div className="info-section-content">
                  <p className="mb-4">
                    Tap Loyalty transforms traditional points programs into intelligent, adaptive customer
                    engagement systems that respond to individual behaviors and preferences in real-time.
                  </p>
                  
                  <div className="integration-item">
                    <div className="integration-logo">
                      <Image 
                        src="/tap-logo.png"
                        alt="Tap Loyalty"
                        width={36}
                        height={36}
                        className="object-contain"
                      />
                    </div>
                    <div className="integration-content">
                      <h4 className="integration-title">Tap Loyalty Platform</h4>
                      <p className="integration-description">
                        A sophisticated loyalty platform that leverages AI to create personalized customer experiences,
                        driving engagement, retention, and business growth. By combining your business data with advanced AI, 
                        we create loyalty experiences that feel personal, timely, and valuable to each customer.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="info-section">
                <div className="info-section-title">
                  <div className="info-section-icon bg-amber-50">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-medium">Customer Engagement Tools</h3>
                </div>
                <div className="info-section-content">
                  <p className="mb-4">
                    Our customer engagement tools help you build stronger relationships with your customers through personalized experiences.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-amber-500">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">AI-Powered Personalization</h4>
                        <p className="text-gray-600 text-sm">
                          Our personalization engine analyzes customer behavior to create highly targeted rewards and 
                          communications that resonate with individual preferences and shopping patterns. This drives 
                          higher engagement rates and strengthens customer loyalty.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-orange-500">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Flexible Points Rules</h4>
                        <p className="text-gray-600 text-sm">
                          Create customized earning rules for purchases, referrals, social media engagement, 
                          and special promotions. Our AI system helps optimize these rules based on business 
                          performance and customer response to maximize program effectiveness.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="info-section">
                <div className="info-section-title">
                  <div className="info-section-icon bg-pink-50">
                    <Gift className="h-4 w-4 text-pink-500" />
                  </div>
                  <h3 className="text-lg font-medium">Rewards Management</h3>
                </div>
                <div className="info-section-content">
                  <p className="mb-4">
                    Create and manage a diverse range of rewards that appeal to different customer segments and drive desired behaviors.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-pink-500">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Rewards Catalog</h4>
                        <p className="text-gray-600 text-sm">
                          Build a compelling mix of rewards including discounts, free items, experiences, and 
                          exclusive access options. Our AI recommends optimal reward structures based on 
                          customer preferences and business goals to maximize redemption rates and satisfaction.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-purple-500">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Branded Experience</h4>
                        <p className="text-gray-600 text-sm">
                          Customize colors, logos, banners, and messaging to create a cohesive loyalty 
                          experience that reflects your unique business identity. Consistent branding 
                          reinforces recognition and strengthens customer connections with your program.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="info-section">
                <div className="info-section-title">
                  <div className="info-section-icon bg-blue-50">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium">Customer Data & Analytics</h3>
                </div>
                <div className="info-section-content">
                  <p className="mb-4">
                    Gain valuable insights from comprehensive customer data to drive informed business decisions.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-blue-500">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Customer Profiles</h4>
                        <p className="text-gray-600 text-sm">
                          Access detailed customer profiles showing purchase history, preferences, points balance, 
                          and engagement metrics. These profiles help you understand individual customers and 
                          tailor your marketing and service approaches accordingly.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-indigo-500">
                        <BarChart className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Performance Analytics</h4>
                        <p className="text-gray-600 text-sm">
                          Track key metrics such as engagement rates, redemption patterns, acquisition costs, 
                          and customer lifetime value. Our analytics dashboard provides actionable insights 
                          to continuously optimize your loyalty program and maximize ROI.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md flex items-start gap-3">
                      <div className="mt-1 text-green-500">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">AI-Powered Segmentation</h4>
                        <p className="text-gray-600 text-sm">
                          Automatically segment your customer base based on behavior patterns, purchase history, 
                          and engagement levels. These smart segments enable highly targeted campaigns and 
                          personalized experiences that drive better results.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => {
                    setActiveTab('main');
                    setInfoDrawerOpen(false);
                  }}
                  className="rounded-md"
                >
                  Back to Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Integrations Dialog */}
      <Dialog open={showIntegrationsPopup} onOpenChange={setShowIntegrationsPopup}>
        <DialogContent className="max-w-xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Available Integrations</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-3">
            {availableIntegrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-md border border-gray-200 shadow-sm flex items-center justify-center">
                    <img
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
    </DashboardLayout>
  )
} 