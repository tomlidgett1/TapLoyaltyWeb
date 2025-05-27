"use client"

import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Building2, 
  Target, 
  LineChart, 
  Zap, 
  Users, 
  MessageSquare, 
  BarChart4, 
  Brain,
  AlertCircle,
  Play,
  ChevronRight,
  Settings,
  FilePlus,
  FileCheck,
  Rocket,
  Check,
  UserCheck,
  ShoppingBag,
  TrendingUp,
  Award,
  Calendar,
  Gift,
  Clock,
  PowerOff
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, deleteDoc } from "firebase/firestore"

// Add the gradient and animation styles
const pageStyles = `
  .gradient-text {
    background: linear-gradient(90deg, #3D8BFF 0%, #FF8A00 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 700;
  }
  
  .gradient-bg {
    background: linear-gradient(135deg, #3D8BFF 0%, #FF8A00 100%);
  }
  
  .feature-card {
    transition: all 0.3s ease;
    border: 1px solid rgba(0, 122, 255, 0.1);
    background-color: #f8f9fa;
  }
  
  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 20px rgba(0, 122, 255, 0.1);
    border-color: rgba(0, 122, 255, 0.3);
  }
  
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(0, 122, 255, 0); }
    100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
  }
  
  .pulse-button {
    animation: pulse 2s infinite;
    border-radius: 0.75rem;
  }
  
  .step-card {
    transition: all 0.3s ease;
  }
  
  .step-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  
  .card-hover-effect:hover .icon-container {
    background-color: #007AFF;
    color: white;
  }
  
  /* Workflow animation styles */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .workflow-step {
    opacity: 0;
    transition: all 0.5s ease-in-out;
  }
  
  .workflow-step.active {
    opacity: 1;
  }
  
  .workflow-step.complete .step-circle {
    background-color: #3D8BFF;
  }
  
  .workflow-step.processing .step-circle {
    background-color: #3D8BFF;
  }
  
  .workflow-step.complete .step-line,
  .workflow-step.processing .step-line {
    background-color: #3D8BFF;
  }
  
  .workflow-step.complete .step-box,
  .workflow-step.processing .step-box {
    background-color: rgba(61, 139, 255, 0.1);
    border-color: rgba(61, 139, 255, 0.3);
  }
  
  .workflow-spinner {
    animation: spin 1s linear infinite;
  }
  
  .workflow-container {
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
    transition: all 0.3s ease;
  }
  
  .workflow-container:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
  }
  
  .glow-effect {
    position: absolute;
    border-radius: 30%;
    filter: blur(20px);
    opacity: 0.4;
    z-index: 0;
  }
  
  .blue-glow {
    background: rgba(61, 139, 255, 0.4);
    width: 150px;
    height: 150px;
    top: -50px;
    left: -50px;
  }
  
  .orange-glow {
    background: rgba(255, 138, 0, 0.4);
    width: 150px;
    height: 150px;
    bottom: -50px;
    right: -50px;
  }
  
  /* Intersection Observer Helper */
  .fade-in-section {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  
  .fade-in-section.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
`

// Inline style for gradient text as a fallback
const gradientTextStyle = {
  background: "linear-gradient(90deg, #3D8BFF 0%, #FF8A00 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  fontWeight: 700,
};

// Feature data for the cards
const features = [
  {
    title: "Brand Analysis",
    description: "Analyzes your colors, tone of voice, and brand identity to create perfectly on-brand campaigns.",
    icon: Building2,
    color: "bg-blue-50"
  },
  {
    title: "Strategic Objectives",
    description: "Aligns reward strategies with your business goals—whether boosting AOV or increasing loyalty.",
    icon: Target,
    color: "bg-orange-50"
  },
  {
    title: "Smart Pricing",
    description: "Creates margin-friendly offers by analyzing your product catalog and pricing structure.",
    icon: LineChart,
    color: "bg-green-50"
  },
  {
    title: "Financial Protection",
    description: "Sets guardrails to keep promotions profitable while maximizing customer engagement.",
    icon: Zap,
    color: "bg-purple-50"
  },
  {
    title: "Customer Insights",
    description: "Segments your audience into cohorts so every customer receives the most relevant reward.",
    icon: Users,
    color: "bg-red-50"
  },
  {
    title: "Intelligent Messaging",
    description: "Generates messages that match your brand voice and resonate with each customer segment.",
    icon: MessageSquare,
    color: "bg-teal-50"
  },
  {
    title: "Automated Optimization",
    description: "Continuously learns from redemption data to refine rewards for maximum ROI.",
    icon: BarChart4,
    color: "bg-indigo-50"
  },
  {
    title: "AI-Powered Insights",
    description: "Leverages machine learning to uncover patterns and suggest new loyalty strategies.",
    icon: Brain,
    color: "bg-amber-50"
  }
]

