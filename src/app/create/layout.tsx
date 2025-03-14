import { DashboardLayout } from "@/components/dashboard-layout"

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
} 