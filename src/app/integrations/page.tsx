"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react"
import { useState } from "react"

interface Integration {
  id: string
  name: string
  description: string
  status: "available" | "connected" | "maintenance"
  category: "pos" | "payment" | "ecommerce"
  logo: string
}

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const integrations: Integration[] = [
    {
      id: "lightspeed",
      name: "Lightspeed Retail",
      description: "Connect your Lightspeed POS to sync products, customers, and transactions",
      status: "available",
      category: "pos",
      logo: "/integrations/ls.png"
    },
    {
      id: "square",
      name: "Square",
      description: "Sync your Square POS data and manage your loyalty program",
      status: "connected",
      category: "pos",
      logo: "/integrations/square.PNG"
    },
    {
      id: "shopify",
      name: "Shopify",
      description: "Connect your online store to enable omnichannel loyalty",
      status: "maintenance",
      category: "ecommerce",
      logo: "/integrations/shopify.svg"
    }
  ]

  const getStatusBadge = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return (
          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </div>
        )
      case "maintenance":
        return (
          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            Maintenance
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2 py-1 rounded-full text-xs font-medium">
            Available
          </div>
        )
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your business tools to enhance your loyalty program
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search integrations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="text-sm">
            View Connected
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Card
              key={integration.id}
              className="group cursor-pointer hover:border-slate-400 transition-colors"
              onClick={() => console.log(`Connect ${integration.name}`)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center p-2">
                    <img
                      src={integration.logo}
                      alt={integration.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {integration.description}
                  </p>
                  <Button 
                    variant="ghost" 
                    className="text-sm p-0 h-auto hover:bg-transparent group-hover:text-blue-600"
                  >
                    Learn more
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
} 