// Steps for setup
const setupSteps = [
  {
    title: "Brand Identity Setup",
    description: "Configure your business colors, tone of voice, and operating hours so Tap Agent can create perfectly on-brand rewards.",
    icon: FilePlus,
    time: "2-3 minutes"
  },
  {
    title: "Objectives & Goals",
    description: "Define your business and customer objectives to ensure every reward aligns with your strategic goals.",
    icon: Target,
    time: "3-4 minutes"
  },
  {
    title: "Product & Pricing Data",
    description: "Connect your products and pricing data to create offers that protect your margins while maximizing appeal.",
    icon: LineChart,
    time: "2-3 minutes"
  },
  {
    title: "Customer Segments",
    description: "Set up customer cohorts to ensure each segment receives the most relevant and effective rewards.",
    icon: Users,
    time: "2-3 minutes"
  },
  {
    title: "Activate Your Agent",
    description: "Review and activate your Tap Agent to start creating personalized rewards automatically.",
    icon: Rocket,
    time: "1 minute"
  }
]

// Workflow steps for animation
const workflowSteps = [
  {
    title: "Tap Agent Thinking",
    description: "AI analysis begins by processing your business data and customer behavior",
    delay: 0
  },
  {
    title: "Identify Customer Segments",
    description: "Groups customers into cohorts based on purchase history and preferences",
    delay: 2000
  },
  {
    title: "Generate Reward Options",
    description: "Creates personalized reward recommendations for each customer segment",
    delay: 4000
  },
  {
    title: "Design Custom Messaging",
    description: "Crafts on-brand communications that resonate with each segment",
    delay: 6000
  },
  {
    title: "Optimize & Deploy",
    description: "Finalizes rewards and schedules them for delivery to customers",
    delay: 8000
  }
]

// Add custom styles for reduced border radius
const customStyles = `
  ${pageStyles}
  
  .reduced-radius {
    border-radius: 0.375rem !important;
  }
  
  .reduced-radius-sm {
    border-radius: 0.25rem !important;
  }
`

