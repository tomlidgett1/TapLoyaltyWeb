import { DashboardLayout } from "@/components/dashboard-layout"

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
} 