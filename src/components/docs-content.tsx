import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronRight, Rocket, Zap, Sparkles, LifeBuoy, Star, PlayCircle, Play, Gift, Link2, Coffee, Percent, Ticket, ClipboardCheck, TrendingUp, Crown, BarChart, RefreshCw, Users, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function DocsContent({ slug }: { slug: string }) {
  console.log('DocsContent rendering with slug:', slug)
  
  switch (slug) {
    case 'introduction':
      return <Introduction />
    case 'getting-started':
      return <GettingStarted />
    case 'rewards':
      return <RewardsDoc />
    case 'points-rules':
      return <PointsRulesDoc />
    // Add other cases
    default:
      console.log('No matching component for slug:', slug)
      return <Introduction />
  }
}

function Introduction() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Getting Started Guide
          </h1>
          <p className="text-gray-600">
            Essential steps to launch and manage your loyalty program
          </p>
        </div>
      </div>

      {/* Key Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Rocket className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-medium text-gray-900">First Steps</h2>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-900">1. Business Setup</h3>
                <p className="text-sm text-gray-600">
                  Configure your store details and preferences
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-900">2. Create Rewards</h3>
                <p className="text-sm text-gray-600">
                  Build your core loyalty offerings
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-medium text-gray-900">Key Features</h2>
            </div>
            <div className="space-y-2">
              <Link href="/docs/rewards" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                <ChevronRight className="h-4 w-4" />
                Reward Management
              </Link>
              <Link href="/docs/points-rules" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                <ChevronRight className="h-4 w-4" />
                Points Configuration
              </Link>
              <Link href="/docs/customers" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                <ChevronRight className="h-4 w-4" />
                Customer Insights
              </Link>
            </div>
          </div>
        </div>

        {/* Guides Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Popular Guides</h2>
          <div className="grid gap-4">
            <Link 
              href="/docs/getting-started" 
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-200 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                Quick Start Guide
              </div>
              <p className="text-sm text-gray-600">
                Step-by-step setup instructions
              </p>
            </Link>
            
            <Link 
              href="/docs/rewards" 
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-200 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                Creating Effective Rewards
              </div>
              <p className="text-sm text-gray-600">
                Design rewards that drive loyalty
              </p>
            </Link>
            
            <Link 
              href="/docs/points-rules" 
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-200 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                Points Strategy
              </div>
              <p className="text-sm text-gray-600">
                Configure earning and redemption rules
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* Onboarding Video */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <PlayCircle className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-medium text-gray-900">Video Introduction</h2>
        </div>
        <div className="aspect-video bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
          <Button variant="outline" className="gap-2">
            <Play className="h-4 w-4" />
            Watch Overview
          </Button>
        </div>
      </div>
    </div>
  )
}

function GettingStarted() {
  return (
    <>
      <h1>Quick Start Guide</h1>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2>1. Create Your First Reward</h2>
          <p>
            Start by creating rewards that customers can redeem with their points.
            Go to the <strong>Create</strong> section and choose a reward type.
          </p>
        </div>
        <div className="space-y-2">
          <h2>2. Set Up Points Rules</h2>
          <p>
            Define how customers earn points through purchases, visits, or other
            actions in the <strong>Points Rules</strong> section.
          </p>
        </div>
      </div>
    </>
  )
}

