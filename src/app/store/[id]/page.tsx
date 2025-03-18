"use client"

import { RewardDetailsPage } from "./RewardDetailsPage"

export default function Page({ params }: { params: { id: string } }) {
  console.log("Page component rendering with params:", params)
  return <RewardDetailsPage />
} 