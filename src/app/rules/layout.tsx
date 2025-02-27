import { DashboardLayout } from "@/components/dashboard-layout"

export default function RulesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
} 