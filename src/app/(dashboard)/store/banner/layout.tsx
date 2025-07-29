import { PageTransition } from "@/components/page-transition"

export default function BannerLayout({
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