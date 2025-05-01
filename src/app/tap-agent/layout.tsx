import { DashboardLayout } from "@/components/dashboard-layout"

export default function TapAgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Wrap the Tap Agent page with DashboardLayout so the global SideNav and header are visible.
  // The page itself already contains its own PageTransition, so we simply return children inside the layout.
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
} 