"use client"

import { Home, Users, CreditCard, Settings, BarChart2, Gift, User, HelpCircle, Info, PlusCircle, 
  BadgeCheck, Bell, ChevronsUpDown, LogOut, Sparkles, MessageCircle, LifeBuoy, Search, Store, Blocks, Library, Link as LinkIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useMerchant } from '@/hooks/use-merchant'
import { useAuth } from '@/contexts/auth-context'
import Image from 'next/image'

const menuItems = [
  {
    title: "Home",
    icon: Home,
    url: "/dashboard",
  },
  {
    title: "Customers",
    icon: Users,
    url: "/customers",
  },
  {
    title: "Create",
    icon: PlusCircle,
    url: "/create",
  },
  {
    title: "Reward Library",
    icon: Library,
    url: "/Library",
    badge: "New"
  },
  {
    title: "My Store",
    icon: Store,
    url: "/store",
  },
  {
    title: "Integrations",
    icon: LinkIcon,
    url: "/integrations",
  },
]

export function MerchantSidebar() {
  const { isMobile, setOpen } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { merchant, loading } = useMerchant()
  const { user, logout } = useAuth()

  const handleNavigation = (url: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (isMobile) setOpen(false)
    router.push(url)
  }

  return (
    <Sidebar className="border-r font-sf-pro">
      <SidebarContent>
        <div className="flex flex-col space-y-6 py-4">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 48 48" 
                className="flex-shrink-0"
              >
                {/* Copy the SVG content from your 1.svg file here */}
                {/* This is just a placeholder, replace with your actual SVG content */}
                <path fill="#000000" d="M39.570312 9.8125L34.875 12.621094C36.550781 14.15625 37.855469 15.914062 38.921875 17.820312C39.996094 19.730469 40.828125 21.777344 41.5625 23.898438L46.277344 21.078125C45.542969 18.933594 44.714844 16.867188 43.648438 14.964844C42.578125 13.0625 41.269531 11.316406 39.570312 9.8125Z" />
                {/* Add the rest of your SVG paths here */}
              </svg>
              <h2 className="text-lg font-semibold tracking-tight">
                Tap Loyalty
              </h2>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground h-9"
            onClick={() => setOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            Search...
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Link 
                    href={item.url}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900",
                      pathname === item.url && "bg-[#007AFF]/10 text-[#007AFF]"
                    )}
                    onClick={(e) => handleNavigation(item.url, e)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <div className="mt-auto">
          <div className="p-4 space-y-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link 
                    href="/support" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <LifeBuoy className="h-4 w-4" />
                    <span className="text-sm font-medium">Support</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link 
                    href="/feedback" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Feedback</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <Separator />

            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className={cn(
                        "relative p-3 w-full",
                        "hover:bg-gray-100",
                        "border border-gray-100",
                        "rounded-lg",
                        "transition-all duration-150",
                        "text-gray-900",
                        "data-[state=open]:bg-gray-100",
                        "focus:outline-none focus-visible:ring-0"
                      )}
                    >
                      <Avatar className="h-9 w-9 rounded-lg border border-gray-200">
                        <AvatarImage 
                          src={merchant?.logoUrl || merchant?.avatar || '/avatars/user.png'} 
                          alt={merchant?.merchantName || 'Merchant'} 
                        />
                        <AvatarFallback className="rounded-lg bg-gray-50 text-gray-800">
                          {merchant?.merchantName?.slice(0, 2).toUpperCase() || 'ML'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate font-semibold text-sm text-gray-900">
                          {loading ? 'Loading...' : merchant?.merchantName || 'Merchant'}
                        </span>
                        <span className="truncate text-xs font-medium text-gray-600">
                          {user?.email}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-auto h-4 w-4 text-gray-500" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage 
                            src={merchant?.logoUrl || merchant?.avatar || '/avatars/user.png'} 
                            alt={merchant?.merchantName || 'Merchant'} 
                          />
                          <AvatarFallback className="rounded-lg">
                            {merchant?.merchantName?.slice(0, 2).toUpperCase() || 'ML'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {merchant?.merchantName || 'Merchant'}
                          </span>
                          <span className="truncate text-xs">{user?.email}</span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem className="font-medium">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upgrade to Pro
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        Account
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Billing
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Bell className="mr-2 h-4 w-4" />
                        Notifications
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        router.push('/login')
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  )
} 