function RewardsDoc() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Gift className="h-6 w-6 text-blue-600" />
            Rewards
          </h1>
          <p className="text-gray-600">
            Create and manage loyalty rewards for your customers
          </p>
        </div>
      </div>

      {/* Introduction Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-medium text-gray-900 mb-4">Understanding Rewards</h2>
        
        <p className="text-gray-700">
          Rewards are the incentives you offer to customers in exchange for their loyalty points. 
          They are the core of your loyalty program, encouraging customers to engage with your business 
          and make repeat purchases.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Star className="h-5 w-5 text-blue-600" />
              Types of Rewards
            </h3>
            
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <div className="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                <div>
                  <span className="font-medium">Individual Rewards</span> - Single-redemption items like free products, discounts, or exclusive services
                </div>
              </li>
              <li className="flex items-start gap-2">
                <div className="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                <div>
                  <span className="font-medium">Reward Programs</span> - Structured programs like "Buy X Get Y Free" or tiered benefits
                </div>
              </li>
            </ul>
          </div>
          
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <h3 className="text-lg font-medium text-amber-800 mb-2 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              Rewards vs. Points Rules
            </h3>
            
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Rewards</strong> are what customers redeem their points for.
              </p>
              <p>
                <strong>Points Rules</strong> determine how customers earn points during specific times (happy hours, weekends) or for certain behaviors.
              </p>
              <p className="text-sm italic mt-2">
                Example: A "Free Coffee" reward (costs 50 points) vs. a "Double Points on Mondays" rule.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Sections */}
      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="creating-rewards" className="border border-gray-200 rounded-lg overflow-hidden">
          <AccordionTrigger className="bg-gray-50 px-6 py-4 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-100 p-2 rounded-full">
                <PlusCircle className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg font-medium text-gray-900">Creating Your First Reward</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-white border-t border-gray-200">
            <div className="text-gray-700 space-y-4">
              <p>
                To create a new reward, navigate to the Rewards section in your dashboard and click "Create New Reward."
              </p>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Basic Information</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Name your reward clearly (e.g., "Free Coffee")</li>
                  <li>Set a description that explains the value</li>
                  <li>Determine the points cost for redemption</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Redemption Settings</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Set usage limits (one-time or recurring)</li>
                  <li>Configure expiration dates if applicable</li>
                  <li>Add any special conditions for redemption</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="individual-rewards" className="border border-gray-200 rounded-lg overflow-hidden">
          <AccordionTrigger className="bg-gray-50 px-6 py-4 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-100 p-2 rounded-full">
                <Gift className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg font-medium text-gray-900">Individual Rewards in Detail</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-white border-t border-gray-200">
            <div className="text-gray-700 space-y-4">
              <p>
                Individual rewards are single-redemption items that customers can claim with their accumulated points.
              </p>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Common Examples</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Free products or services</li>
                  <li>Percentage or fixed amount discounts</li>
                  <li>Exclusive access to events or content</li>
                  <li>Merchandise or branded items</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Best Practices</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Offer a variety of rewards at different point levels</li>
                  <li>Ensure the perceived value exceeds the points cost</li>
                  <li>Rotate seasonal or limited-time rewards to create urgency</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="reward-programs" className="border border-gray-200 rounded-lg overflow-hidden">
          <AccordionTrigger className="bg-gray-50 px-6 py-4 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-100 p-2 rounded-full">
                <Crown className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg font-medium text-gray-900">Reward Programs in Detail</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-white border-t border-gray-200">
            <div className="text-gray-700 space-y-4">
              <p>
                Reward programs are structured systems that provide ongoing benefits or milestone-based rewards.
              </p>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Program Types</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Punch Card Programs:</strong> Buy X get Y free (e.g., buy 9 coffees, get the 10th free)</li>
                  <li><strong>Tiered Programs:</strong> Different benefits at different loyalty levels</li>
                  <li><strong>VIP Programs:</strong> Exclusive ongoing benefits for top customers</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Configuration Options</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Set the number of purchases required</li>
                  <li>Define the reward value</li>
                  <li>Configure automatic or manual redemption</li>
                  <li>Set program duration or expiration</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="points-rules" className="border border-gray-200 rounded-lg overflow-hidden">
          <AccordionTrigger className="bg-gray-50 px-6 py-4 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-100 p-2 rounded-full">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg font-medium text-gray-900">How Points Rules Complement Rewards</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-white border-t border-gray-200">
            <div className="text-gray-700 space-y-4">
              <p>
                Points Rules work alongside rewards to create a complete loyalty strategy. While rewards give customers something to aim for, points rules create engaging ways to earn points.
              </p>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Common Points Rules</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Time-based:</strong> Happy hours, day of week bonuses</li>
                  <li><strong>Product-based:</strong> Bonus points for specific items</li>
                  <li><strong>Behavior-based:</strong> Points for referrals, reviews, or birthdays</li>
                  <li><strong>Spend-based:</strong> Tiered points based on purchase amount</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Strategic Combinations</h4>
                <p>
                  Create compelling loyalty journeys by combining points rules with attractive rewards. For example:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Double points on Mondays + Free coffee reward = Increased Monday traffic</li>
                  <li>Bonus points for premium products + Exclusive event access = Higher average order value</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="best-practices" className="border border-gray-200 rounded-lg overflow-hidden">
          <AccordionTrigger className="bg-gray-50 px-6 py-4 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-100 p-2 rounded-full">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg font-medium text-gray-900">Reward Strategy Best Practices</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-white border-t border-gray-200">
            <div className="text-gray-700 space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Reward Value Perception</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Ensure rewards feel attainable but valuable</li>
                  <li>Balance points costs with perceived value</li>
                  <li>Consider your cost vs. the customer's perceived benefit</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Reward Mix</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Offer a variety of reward types at different point levels</li>
                  <li>Include both aspirational and easily attainable rewards</li>
                  <li>Rotate seasonal or limited-time rewards to maintain interest</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Communication</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Clearly communicate how to earn and redeem rewards</li>
                  <li>Remind customers of their progress toward rewards</li>
                  <li>Celebrate when customers earn or redeem rewards</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Related Links */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Related Documentation</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Link 
            href="/docs/points-rules" 
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="text-gray-800">Points Rules Configuration</span>
          </Link>
          
          <Link 
            href="/docs/customers" 
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-gray-800">Customer Management</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

function PointsRulesDoc() {
  return (
    <>
      <h1>Points Rules Configuration</h1>
      <div className="space-y-4">
        <h2>Rule Types</h2>
        <ul>
          <li>Purchase-based points</li>
          <li>Visit-based points</li>
          <li>Referral bonuses</li>
          <li>Special multipliers</li>
        </ul>
        
        <h2>Advanced Conditions</h2>
        <p>
          Set up complex rules using:
        </p>
        <ul>
          <li>Minimum spend requirements</li>
          <li>Time-based multipliers</li>
          <li>Product-specific rules</li>
        </ul>
      </div>
    </>
  )
} 