"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

interface BusinessBrand {
  businessName: string
  businessContext: string
  primaryColor: string
  secondaryColor: string
  brandVoice: string[]
}

interface BusinessBrandFormProps {
  data: BusinessBrand
  onChange: (data: BusinessBrand) => void
}

const brandVoiceOptions = [
  "friendly", 
  "professional", 
  "casual", 
  "formal", 
  "playful", 
  "serious", 
  "inspirational", 
  "direct", 
  "quirky", 
  "luxurious"
]

export function BusinessBrandForm({ data, onChange }: BusinessBrandFormProps) {
  const [brandVoiceInput, setBrandVoiceInput] = useState("")
  const { user } = useAuth()
  const [merchantName, setMerchantName] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMerchantName = async () => {
      if (!user?.uid) return

      try {
        setIsLoading(true)
        const merchantRef = doc(db, 'merchants', user.uid)
        const merchantSnap = await getDoc(merchantRef)

        if (merchantSnap.exists()) {
          const merchantData = merchantSnap.data()
          const name = merchantData.merchantName || merchantData.tradingName || merchantData.legalName || ""
          setMerchantName(name)
          
          // Update businessName if it's empty and we have a merchant name
          if (!data.businessName && name) {
            onChange({
              ...data,
              businessName: name
            })
          }
        }
      } catch (error) {
        console.error('Error fetching merchant name:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMerchantName()
  }, [user?.uid, data, onChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    onChange({
      ...data,
      [name]: value
    })
  }

  const handleAddBrandVoice = () => {
    if (brandVoiceInput && !data.brandVoice.includes(brandVoiceInput)) {
      onChange({
        ...data,
        brandVoice: [...data.brandVoice, brandVoiceInput]
      })
      setBrandVoiceInput("")
    }
  }

  const handleRemoveBrandVoice = (voice: string) => {
    onChange({
      ...data,
      brandVoice: data.brandVoice.filter(v => v !== voice)
    })
  }

  const handleSelectBrandVoice = (voice: string) => {
    if (data.brandVoice.includes(voice)) {
      handleRemoveBrandVoice(voice)
    } else {
      onChange({
        ...data,
        brandVoice: [...data.brandVoice, voice]
      })
    }
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Business Brand</CardTitle>
        <CardDescription>
          Define your business identity and brand voice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-0 mt-6">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              name="businessName"
              value={data.businessName || merchantName}
              onChange={handleInputChange}
              placeholder={isLoading ? "Loading..." : "e.g. Bean Express"}
              className="relative"
            />
            {merchantName && (
              <p className="text-xs text-muted-foreground mt-1">
                Your registered business name: {merchantName}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="businessContext">Business Context</Label>
            <Textarea
              id="businessContext"
              name="businessContext"
              value={data.businessContext}
              onChange={handleInputChange}
              placeholder="Describe your business, products, services, and target audience"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  value={data.primaryColor}
                  onChange={handleInputChange}
                  className="w-12 h-12 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={data.primaryColor}
                  onChange={handleInputChange}
                  name="primaryColor"
                  placeholder="#007AFF"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  name="secondaryColor"
                  type="color"
                  value={data.secondaryColor}
                  onChange={handleInputChange}
                  className="w-12 h-12 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={data.secondaryColor}
                  onChange={handleInputChange}
                  name="secondaryColor"
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Brand Voice</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {brandVoiceOptions.map(voice => (
                <button
                  key={voice}
                  onClick={() => handleSelectBrandVoice(voice)}
                  className={`
                    h-10 px-4 rounded-md text-sm font-medium transition-all
                    capitalize flex items-center justify-center
                    ${data.brandVoice.includes(voice) 
                      ? "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200 shadow-sm" 
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"}
                  `}
                >
                  {voice}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom tone"
                value={brandVoiceInput}
                onChange={(e) => setBrandVoiceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddBrandVoice()
                  }
                }}
              />
              <Button type="button" onClick={handleAddBrandVoice} size="sm">
                Add
              </Button>
            </div>
            
            {data.brandVoice.filter(v => !brandVoiceOptions.includes(v)).length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Label className="mb-2 block text-blue-700">Custom Tones</Label>
                <div className="flex flex-wrap gap-2">
                  {data.brandVoice
                    .filter(v => !brandVoiceOptions.includes(v))
                    .map(voice => (
                      <Badge 
                        key={voice} 
                        variant="default"
                        className="flex items-center gap-1 bg-white text-blue-700 border border-blue-200 hover:bg-blue-100"
                      >
                        {voice}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 ml-1 text-blue-700 hover:bg-blue-200"
                          onClick={() => handleRemoveBrandVoice(voice)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 