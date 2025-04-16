import { DashboardLayout } from "@/components/dashboard-layout"

export default function TapAgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
} 