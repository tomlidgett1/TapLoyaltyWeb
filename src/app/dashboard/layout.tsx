"use client"

import { MerchantSidebar } from "@/components/merchant-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { 
  ChevronRight, 
  Home, 
  Search, 
  Bell, 
  CalendarDays, 
  MessageSquare, 
  Mail, 
  User, 
  CreditCard, 
  PlusCircle, 
  Plus,
  Settings,
  Gift,
  Trophy,
  BarChart2,
  Check,
  Users,
  HelpCircle,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { 
  Command,
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem, 
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command"
import { useState, useEffect, Suspense } from "react"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { LoadingScreen } from "@/components/ui/loading"
import { usePathname } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function DashboardPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
} 