import { PageTransition } from "@/components/page-transition"

export default function RewardsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageTransition>
      {children}
    </PageTransition>
  )
} 