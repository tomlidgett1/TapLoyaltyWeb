import { Book, Zap, Users, Rocket, Code, Link2, BarChart, Gift } from 'lucide-react'

export const docsConfig = [
  {
    title: "Getting Started",
    items: [
      {
        title: "Introduction",
        href: "/docs",
        icon: Book
      },
      {
        title: "Quick Start",
        href: "/docs/getting-started",
        icon: Rocket,
        badge: "New"
      },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      {
        title: "Rewards",
        href: "/docs/rewards",
        icon: Gift
      },
      {
        title: "Points Rules",
        href: "/docs/points-rules",
        icon: Zap
      },
      {
        title: "Customers",
        href: "/docs/customers",
        icon: Users
      },
      {
        title: "Campaigns",
        href: "/docs/campaigns",
      },
    ],
  },
  {
    title: "Advanced",
    items: [
      {
        title: "API Integration",
        href: "/docs/api",
      },
      {
        title: "Webhooks",
        href: "/docs/webhooks",
      },
      {
        title: "Analytics",
        href: "/docs/analytics",
      },
    ],
  },
] 