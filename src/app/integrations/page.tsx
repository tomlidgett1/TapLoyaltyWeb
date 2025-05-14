"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function IntegrationsRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/dashboard/integrations")
  }, [router])

  return null
} 