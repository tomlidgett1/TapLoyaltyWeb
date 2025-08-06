import { DashboardLayout } from "@/components/dashboard-layout"
import { NotificationsProvider } from "@/contexts/notifications-context"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NotificationsProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </NotificationsProvider>
  )
} 