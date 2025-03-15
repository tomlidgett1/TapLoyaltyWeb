import { DashboardLayout } from "@/components/dashboard-layout"
import { PageTransition } from "@/components/page-transition"

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout>
      <PageTransition>
        {children}
      </PageTransition>
    </DashboardLayout>
  )
} 