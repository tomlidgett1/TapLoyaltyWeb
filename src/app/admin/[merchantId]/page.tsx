"use client"

import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function MerchantDetails({ params }: { params: { merchantId: string } }) {
  const router = useRouter()
  const [merchantData, setMerchantData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMerchantData() {
      try {
        setLoading(true)
        const merchantRef = doc(db, "merchants", params.merchantId)
        const merchantDoc = await getDoc(merchantRef)
        
        if (merchantDoc.exists()) {
          setMerchantData({
            id: merchantDoc.id,
            ...merchantDoc.data()
          })
        } else {
          console.error("Merchant not found")
        }
      } catch (error) {
        console.error("Error fetching merchant data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchMerchantData()
  }, [params.merchantId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-8">
            <Skeleton className="h-10 w-32 mr-4" />
            <Skeleton className="h-8 w-80" />
          </div>
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!merchantData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Merchant Not Found</h1>
          <p className="mb-6">The merchant with ID {params.merchantId} could not be found.</p>
          <Button onClick={() => router.push("/admin")}>
            Return to Merchant List
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push("/admin")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Merchants
          </Button>
          
          <div className="flex items-center">
            {merchantData.logoUrl && (
              <div className="w-16 h-16 rounded-md overflow-hidden border mr-4 flex-shrink-0">
                <img 
                  src={merchantData.logoUrl} 
                  alt={`${merchantData.merchantName || merchantData.tradingName} logo`} 
                  className="w-full h-full object-cover"
                  onError={(e) => (e.target as HTMLImageElement).src = "/hand1.png"}
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{merchantData.tradingName || merchantData.merchantName}</h1>
              <div className="flex items-center mt-1">
                <Badge variant={merchantData.status === "active" ? "default" : "secondary"}>
                  {merchantData.status || "inactive"}
                </Badge>
                {merchantData.businessType && (
                  <span className="ml-2 text-sm text-gray-500">
                    {merchantData.businessType}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="contact">Contact & Location</TabsTrigger>
            <TabsTrigger value="settings">Business Settings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Trading Name</div>
                      <div>{merchantData.tradingName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Legal Name</div>
                      <div>{merchantData.legalName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">ABN</div>
                      <div>{merchantData.abn || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Business Type</div>
                      <div>{merchantData.businessType || "—"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Merchant ID</div>
                      <div className="truncate">{merchantData.merchantId || merchantData.id || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Points Balance</div>
                      <div>{merchantData.merchantPoints || "0"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Onboarded</div>
                      <div>{merchantData.onboardingCompleted ? "Yes" : "No"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Last Updated</div>
                      <div>{merchantData.lastUpdated || "—"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="contact" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Primary Email</div>
                      <div>{merchantData.primaryEmail || merchantData.businessEmail || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Representative</div>
                      <div>{merchantData.representative?.name || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Phone</div>
                      <div>{merchantData.representative?.phone || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Representative Email</div>
                      <div>{merchantData.representative?.email || "—"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Street</div>
                      <div>{merchantData.address?.street || merchantData.location?.address?.street || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Suburb</div>
                      <div>{merchantData.address?.suburb || merchantData.location?.address?.suburb || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">State & Postcode</div>
                      <div>
                        {(merchantData.address?.state || merchantData.location?.address?.state || "—")} {" "}
                        {(merchantData.address?.postcode || merchantData.location?.address?.postcode || "—")}
                      </div>
                    </div>
                    {merchantData.location?.coordinates && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Coordinates</div>
                        <div>
                          Lat: {merchantData.location.coordinates.latitude}, 
                          Long: {merchantData.location.coordinates.longitude}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Default Multiplier</div>
                      <div>{merchantData.defaultMultiplier || "1"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Payment Provider</div>
                      <div>{merchantData.paymentProvider || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Point of Sale</div>
                      <div>{merchantData.pointOfSale || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Status</div>
                      <div>{merchantData.status || "inactive"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Rewards Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Has Introductory Reward</div>
                      <div>{merchantData.hasIntroductoryReward ? "Yes" : "No"}</div>
                    </div>
                    {merchantData.hasIntroductoryReward && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Intro Reward ID</div>
                        <div className="truncate">{merchantData.introductoryRewardId || "—"}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configuration for which notifications the merchant receives
                </CardDescription>
              </CardHeader>
              <CardContent>
                {merchantData.notifications ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(merchantData.notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">{formatNotificationName(key)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No notification settings found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function formatNotificationName(key: string): string {
  // Convert camelCase to readable format
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
} 