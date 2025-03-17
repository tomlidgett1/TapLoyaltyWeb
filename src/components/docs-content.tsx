import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronRight, Rocket, Zap, Sparkles, LifeBuoy, Star, PlayCircle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DocsContent({ slug }: { slug: string }) {
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
      return <Introduction />
  }
}

function Introduction() {
  return (
    <div className="space-y-8 px-6 py-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-blue-600" />
              Getting Started Guide
            </h1>
            <p className="text-gray-600 mt-2">
              Learn how to set up and manage your loyalty program
            </p>
          </div>
          <Link 
            href="/docs/getting-started" 
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            View All Guides
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4 text-blue-600" />
              First Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <span className="font-medium text-gray-700">1. Store Setup</span>
                <p className="text-gray-600">
                  Configure business information and preferences
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <span className="font-medium text-gray-700">2. Create Rewards</span>
                <p className="text-gray-600">
                  Build your core loyalty offerings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Link href="/docs/rewards" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
              <ChevronRight className="h-4 w-4" />
              Reward Management
            </Link>
            <Link href="/docs/points-rules" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
              <ChevronRight className="h-4 w-4" />
              Points Configuration
            </Link>
            <Link href="/docs/customers" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
              <ChevronRight className="h-4 w-4" />
              Customer Insights
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Guides */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Popular Guides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link 
            href="/docs/getting-started" 
            className="p-4 border rounded-lg hover:border-blue-200 transition-colors"
          >
            <div className="text-sm font-medium text-gray-900 mb-2">
              Quick Start Guide
            </div>
            <p className="text-sm text-gray-600">
              Step-by-step setup instructions
            </p>
          </Link>
          
          <Link 
            href="/docs/rewards" 
            className="p-4 border rounded-lg hover:border-blue-200 transition-colors"
          >
            <div className="text-sm font-medium text-gray-900 mb-2">
              Creating Rewards
            </div>
            <p className="text-sm text-gray-600">
              Build effective loyalty incentives
            </p>
          </Link>
          
          <Link 
            href="/docs/points-rules" 
            className="p-4 border rounded-lg hover:border-blue-200 transition-colors"
          >
            <div className="text-sm font-medium text-gray-900 mb-2">
              Points Strategy
            </div>
            <p className="text-sm text-gray-600">
              Configure earning rules
            </p>
          </Link>
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
    <>
      <h1>Managing Rewards</h1>
      <div className="space-y-4">
        <h2>Reward Types</h2>
        <ul>
          <li>Individual Rewards - Single redemption items</li>
          <li>Programs - Buy X Get Y free programs</li>
          <li>Recurring Rewards - Automatically renewing rewards</li>
        </ul>
        
        <h2>Creating Rewards</h2>
        <p>
          Use the Create button or visit the Create page to start building new
          rewards. Each reward requires:
        </p>
        <ul>
          <li>Name and description</li>
          <li>Points cost</li>
          <li>Redemption rules</li>
        </ul>
      </div>
    </>
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