export default function TapAgentIntroPage() {
  const { user } = useAuth()
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
  const [completedWorkflowSteps, setCompletedWorkflowSteps] = useState<number[]>([]);
  const [processingStep, setProcessingStep] = useState<number | null>(null);
  const [isWorkflowVisible, setIsWorkflowVisible] = useState(false);
  const workflowRef = useRef<HTMLDivElement>(null);
  const animationStartedRef = useRef<boolean>(false);
  const [agentConfigured, setAgentConfigured] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [disabling, setDisabling] = useState<boolean>(false);
  const [lastActiveDate, setLastActiveDate] = useState<string>("Today, 08:45 AM");
  const [customerStats, setCustomerStats] = useState({
    activeCustomers: 0,
    newCustomers: 0,
    totalRedemptions: 0,
    engagementRate: 0
  });
  
  useEffect(() => {
    async function checkAgentConfiguration() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      
      try {
        const agentDocRef = doc(db, 'agents', user.uid);
        const agentDoc = await getDoc(agentDocRef);
        
        if (agentDoc.exists()) {
          setAgentConfigured(true);
          
          // Get last active timestamp from the document or generate a random recent time
          const data = agentDoc.data();
          if (data.lastActive) {
            // Format the timestamp if it exists
            const lastActive = new Date(data.lastActive.toDate());
            setLastActiveDate(formatLastActive(lastActive));
          } else {
            // Generate a random recent time
            const randomHours = Math.floor(Math.random() * 24);
            const randomMinutes = Math.floor(Math.random() * 60);
            const lastActive = new Date();
            lastActive.setHours(lastActive.getHours() - randomHours);
            lastActive.setMinutes(lastActive.getMinutes() - randomMinutes);
            setLastActiveDate(formatLastActive(lastActive));
          }
          
          // Fetch some basic stats for the dashboard
          // In a real implementation, you would fetch actual data
          setCustomerStats({
            activeCustomers: Math.floor(Math.random() * 500) + 100,
            newCustomers: Math.floor(Math.random() * 50) + 10,
            totalRedemptions: Math.floor(Math.random() * 1000) + 200,
            engagementRate: Math.floor(Math.random() * 30) + 40
          });
        } else {
          setAgentConfigured(false);
        }
      } catch (error) {
        console.error("Error checking agent configuration:", error);
        setAgentConfigured(false);
      } finally {
        setLoading(false);
      }
    }
    
    checkAgentConfiguration();
  }, [user]);
  
  // Format the last active date in a human-readable way
  const formatLastActive = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      // Yesterday
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      // Within a week
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `${days[date.getDay()]}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      // More than a week ago
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
             `, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };
  
  // Handle disabling the agent
  const handleDisableAgent = async () => {
    if (!user?.uid || !window.confirm("Are you sure you want to disable your Tap Agent? This will delete your agent configuration.")) {
      return;
    }
    
    setDisabling(true);
    
    try {
      const agentDocRef = doc(db, 'agents', user.uid);
      await deleteDoc(agentDocRef);
      setAgentConfigured(false);
    } catch (error) {
      console.error("Error disabling agent:", error);
      alert("Failed to disable agent. Please try again.");
    } finally {
      setDisabling(false);
    }
  };
  
  // Set up intersection observer to detect when workflow is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsWorkflowVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.3, // When 30% of the element is visible
      }
    );
    
    if (workflowRef.current) {
      observer.observe(workflowRef.current);
    }
    
    return () => {
      if (workflowRef.current) {
        observer.unobserve(workflowRef.current);
      }
    };
  }, []);
  
  // Animate the workflow steps when it becomes visible
  useEffect(() => {
    // Only start animation if component is visible and animation hasn't started yet
    if (isWorkflowVisible && !animationStartedRef.current) {
      animationStartedRef.current = true;
      
      // Reset animation state
      setActiveWorkflowStep(0);
      setCompletedWorkflowSteps([]);
      setProcessingStep(1);
      
      // Set up the animation sequence
      const timers: NodeJS.Timeout[] = [];
      
      workflowSteps.forEach((step, index) => {
        if (index === 0) return; // Skip the first step, it's already active
        
        // Timer to start processing the step
        const processingTimer = setTimeout(() => {
          setProcessingStep(index);
        }, step.delay);
        timers.push(processingTimer);
        
        // Timer to complete the step and move to the next one
        const completionTimer = setTimeout(() => {
          setCompletedWorkflowSteps(prev => [...prev, index - 1]);
          setActiveWorkflowStep(index);
          setProcessingStep(index < workflowSteps.length - 1 ? index + 1 : null);
        }, step.delay + 1000);
        timers.push(completionTimer);
      });
      
      // Final step completion
      const finalTimer = setTimeout(() => {
        setCompletedWorkflowSteps(prev => [...prev, workflowSteps.length - 1]);
        setProcessingStep(null);
      }, workflowSteps[workflowSteps.length - 1].delay + 2000);
      timers.push(finalTimer);
      
      // Cleanup timers on component unmount or when element becomes invisible
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [isWorkflowVisible]);
  
  // Reset animation if component goes out of view
  useEffect(() => {
    if (!isWorkflowVisible) {
      animationStartedRef.current = false;
    }
  }, [isWorkflowVisible]);
  
  const isStepActive = (index: number) => activeWorkflowStep >= index;
  const isStepCompleted = (index: number) => completedWorkflowSteps.includes(index);
  const isStepProcessing = (index: number) => processingStep === index;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0D6EFD]"></div>
      </div>
    );
  }
  
  return (
    <PageTransition>
      {/* Add both style methods for fallback */}
      <style jsx global>{customStyles}</style>
      <style global jsx>{`
        .gradient-text {
          background: linear-gradient(90deg, #3D8BFF 0%, #FF8A00 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 700;
        }
      `}</style>
      
      {/* Conditional rendering based on agent configuration status */}
      {agentConfigured ? (
        // Agent Dashboard for configured users - Apple-inspired minimalist design
        <div className="p-6 py-4 bg-white">
          <PageHeader
            title={<><span className="font-semibold text-[#1D1D1F]">Tap Agent</span></>}
          >
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="h-9 gap-1.5 border-[#E6E6E6] bg-white text-[#1D1D1F] hover:bg-gray-50 shadow-none rounded-md"
                asChild
              >
                <Link href="/tap-agent/setup">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </PageHeader>
              
          <div className="w-full mb-8 mt-8">
            <div className="grid grid-cols-1 gap-6">
              {/* Agents Section - Apple-inspired list design */}
              <div className="bg-[#F5F5F7] rounded-md p-6">
                <h3 className="text-[15px] font-medium text-[#1D1D1F] mb-5">Active Agents</h3>
                
                <div className="space-y-3">
                  {/* Reward Agent */}
                  <div className="bg-white rounded-md border border-[#E6E6E6] p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#F5F5F7] rounded-full flex items-center justify-center">
                          <Award className="h-5 w-5 text-[#007AFF]" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-medium text-[#1D1D1F]">Reward Agent</h4>
                          <p className="text-[13px] text-[#86868B] mt-0.5">Personalized customer rewards</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center">
                          <div className="h-2 w-2 bg-[#34C759] rounded-full mr-2"></div>
                          <span className="text-[13px] text-[#86868B]">Active</span>
                        </div>
                        <div className="h-4 w-[1px] bg-[#E6E6E6]"></div>
                        <span className="text-[13px] text-[#86868B]">Last used {lastActiveDate}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-2 p-0 h-8 w-8 rounded-full text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
                          asChild
                        >
                          <Link href="/tap-agent/setup">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Customer Service Agent */}
                  <div className="bg-white rounded-md border border-[#E6E6E6] p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#F5F5F7] rounded-full flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-[#5E5CE6]" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-medium text-[#1D1D1F]">Customer Service Agent</h4>
                          <p className="text-[13px] text-[#86868B] mt-0.5">AI-powered customer support</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center">
                          <div className="h-2 w-2 bg-[#FF9F0A] rounded-full mr-2"></div>
                          <span className="text-[13px] text-[#86868B]">Configure</span>
                        </div>
                        <div className="h-4 w-[1px] bg-[#E6E6E6]"></div>
                        <span className="text-[13px] text-[#86868B]">Not activated</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-2 p-0 h-8 w-8 rounded-full text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
                          asChild
                        >
                          <Link href="/tap-agent/setup">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Coming Soon Section */}
              <div className="bg-[#F5F5F7] rounded-md p-6">
                <h3 className="text-[15px] font-medium text-[#1D1D1F] mb-5">Coming Soon</h3>
                
                <div className="space-y-3">
                  {/* Marketing Agent */}
                  <div className="bg-white rounded-md border border-[#E6E6E6] p-4 opacity-80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#F5F5F7] rounded-full flex items-center justify-center">
                          <BarChart4 className="h-5 w-5 text-[#BF5AF2]" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-medium text-[#1D1D1F]">Marketing Agent</h4>
                          <p className="text-[13px] text-[#86868B] mt-0.5">Automate marketing campaigns</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 text-xs border-[#E6E6E6] text-[#007AFF] hover:bg-blue-50"
                        >
                          Join waitlist
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Original welcome section for users who haven't configured their agent yet
        <div className="p-6">
              
          <div className="flex flex-col md:flex-row gap-8 w-full">
            <div className="md:w-2/3">
              <p className="text-gray-600 mb-6">
                Tap Agent is your AI-powered loyalty assistant that helps you create personalized 
                rewards for your customers based on your business data and customer behavior. 
                Set up once and let the agent continuously optimize your loyalty program.
              </p>
                  
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Quick Setup Required</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Tap Agent needs some information about your business to create effective rewards.
                      The setup process takes about 10-15 minutes and only needs to be done once.
                    </p>
                  </div>
                </div>
              </div>
                  
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/tap-agent/setup" passHref>
                  <Button 
                    size="sm"
                    className="h-9 gap-2 bg-[#007AFF] hover:bg-[#0066CC] text-white pulse-button"
                  >
                    Configure Tap Agent
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 gap-2 border-0 ring-1 ring-gray-200 bg-white text-gray-700 shadow-sm rounded-md"
                  asChild
                >
                  <Link href="#" className="flex items-center">
                    <Play className="h-4 w-4" />
                    Watch Tutorial (2 min)
                  </Link>
                </Button>
              </div>
            </div>
                
            <div className="md:w-1/3">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Setup Progress</CardTitle>
                  <CardDescription>Complete these steps to activate your agent</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {setupSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs mt-0.5">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{step.title}</p>
                          <p className="text-xs text-gray-500">{step.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="bg-blue-50 py-2 px-4 border-t">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs text-blue-700">Estimated total: 10-15 minutes</span>
                    <span className="text-xs text-blue-800 font-medium">0% Complete</span>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      )}
      
      {/* How Tap Agent Works Section with Interactive Workflow */}
      <div className="bg-gray-50 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">
              How <span className="gradient-text" style={gradientTextStyle}>Tap Agent</span> Works
            </h2>
            <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
              Tap Agent continuously analyzes customer interactions and engagement patterns to 
              identify the perfect incentives that resonate with each person.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="order-2 lg:order-1">
              <div className="prose prose-lg max-w-none">
                <h3 className="text-2xl font-bold mb-6">
                  Personalized Rewards Every Week
                </h3>
                <p className="text-gray-600 mb-6">
                  Tap Agent is a cutting-edge AI system that creates truly personalized rewards for each customer every week. 
                  By understanding individual preferences, behaviors, and engagement patterns, it crafts unique reward 
                  experiences tailored specifically to your customers.
                </p>
                <p className="text-gray-600 mb-6">
                  The system ensures every customer receives rewards they'll genuinely value and want to redeem, 
                  including personalized banners and messaging that speak directly to their interests and preferences.
                </p>
                <div className="flex items-center space-x-2 text-blue-600 font-medium mb-8">
                  <Check className="h-5 w-5 text-blue-600" />
                  <span>We never use your financial data, respecting your privacy completely</span>
                </div>
                
                <h4 className="text-xl font-bold mb-4">
                  The Power of Personalization
                </h4>
                <p className="text-gray-600">
                  Personalization is the future of customer loyalty. Tap Agent's advanced technology is constantly learning, 
                  adapting, and evolving to create meaningful reward experiences that drive engagement and satisfaction. 
                  Weekly refreshed rewards with custom visuals and messaging ensure customers always have something 
                  new and exciting to look forward to.
                </p>
              </div>
            </div>
            
            <div 
              ref={workflowRef}
              className={`order-1 lg:order-2 workflow-container bg-white rounded-xl border border-gray-200 p-6 shadow-sm fade-in-section ${isWorkflowVisible ? 'is-visible' : ''}`}
            >
              <div className="relative">
                {/* Gradient effects */}
                <div className="glow-effect blue-glow"></div>
                <div className="glow-effect orange-glow"></div>
                
                <div className="relative z-10">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    Tap Agent Workflow
                  </h3>
                  
                  {/* Animated Workflow Steps */}
                  <div className="space-y-5">
                    {workflowSteps.map((step, index) => (
                      <div 
                        key={index}
                        className={`flex items-center workflow-step ${isStepActive(index) ? 'active' : ''} ${isStepCompleted(index) ? 'complete' : ''} ${isStepProcessing(index) ? 'processing' : ''}`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center step-circle ${isStepActive(index) ? 'bg-blue-500' : 'bg-blue-200'}`}>
                          {isStepCompleted(index) ? (
                            <Check className="h-4 w-4 text-white" />
                          ) : (
                            <span className="text-sm font-bold text-white">{index + 1}</span>
                          )}
                          {isStepProcessing(index) && (
                            <svg className="animate-spin h-8 w-8 absolute text-blue-500 opacity-20" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                        </div>
                        <div className={`h-px w-4 step-line ${isStepActive(index) ? 'bg-blue-500' : 'bg-blue-200'}`}></div>
                        <div className={`flex-grow p-3 rounded-md step-box ${isStepActive(index) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                          <p className={`font-medium text-sm ${isStepActive(index) ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.title}
                          </p>
                          <p className={`text-xs ${isStepActive(index) ? 'text-gray-600' : 'text-gray-400'}`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Check className="h-5 w-5" />
                      <span className="text-sm font-medium">Always respects customer privacy</span>
                    </div>
                  </div>
                  
                  {/* Add a "Restart Animation" button for testing */}
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => {
                        animationStartedRef.current = false;
                        setIsWorkflowVisible(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Replay Animation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section - MOVED ABOVE SETUP SECTION */}
      <div className="bg-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={gradientTextStyle}>How Tap Agent Transforms Your Loyalty Strategy</h2>
            <p className="mt-4 text-gray-600 max-w-3xl mx-auto mb-8">
              Tap Agent integrates with your business data to create, manage, and optimize
              personalized rewards that drive customer engagement and increase revenue.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card rounded-xl overflow-hidden card-hover-effect bg-gray-100 shadow-sm border border-gray-200 relative"
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500 opacity-70"></div>
                <div className="p-6">
                  <div className={`icon-container ${feature.color} w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors shadow-sm`}>
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Setup Steps Section */}
      <div className="bg-gray-50 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-4">How Tap Agent Setup Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Complete these five steps to configure your Tap Agent. Each step helps the AI understand
              your business and create more effective rewards.
            </p>
          </div>
          
          <div className="space-y-6 max-w-4xl mx-auto">
            {setupSteps.map((step, index) => (
              <Card key={index} className="step-card overflow-hidden border-gray-200 hover:border-blue-300">
                <div className="flex flex-col md:flex-row">
                  {/* Left side with step number and icon */}
                  <div className="bg-blue-50 p-6 flex flex-col items-center justify-center md:w-1/4">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                      <step.icon className="h-8 w-8 text-blue-700" />
                    </div>
                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-medium mb-2">
                      {index + 1}
                    </div>
                    <div className="text-sm font-medium text-blue-800 text-center">{step.time}</div>
                  </div>
                  
                  {/* Right side with content */}
                  <div className="p-6 md:w-3/4">
                    <h3 className="text-xl font-medium mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                    
                    {/* Add extra info or actions specific to each step */}
                    {index === 0 && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Logo</Badge>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Brand Colors</Badge>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Brand Voice</Badge>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Store Hours</Badge>
                      </div>
                    )}
                    
                    {index === 1 && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Increase AOV</Badge>
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Boost Retention</Badge>
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Customer Satisfaction</Badge>
                      </div>
                    )}
                    
                    {index === 2 && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Product Catalog</Badge>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Pricing Structure</Badge>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Profit Margins</Badge>
                      </div>
                    )}
                    
                    {index === 3 && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">VIP Customers</Badge>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">New Customers</Badge>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">At-Risk Customers</Badge>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Custom Segments</Badge>
                      </div>
                    )}
                    
                    {index === 4 && (
                      <div className="mt-4 flex items-center text-green-600">
                        <Check className="h-5 w-5 mr-2" />
                        <span className="text-sm">Once activated, Tap Agent works automatically</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link href="/tap-agent/setup" passHref>
              <Button 
                size="sm"
                className="h-9 gap-2 bg-[#007AFF] hover:bg-[#0066CC] text-white"
              >
                Start Setup Process
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="bg-white py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Frequently Asked Questions</h2>
            <p className="text-gray-600">Quick answers to common questions about Tap Agent</p>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">How does Tap Agent create rewards?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Tap Agent uses AI to analyze your business data, customer segments, and brand identity to create personalized 
                  rewards that align with your business goals. It continuously learns from redemption patterns to improve future rewards.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Can I edit the rewards Tap Agent creates?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Yes! While Tap Agent automates the reward creation process, you maintain full control. You can review, edit, 
                  or reject any rewards before they're published to your customers.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">How often does Tap Agent create new rewards?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  By default, Tap Agent creates new reward recommendations weekly, but you can adjust this frequency in the settings. 
                  You can also manually trigger the creation of new rewards at any time.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Do I need to complete the setup all at once?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  No, you can save your progress at any point and return later to complete the setup. However, Tap Agent needs 
                  all setup steps to be completed before it can start creating personalized rewards.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-4">Ready to get started with Tap Agent?</p>
            <Link href="/tap-agent/setup" passHref>
              <Button 
                size="sm"
                className="h-9 gap-2 bg-[#007AFF] hover:bg-[#0066CC] text-white"
              >
                Configure Tap Agent
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  )
} 