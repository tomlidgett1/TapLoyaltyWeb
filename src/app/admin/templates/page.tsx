"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Save, Copy } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from "firebase/firestore"
import { PageTransition } from "@/components/page-transition"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

interface Template {
  id?: string
  merchantName: string
  businessType: string
  businessPhone?: string
  address: {
    street: string
    suburb: string
    state: string
    postcode: string
    country?: string
    countryCode?: string
    isoCountryCode?: string
  }
  location?: {
    address: string
    coordinates: {
      latitude: number
      longitude: number
    }
    displayAddress: string
  }
  operatingHours: {
    [key: string]: {
      isOpen: boolean
      open: string
      close: string
    }
  }
  pointOfSale?: string
  paymentProvider?: string
  representative?: {
    name: string
    phone: string
    email: string
  }
  loyaltySettings?: {
    pointsPerDollar: number
    welcomeBonus: number
  }
  website?: string
  posCategory?: string
}

const defaultOperatingHours = {
  monday: { isOpen: true, open: "09:00", close: "17:00" },
  tuesday: { isOpen: true, open: "09:00", close: "17:00" },
  wednesday: { isOpen: true, open: "09:00", close: "17:00" },
  thursday: { isOpen: true, open: "09:00", close: "17:00" },
  friday: { isOpen: true, open: "09:00", close: "17:00" },
  saturday: { isOpen: true, open: "09:00", close: "17:00" },
  sunday: { isOpen: false, open: "09:00", close: "17:00" }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState<Template>({
    merchantName: "",
    businessType: "cafe",
    businessPhone: "",
    address: {
      street: "",
      suburb: "",
      state: "VIC",
      postcode: "",
      country: "Australia",
      countryCode: "AU",
      isoCountryCode: "AU"
    },
    operatingHours: defaultOperatingHours,
    pointOfSale: "lightspeed",
    paymentProvider: "square",
    loyaltySettings: {
      pointsPerDollar: 1,
      welcomeBonus: 100
    },
    website: "",
    posCategory: ""
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const templatesRef = collection(db, 'templatemerchant')
      const snapshot = await getDocs(templatesRef)
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Template[]
      setTemplates(templatesData)
    } catch (error) {
      console.error("Error loading templates:", error)
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (editingTemplate?.id) {
        // Update existing template
        await updateDoc(doc(db, 'templatemerchant', editingTemplate.id), formData)
        toast({
          title: "Success",
          description: "Template updated successfully"
        })
      } else {
        // Create new template
        await addDoc(collection(db, 'templatemerchant'), formData)
        toast({
          title: "Success",
          description: "Template created successfully"
        })
      }
      
      setIsDialogOpen(false)
      setEditingTemplate(null)
      resetForm()
      loadTemplates()
    } catch (error) {
      console.error("Error saving template:", error)
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return
    
    try {
      await deleteDoc(doc(db, 'templatemerchant', templateId))
      toast({
        title: "Success",
        description: "Template deleted successfully"
      })
      loadTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({ ...template })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      businessType: "cafe",
      pointOfSale: "lightspeed",
      paymentProvider: "square",
      operatingHours: defaultOperatingHours,
      loyaltySettings: {
        pointsPerDollar: 1,
        welcomeBonus: 100
      },
      defaultRewards: []
    })
  }

  const createDefaultTemplates = async () => {
    const defaultTemplates = [
      {
        merchantName: "Sample Cafe",
        businessType: "cafe",
        businessPhone: "+61 2 1234 5678",
        address: {
          street: "123 Collins Street",
          suburb: "Melbourne",
          state: "VIC",
          postcode: "3000",
          country: "Australia",
          countryCode: "AU",
          isoCountryCode: "AU"
        },
        location: {
          address: "123 Collins Street, Melbourne VIC 3000",
          coordinates: { latitude: -37.8136, longitude: 144.9631 },
          displayAddress: "123 Collins Street, Melbourne"
        },
        pointOfSale: "square",
        paymentProvider: "square",
        operatingHours: {
          monday: { isOpen: true, open: "07:00", close: "16:00" },
          tuesday: { isOpen: true, open: "07:00", close: "16:00" },
          wednesday: { isOpen: true, open: "07:00", close: "16:00" },
          thursday: { isOpen: true, open: "07:00", close: "16:00" },
          friday: { isOpen: true, open: "07:00", close: "16:00" },
          saturday: { isOpen: true, open: "08:00", close: "15:00" },
          sunday: { isOpen: true, open: "08:00", close: "14:00" }
        },
        loyaltySettings: { pointsPerDollar: 1, welcomeBonus: 100 },
        website: "https://samplecafe.com.au",
        posCategory: "MKPOICategoryNightlife"
      },
      {
        merchantName: "Sample Restaurant",
        businessType: "restaurant",
        businessPhone: "+61 3 9876 5432",
        address: {
          street: "456 Bourke Street",
          suburb: "Melbourne",
          state: "VIC",
          postcode: "3000",
          country: "Australia",
          countryCode: "AU",
          isoCountryCode: "AU"
        },
        location: {
          address: "456 Bourke Street, Melbourne VIC 3000",
          coordinates: { latitude: -37.8136, longitude: 144.9631 },
          displayAddress: "456 Bourke Street, Melbourne"
        },
        pointOfSale: "lightspeed",
        paymentProvider: "square",
        operatingHours: {
          monday: { isOpen: true, open: "11:00", close: "22:00" },
          tuesday: { isOpen: true, open: "11:00", close: "22:00" },
          wednesday: { isOpen: true, open: "11:00", close: "22:00" },
          thursday: { isOpen: true, open: "11:00", close: "22:00" },
          friday: { isOpen: true, open: "11:00", close: "23:00" },
          saturday: { isOpen: true, open: "11:00", close: "23:00" },
          sunday: { isOpen: true, open: "11:00", close: "21:00" }
        },
        loyaltySettings: { pointsPerDollar: 1, welcomeBonus: 200 },
        website: "https://samplerestaurant.com.au",
        posCategory: "MKPOICategoryNightlife"
      },
      {
        merchantName: "Sample Retail Store",
        businessType: "retail",
        businessPhone: "+61 7 5555 1234",
        address: {
          street: "789 Queen Street",
          suburb: "Brisbane",
          state: "QLD",
          postcode: "4000",
          country: "Australia",
          countryCode: "AU",
          isoCountryCode: "AU"
        },
        location: {
          address: "789 Queen Street, Brisbane QLD 4000",
          coordinates: { latitude: -27.4698, longitude: 153.0251 },
          displayAddress: "789 Queen Street, Brisbane"
        },
        pointOfSale: "shopify",
        paymentProvider: "stripe",
        operatingHours: {
          monday: { isOpen: true, open: "09:00", close: "18:00" },
          tuesday: { isOpen: true, open: "09:00", close: "18:00" },
          wednesday: { isOpen: true, open: "09:00", close: "18:00" },
          thursday: { isOpen: true, open: "09:00", close: "21:00" },
          friday: { isOpen: true, open: "09:00", close: "21:00" },
          saturday: { isOpen: true, open: "09:00", close: "17:00" },
          sunday: { isOpen: true, open: "10:00", close: "16:00" }
        },
        loyaltySettings: { pointsPerDollar: 1, welcomeBonus: 150 },
        website: "https://samplestore.com.au",
        posCategory: "MKPOICategoryNightlife"
      }
    ]

    try {
      for (const template of defaultTemplates) {
        await setDoc(doc(db, 'templatemerchant', template.businessType), template)
      }
      toast({
        title: "Success",
        description: "Default templates created successfully"
      })
      loadTemplates()
    } catch (error) {
      console.error("Error creating default templates:", error)
      toast({
        title: "Error",
        description: "Failed to create default templates",
        variant: "destructive"
      })
    }
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Account Templates</h1>
            <p className="text-muted-foreground">Manage premade account templates for new merchant signups</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={createDefaultTemplates}>
              <Copy className="h-4 w-4 mr-2" />
              Create Defaults
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingTemplate(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? "Edit Template" : "Create New Template"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure a template that merchants can select during signup
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="merchantName">Merchant Name</Label>
                      <Input
                        id="merchantName"
                        value={formData.merchantName}
                        onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                        placeholder="e.g., Sample Cafe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select value={formData.businessType} onValueChange={(value) => setFormData({ ...formData, businessType: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cafe">Cafe</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="salon">Salon</SelectItem>
                          <SelectItem value="gym">Gym</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      value={formData.businessPhone || ""}
                      onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                      placeholder="Business phone number"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pointOfSale">Point of Sale</Label>
                      <Select value={formData.pointOfSale} onValueChange={(value) => setFormData({ ...formData, pointOfSale: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lightspeed">Lightspeed</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="shopify">Shopify</SelectItem>
                          <SelectItem value="vend">Vend</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="paymentProvider">Payment Provider</Label>
                      <Select value={formData.paymentProvider} onValueChange={(value) => setFormData({ ...formData, paymentProvider: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="eftpos">EFTPOS</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">No templates found. Create your first template!</p>
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="rounded-md">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{template.merchantName}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => template.id && handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>{template.businessType} Template</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <strong>Business Type:</strong> {template.businessType}
                  </div>
                  <div className="text-sm">
                    <strong>POS:</strong> {template.pointOfSale || "Not specified"}
                  </div>
                  <div className="text-sm">
                    <strong>Payment:</strong> {template.paymentProvider || "Not specified"}
                  </div>
                  {template.businessPhone && (
                    <div className="text-sm">
                      <strong>Phone:</strong> {template.businessPhone}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  )
} 