import { DashboardLayout } from "@/components/dashboard-layout"

export default function EmailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
} 