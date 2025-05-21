"use client"

import { useState } from "react"
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
  LineChart,
  Building
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

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
        {/* Header Section with tabs */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Get Started</h1>
            
            <div className="flex items-center gap-3">
              {/* Tabs positioned directly to the left of Learn More button */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
            <button
              onClick={() => setActiveTab("merchant")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "merchant"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
                  <Store size={15} /> 
              <span>Tap Merchant</span>
            </button>
            <button
              onClick={() => setActiveTab("loyalty")}
              className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "loyalty"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
                  <Gift size={15} />
              <span>Tap Loyalty</span>
            </button>
          </div>
          
              <Button
                variant="outline"
                className="rounded-md flex items-center gap-1.5"
                onClick={() => setInfoDrawerOpen(true)}
              >
                <Info className="h-4 w-4" />
                <span>Learn More</span>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="px-6 pt-6 pb-14 flex-1 overflow-y-auto bg-white content-area">
          {/* Tap Merchant Tab Content */}
          {activeTab === "merchant" && (
            <div className="tab-section">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2 text-gray-900">Get started with Tap Merchant</h2>
                <p className="text-sm text-gray-600">Learn how to set up Tap Merchant and start building your intelligent business platform.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Developer quickstart section */}
                <div className="border border-gray-200 rounded-md p-6 flex flex-col">
                  <div>
                    <h3 className="text-md font-semibold mb-2">Business setup quickstart</h3>
                    <p className="text-sm text-gray-600 mb-6">Learn how to get started with Tap Merchant and start building your first connected business application.</p>
                  </div>
                  <div className="mt-auto">
                    <Link href="/guides/merchant-setup">
                      <Button variant="outline" className="rounded-md">
                        View guide
                      </Button>
                    </Link>
                </div>
              </div>
              
                {/* Creating core connections */}
                <div className="border border-gray-200 rounded-md p-6 flex flex-col">
                  <div>
                    <h3 className="text-md font-semibold mb-2">Create core connections</h3>
                    <p className="text-sm text-gray-600 mb-6">Configure and create connections to your core business systems to start gathering data.</p>
                  </div>
                  <div className="mt-auto">
                    <Button 
                      variant="outline" 
                      className="rounded-md"
                      onClick={() => toast({
                        title: "Business Connections",
                        description: "Configure your email and POS connections to start collecting data"
                      })}
                    >
                      Begin setup
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="mb-10">
                <h2 className="text-lg font-medium mb-4">Connect Your Systems</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Gmail Connection */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-4 h-16 flex items-center">
                      <Image 
                        src="/gmailnew.png"
                        alt="Gmail"
                        width={50}
                        height={40}
                        className="object-contain"
                  />
                </div>
                    <h3 className="text-sm font-semibold mb-2">Gmail</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Connect Gmail to extract documents and enable AI email management.</p>
                    {gmailConnected ? (
                      <Badge variant="outline" className="w-fit flex gap-1 items-center px-2 py-1 text-emerald-600 border-emerald-200 bg-emerald-50">
                        <Check size={12} />
                        <span className="text-xs">Connected</span>
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={handleConnectGmail} variant="outline" className="w-full rounded-md">
                        Connect
                      </Button>
                    )}
              </div>
              
                  {/* Square Connection */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-4 h-16 flex items-center">
                      <Image 
                        src="/square.png"
                        alt="Square"
                        width={50}
                        height={40}
                        className="object-contain"
                  />
                </div>
                    <h3 className="text-sm font-semibold mb-2">Square POS</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Connect Square to sync transactions and customer data.</p>
                    {squareConnected ? (
                      <Badge variant="outline" className="w-fit flex gap-1 items-center px-2 py-1 text-emerald-600 border-emerald-200 bg-emerald-50">
                        <Check size={12} />
                        <span className="text-xs">Connected</span>
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleConnectPos('Square')} variant="outline" className="w-full rounded-md">
                        Connect
                      </Button>
                    )}
              </div>
              
                  {/* Lightspeed Connection */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-4 h-16 flex items-center">
                      <Image 
                        src="/lslogo.png"
                        alt="Lightspeed"
                        width={50}
                        height={40}
                        className="object-contain"
                  />
                </div>
                    <h3 className="text-sm font-semibold mb-2">Lightspeed</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Connect Lightspeed to sync inventory and sales data.</p>
                    {lightspeedConnected ? (
                      <Badge variant="outline" className="w-fit flex gap-1 items-center px-2 py-1 text-emerald-600 border-emerald-200 bg-emerald-50">
                        <Check size={12} />
                        <span className="text-xs">Connected</span>
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleConnectPos('Lightspeed')} variant="outline" className="w-full rounded-md">
                        Connect
                      </Button>
                    )}
              </div>
            </div>
              </div>
              
              <div>
                <h2 className="text-lg font-medium mb-4">Start Building</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-2">
                      <Database className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Knowledge Vault</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Securely store and manage your business knowledge.</p>
                    {vaultActivated ? (
                      <Link href="/notes">
                        <Button size="sm" variant="outline" className="w-full rounded-md">
                          Manage Vault
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" onClick={handleActivateVault} variant="outline" className="w-full rounded-md">
                        Activate
                      </Button>
                    )}
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-2">
                      <Bot className="h-8 w-8 text-indigo-500" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Customer Service Agent</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">AI-powered customer service automation.</p>
                    {csAgentActivated ? (
                      <Link href="/dashboard/agent-inbox">
                        <Button size="sm" variant="outline" className="w-full rounded-md">
                          Manage Agent
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" onClick={handleActivateCSAgent} variant="outline" className="w-full rounded-md">
                        Activate
                      </Button>
                    )}
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-2">
                      <BarChart className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Insights Agent</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Get AI-powered business insights and analytics.</p>
                    {insightsActivated ? (
                      <Link href="/insights">
                        <Button size="sm" variant="outline" className="w-full rounded-md">
                          View Insights
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" onClick={handleActivateInsights} variant="outline" className="w-full rounded-md">
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Tap Loyalty Tab Content */}
          {activeTab === "loyalty" && (
            <div className="tab-section">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2 text-gray-900">Get started with Tap Loyalty</h2>
                <p className="text-sm text-gray-600">Learn how to set up and manage your loyalty program to drive customer retention.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Developer quickstart section */}
                <div className="border border-gray-200 rounded-md p-6 flex flex-col">
                  <div>
                    <h3 className="text-md font-semibold mb-2">Loyalty program quickstart</h3>
                    <p className="text-sm text-gray-600 mb-6">Learn how to set up your loyalty program and start rewarding your customers.</p>
                  </div>
                  <div className="mt-auto">
                    <Link href="/guides/loyalty-setup">
                      <Button variant="outline" className="rounded-md">
                        View guide
                      </Button>
                    </Link>
                </div>
              </div>
              
                {/* Sample data demo */}
                <div className="border border-gray-200 rounded-md p-6 flex flex-col">
                  <div>
                    <h3 className="text-md font-semibold mb-2">Configure rewards</h3>
                    <p className="text-sm text-gray-600 mb-6">Set up your rewards catalog and points earning rules for your loyalty program.</p>
                  </div>
                  <div className="mt-auto">
                    <Link href="/store/rewards">
                      <Button variant="outline" className="rounded-md">
                        Manage rewards
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              
              <div className="mb-10">
                <h2 className="text-lg font-medium mb-4">Program Management</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Tap Agent */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-2">
                      <Sparkles className="h-8 w-8 text-amber-500" />
                </div>
                    <h3 className="text-sm font-semibold mb-2">Tap Loyalty Agent</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">AI-powered personalized rewards and communications.</p>
                    {tapAgentActivated ? (
                      <Link href="/tap-agent/intro">
                        <Button size="sm" variant="outline" className="w-full rounded-md">
                          Configure
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" onClick={handleActivateTapAgent} variant="outline" className="w-full rounded-md">
                        Activate
                      </Button>
                    )}
              </div>
              
                  {/* Points Rules */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-2">
                      <Zap className="h-8 w-8 text-orange-500" />
                </div>
                    <h3 className="text-sm font-semibold mb-2">Points Rules</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Configure how customers earn loyalty points.</p>
                    <Link href="/store/points-rules">
                      <Button size="sm" variant="outline" className="w-full rounded-md">
                        Manage Rules
                      </Button>
                    </Link>
              </div>
              
                  {/* Rewards Catalog */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-2">
                      <Gift className="h-8 w-8 text-pink-500" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Rewards Catalog</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Create and manage rewards for points redemption.</p>
                    <Link href="/store/rewards">
                      <Button size="sm" variant="outline" className="w-full rounded-md">
                        Manage Catalog
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-medium mb-4">Customer Analytics</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-2">
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Customer Management</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">View and manage customer loyalty profiles and engagement.</p>
                    <Link href="/customers">
                      <Button size="sm" variant="outline" className="w-full rounded-md">
                        View Customers
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col">
                    <div className="mb-2">
                      <LineChart className="h-8 w-8 text-indigo-500" />
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Loyalty Analytics</h3>
                    <p className="text-xs text-gray-600 mb-auto pb-4">Analyse program performance metrics and customer engagement.</p>
                    <Link href="/insights">
                      <Button size="sm" variant="outline" className="w-full rounded-md">
                        View Analytics
                      </Button>
                    </Link>
                  </div>
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
                    setActiveTab('loyalty');
                    setInfoDrawerOpen(false);
                  }}
                  className="rounded-md"
                >
                  Explore Tap Loyalty
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 