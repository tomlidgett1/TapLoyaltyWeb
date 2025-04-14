"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Edit, MoreHorizontal, Plus, Trash, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import {
  Tabs,
  TabsList,
  TabsContent,
  TabsTrigger,
} from "@/components/ui/tabs"

interface Merchant {
  id: string;
  abn?: string;
  address?: {
    postcode?: string;
    state?: string;
    street?: string;
    suburb?: string;
    country?: string;
    countryCode?: string;
    isoCountryCode?: string;
    subAdministrativeArea?: string;
    subLocality?: string;
  };
  businessEmail?: string;
  businessPhone?: string;
  businessType?: string;
  defaultMultiplier?: number;
  displayAddress?: string;
  hasIntroductoryReward?: boolean;
  inlandWater?: string;
  introductoryRewardId?: string;
  lastUpdated?: string;
  legalName?: string;
  location?: {
    address?: string;
    areaOfInterest?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    displayAddress?: string;
  };
  logoUrl?: string;
  merchantId?: string;
  merchantName?: string;
  merchantPoints?: number;
  notifications?: {
    customerAnniversary?: boolean;
    customerBirthday?: boolean;
    customerFirstPurchase?: boolean;
    customerMilestone?: boolean;
    dailySummary?: boolean;
    lowInventory?: boolean;
    monthlySummary?: boolean;
    paymentIssues?: boolean;
    pointsAwarded?: boolean;
    rewardCreated?: boolean;
    rewardExpiring?: boolean;
    rewardRedeemed?: boolean;
    salesTarget?: boolean;
    securityAlerts?: boolean;
    systemUpdates?: boolean;
    weeklySummary?: boolean;
  };
  ocean?: string;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  operatingHours?: {
    monday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    tuesday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    wednesday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    thursday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    friday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    saturday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    sunday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    [key: string]: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    } | undefined;
  };
  paymentProvider?: string;
  pointOfSale?: string;
  primaryEmail?: string;
  representative?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  status?: string;
  timeZone?: string;
  tradingName?: string;
  [key: string]: any;
}

export default function AdminMerchants() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Merchant | string;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [newMerchant, setNewMerchant] = useState<Partial<Merchant>>({
    tradingName: "",
    businessType: "",
    status: "active",
    address: {
      street: "",
      suburb: "",
      postcode: "",
      state: ""
    }
  });

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const merchantsCollection = collection(db, "merchants");
      const merchantsSnapshot = await getDocs(merchantsCollection);
      const merchantsList = merchantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Merchant[];
      
      setMerchants(merchantsList);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching merchants:", error);
      toast({
        title: "Error",
        description: "Failed to fetch merchants",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdateMerchant = async () => {
    if (!editingMerchant) return;
    
    try {
      const merchantRef = doc(db, "merchants", editingMerchant.id);
      await updateDoc(merchantRef, editingMerchant);
      
      setMerchants(merchants.map(m => 
        m.id === editingMerchant.id ? editingMerchant : m
      ));
      
      toast({
        title: "Success",
        description: "Merchant updated successfully",
      });
      
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating merchant:", error);
      toast({
        title: "Error",
        description: "Failed to update merchant",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMerchant = async () => {
    if (!editingMerchant) return;
    
    try {
      const merchantRef = doc(db, "merchants", editingMerchant.id);
      await deleteDoc(merchantRef);
      
      setMerchants(merchants.filter(m => m.id !== editingMerchant.id));
      
      toast({
        title: "Success",
        description: "Merchant deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting merchant:", error);
      toast({
        title: "Error",
        description: "Failed to delete merchant",
        variant: "destructive"
      });
    }
  };

  const handleCreateMerchant = async () => {
    try {
      const merchantsCollection = collection(db, "merchants");
      const docRef = await addDoc(merchantsCollection, newMerchant);
      
      const newMerchantWithId = {
        id: docRef.id,
        ...newMerchant
      } as Merchant;
      
      setMerchants([...merchants, newMerchantWithId]);
      
      toast({
        title: "Success",
        description: "Merchant created successfully",
      });
      
      setIsCreateDialogOpen(false);
      setNewMerchant({
        tradingName: "",
        businessType: "",
        status: "active",
        address: {
          street: "",
          suburb: "",
          postcode: "",
          state: ""
        }
      });
    } catch (error) {
      console.error("Error creating merchant:", error);
      toast({
        title: "Error",
        description: "Failed to create merchant",
        variant: "destructive"
      });
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    if (editingMerchant) {
      setEditingMerchant({
        ...editingMerchant,
        [field]: value
      });
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    if (editingMerchant) {
      setEditingMerchant({
        ...editingMerchant,
        address: {
          ...editingMerchant.address,
          [field]: value
        }
      });
    }
  };

  const handleNewMerchantFieldChange = (field: string, value: any) => {
    setNewMerchant({
      ...newMerchant,
      [field]: value
    });
  };

  const handleNewMerchantAddressChange = (field: string, value: string) => {
    setNewMerchant({
      ...newMerchant,
      address: {
        ...newMerchant.address,
        [field]: value
      }
    });
  };

  const handleSort = (key: keyof Merchant | string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortedMerchants = (merchantsToSort: Merchant[]) => {
    if (!sortConfig) return merchantsToSort;
    
    return [...merchantsToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle nested properties
      if (sortConfig.key === 'contact') {
        aValue = a.representative?.name || a.primaryEmail || a.businessEmail || '';
        bValue = b.representative?.name || b.primaryEmail || b.businessEmail || '';
      } else if (sortConfig.key === 'location') {
        aValue = a.address?.suburb || '';
        bValue = b.address?.suburb || '';
      } else if (typeof sortConfig.key === 'string' && sortConfig.key.includes('.')) {
        const keys = sortConfig.key.split('.');
        aValue = keys.reduce((obj: any, key: string) => obj?.[key] ?? '', a);
        bValue = keys.reduce((obj: any, key: string) => obj?.[key] ?? '', b);
      } else {
        // Handle merchantName and tradingName special case (fallback to the other if one is empty)
        if (sortConfig.key === 'merchantName') {
          aValue = a.merchantName || a.tradingName || '';
          bValue = b.merchantName || b.tradingName || '';
        } else if (sortConfig.key === 'tradingName') {
          aValue = a.tradingName || a.merchantName || '';
          bValue = b.tradingName || b.merchantName || '';
        } else {
          aValue = a[sortConfig.key as keyof Merchant] || '';
          bValue = b[sortConfig.key as keyof Merchant] || '';
        }
      }

      // Handle different types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Ensure case-insensitive string comparison for proper alphabetical sorting
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (aValue === undefined || aValue === null) {
        aValue = ''; // Ensure undefined/null values are handled
      } else if (bValue === undefined || bValue === null) {
        bValue = ''; // Ensure undefined/null values are handled
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredMerchants = merchants.filter(merchant => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (merchant.merchantName || "").toLowerCase().includes(searchLower) ||
      (merchant.tradingName || "").toLowerCase().includes(searchLower) ||
      (merchant.merchantId || "").toLowerCase().includes(searchLower) ||
      (merchant.businessType || "").toLowerCase().includes(searchLower) ||
      (merchant.primaryEmail || "").toLowerCase().includes(searchLower) ||
      (merchant.address?.suburb || "").toLowerCase().includes(searchLower) ||
      (merchant.representative?.name || "").toLowerCase().includes(searchLower) ||
      (merchant.abn || "").toLowerCase().includes(searchLower)
    );
  });

  // Apply sorting after filtering
  const sortedMerchants = getSortedMerchants(filteredMerchants);

  const renderSortIcon = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) {
      return <ChevronDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push("/dashboard")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Merchant Management</h1>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex justify-between mb-6">
            <div className="relative w-72">
              <Input 
                placeholder="Search merchants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Merchant
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-[180px] cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('merchantName')}
                    >
                      <div className="flex items-center">
                        Merchant Name
                        {renderSortIcon('merchantName')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('merchantId')}
                    >
                      <div className="flex items-center">
                        Merchant ID
                        {renderSortIcon('merchantId')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('businessType')}
                    >
                      <div className="flex items-center">
                        Business Type
                        {renderSortIcon('businessType')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('abn')}
                    >
                      <div className="flex items-center">
                        ABN
                        {renderSortIcon('abn')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('contact')}
                    >
                      <div className="flex items-center">
                        Contact
                        {renderSortIcon('contact')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('location')}
                    >
                      <div className="flex items-center">
                        Location
                        {renderSortIcon('location')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {renderSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMerchants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {searchTerm ? "No merchants match your search" : "No merchants found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedMerchants.map((merchant) => (
                      <TableRow key={merchant.id}>
                        <TableCell className="font-medium">{merchant.merchantName || merchant.tradingName || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{merchant.merchantId || "—"}</TableCell>
                        <TableCell>{merchant.businessType || "—"}</TableCell>
                        <TableCell>{merchant.abn || "—"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{merchant.representative?.name || "—"}</div>
                            <div className="text-gray-500">{merchant.primaryEmail || merchant.businessEmail || "—"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {merchant.address?.suburb ? (
                            <div className="text-sm">
                              <div>{merchant.address?.street}</div>
                              <div className="text-gray-500">
                                {merchant.address?.suburb}, {merchant.address?.state} {merchant.address?.postcode}
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            merchant.status === "active" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {merchant.status || "inactive"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(merchant)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(merchant)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => window.open(`/admin/${merchant.id}`, "_blank")}
                              >
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Merchant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Merchant</DialogTitle>
            <DialogDescription>
              Make changes to the merchant information here.
            </DialogDescription>
          </DialogHeader>
          
          {editingMerchant && (
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="address">Address & Contact</TabsTrigger>
                <TabsTrigger value="business">Business Settings</TabsTrigger>
                <TabsTrigger value="hours">Operating Hours</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="merchantName">Merchant Name</Label>
                    <Input
                      id="merchantName"
                      value={editingMerchant.merchantName || ""}
                      onChange={(e) => handleFieldChange("merchantName", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tradingName">Trading Name</Label>
                    <Input
                      id="tradingName"
                      value={editingMerchant.tradingName || ""}
                      onChange={(e) => handleFieldChange("tradingName", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="legalName">Legal Name</Label>
                    <Input
                      id="legalName"
                      value={editingMerchant.legalName || ""}
                      onChange={(e) => handleFieldChange("legalName", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessType">Business Type</Label>
                    <Input
                      id="businessType"
                      value={editingMerchant.businessType || ""}
                      onChange={(e) => handleFieldChange("businessType", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="abn">ABN</Label>
                    <Input
                      id="abn"
                      value={editingMerchant.abn || ""}
                      onChange={(e) => handleFieldChange("abn", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={editingMerchant.status} 
                      onValueChange={(value) => handleFieldChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="merchantId">Merchant ID</Label>
                    <Input
                      id="merchantId"
                      value={editingMerchant.merchantId || ""}
                      onChange={(e) => handleFieldChange("merchantId", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="merchantPoints">Merchant Points</Label>
                    <Input
                      id="merchantPoints"
                      type="number"
                      value={editingMerchant.merchantPoints || 0}
                      onChange={(e) => handleFieldChange("merchantPoints", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="address" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="street">Street</Label>
                    <Input
                      id="street"
                      value={editingMerchant.address?.street || ""}
                      onChange={(e) => handleAddressChange("street", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="suburb">Suburb</Label>
                    <Input
                      id="suburb"
                      value={editingMerchant.address?.suburb || ""}
                      onChange={(e) => handleAddressChange("suburb", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      value={editingMerchant.address?.postcode || ""}
                      onChange={(e) => handleAddressChange("postcode", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select 
                      value={editingMerchant.address?.state} 
                      onValueChange={(value) => handleAddressChange("state", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIC">VIC</SelectItem>
                        <SelectItem value="NSW">NSW</SelectItem>
                        <SelectItem value="QLD">QLD</SelectItem>
                        <SelectItem value="WA">WA</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                        <SelectItem value="TAS">TAS</SelectItem>
                        <SelectItem value="ACT">ACT</SelectItem>
                        <SelectItem value="NT">NT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={editingMerchant.address?.country || ""}
                      onChange={(e) => handleAddressChange("country", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="countryCode">Country Code</Label>
                    <Input
                      id="countryCode"
                      value={editingMerchant.address?.countryCode || ""}
                      onChange={(e) => handleAddressChange("countryCode", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="isoCountryCode">ISO Country Code</Label>
                    <Input
                      id="isoCountryCode"
                      value={editingMerchant.address?.isoCountryCode || ""}
                      onChange={(e) => handleAddressChange("isoCountryCode", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subAdministrativeArea">Sub Administrative Area</Label>
                    <Input
                      id="subAdministrativeArea"
                      value={editingMerchant.address?.subAdministrativeArea || ""}
                      onChange={(e) => handleAddressChange("subAdministrativeArea", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subLocality">Sub Locality</Label>
                    <Input
                      id="subLocality"
                      value={editingMerchant.address?.subLocality || ""}
                      onChange={(e) => handleAddressChange("subLocality", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="displayAddress">Display Address</Label>
                    <Input
                      id="displayAddress"
                      value={editingMerchant.displayAddress || ""}
                      onChange={(e) => handleFieldChange("displayAddress", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t space-y-4">
                  <div className="text-sm font-medium">Location Details</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="locationAddress">Location Address</Label>
                      <Input
                        id="locationAddress"
                        value={editingMerchant.location?.address || ""}
                        onChange={(e) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            location: {
                              ...editingMerchant.location,
                              address: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="locationDisplayAddress">Location Display Address</Label>
                      <Input
                        id="locationDisplayAddress"
                        value={editingMerchant.location?.displayAddress || ""}
                        onChange={(e) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            location: {
                              ...editingMerchant.location,
                              displayAddress: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="areaOfInterest">Area of Interest</Label>
                      <Input
                        id="areaOfInterest"
                        value={editingMerchant.location?.areaOfInterest || ""}
                        onChange={(e) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            location: {
                              ...editingMerchant.location,
                              areaOfInterest: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="inlandWater">Inland Water</Label>
                      <Input
                        id="inlandWater"
                        value={editingMerchant.inlandWater || ""}
                        onChange={(e) => handleFieldChange("inlandWater", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="ocean">Ocean</Label>
                      <Input
                        id="ocean"
                        value={editingMerchant.ocean || ""}
                        onChange={(e) => handleFieldChange("ocean", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="timeZone">Time Zone</Label>
                      <Input
                        id="timeZone"
                        value={editingMerchant.timeZone || ""}
                        onChange={(e) => handleFieldChange("timeZone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="primaryEmail">Primary Email</Label>
                    <Input
                      id="primaryEmail"
                      value={editingMerchant.primaryEmail || ""}
                      onChange={(e) => handleFieldChange("primaryEmail", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessEmail">Business Email</Label>
                    <Input
                      id="businessEmail"
                      value={editingMerchant.businessEmail || ""}
                      onChange={(e) => handleFieldChange("businessEmail", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      value={editingMerchant.businessPhone || ""}
                      onChange={(e) => handleFieldChange("businessPhone", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="repName">Representative Name</Label>
                    <Input
                      id="repName"
                      value={editingMerchant.representative?.name || ""}
                      onChange={(e) => {
                        setEditingMerchant({
                          ...editingMerchant,
                          representative: {
                            ...editingMerchant.representative,
                            name: e.target.value
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="repPhone">Representative Phone</Label>
                    <Input
                      id="repPhone"
                      value={editingMerchant.representative?.phone || ""}
                      onChange={(e) => {
                        setEditingMerchant({
                          ...editingMerchant,
                          representative: {
                            ...editingMerchant.representative,
                            phone: e.target.value
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="repEmail">Representative Email</Label>
                    <Input
                      id="repEmail"
                      value={editingMerchant.representative?.email || ""}
                      onChange={(e) => {
                        setEditingMerchant({
                          ...editingMerchant,
                          representative: {
                            ...editingMerchant.representative,
                            email: e.target.value
                          }
                        });
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="business" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultMultiplier">Default Multiplier</Label>
                    <Input
                      id="defaultMultiplier"
                      type="number"
                      value={editingMerchant.defaultMultiplier || 1}
                      onChange={(e) => handleFieldChange("defaultMultiplier", parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pointOfSale">Point of Sale System</Label>
                    <Input
                      id="pointOfSale"
                      value={editingMerchant.pointOfSale || ""}
                      onChange={(e) => handleFieldChange("pointOfSale", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentProvider">Payment Provider</Label>
                    <Input
                      id="paymentProvider"
                      value={editingMerchant.paymentProvider || ""}
                      onChange={(e) => handleFieldChange("paymentProvider", e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="hasIntroductoryReward"
                      checked={editingMerchant.hasIntroductoryReward || false}
                      onCheckedChange={(checked) => handleFieldChange("hasIntroductoryReward", checked === true)}
                    />
                    <Label htmlFor="hasIntroductoryReward">Has Introductory Reward</Label>
                  </div>
                  
                  {editingMerchant.hasIntroductoryReward && (
                    <div>
                      <Label htmlFor="introductoryRewardId">Introductory Reward ID</Label>
                      <Input
                        id="introductoryRewardId"
                        value={editingMerchant.introductoryRewardId || ""}
                        onChange={(e) => handleFieldChange("introductoryRewardId", e.target.value)}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="onboardingCompleted"
                      checked={editingMerchant.onboardingCompleted || false}
                      onCheckedChange={(checked) => handleFieldChange("onboardingCompleted", checked === true)}
                    />
                    <Label htmlFor="onboardingCompleted">Onboarding Completed</Label>
                  </div>
                  
                  {editingMerchant.onboardingCompleted && (
                    <div>
                      <Label htmlFor="onboardingCompletedAt">Onboarding Completed At</Label>
                      <Input
                        id="onboardingCompletedAt"
                        value={editingMerchant.onboardingCompletedAt || ""}
                        onChange={(e) => handleFieldChange("onboardingCompletedAt", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="hours" className="space-y-4">
                <div className="text-sm text-gray-500 mb-4">
                  Configure operating hours for each day of the week
                </div>
                
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium capitalize">{day}</h3>
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <Checkbox
                        id={`${day}-closed`}
                        checked={editingMerchant.operatingHours?.[day]?.isClosed || false}
                        onCheckedChange={(checked) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            operatingHours: {
                              ...editingMerchant.operatingHours,
                              [day]: {
                                ...editingMerchant.operatingHours?.[day],
                                isClosed: checked === true
                              }
                            }
                          });
                        }}
                      />
                      <Label htmlFor={`${day}-closed`} className="text-sm">Closed</Label>
                    </div>
                    
                    {!editingMerchant.operatingHours?.[day]?.isClosed && (
                      <div className="grid grid-cols-2 gap-4 pl-4">
                        <div>
                          <Label htmlFor={`${day}-open`}>Opening Time</Label>
                          <Input
                            id={`${day}-open`}
                            value={editingMerchant.operatingHours?.[day]?.open || ""}
                            onChange={(e) => {
                              setEditingMerchant({
                                ...editingMerchant,
                                operatingHours: {
                                  ...editingMerchant.operatingHours,
                                  [day]: {
                                    ...editingMerchant.operatingHours?.[day],
                                    open: e.target.value
                                  }
                                }
                              });
                            }}
                            placeholder="09:00"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`${day}-close`}>Closing Time</Label>
                          <Input
                            id={`${day}-close`}
                            value={editingMerchant.operatingHours?.[day]?.close || ""}
                            onChange={(e) => {
                              setEditingMerchant({
                                ...editingMerchant,
                                operatingHours: {
                                  ...editingMerchant.operatingHours,
                                  [day]: {
                                    ...editingMerchant.operatingHours?.[day],
                                    close: e.target.value
                                  }
                                }
                              });
                            }}
                            placeholder="17:00"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="notifications" className="space-y-4">
                <div className="text-sm text-gray-500 mb-4">
                  Configure which notifications this merchant should receive
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "customerAnniversary", label: "Customer Anniversary" },
                    { key: "customerBirthday", label: "Customer Birthday" },
                    { key: "customerFirstPurchase", label: "Customer First Purchase" },
                    { key: "customerMilestone", label: "Customer Milestone" },
                    { key: "dailySummary", label: "Daily Summary" },
                    { key: "lowInventory", label: "Low Inventory" },
                    { key: "monthlySummary", label: "Monthly Summary" },
                    { key: "paymentIssues", label: "Payment Issues" },
                    { key: "pointsAwarded", label: "Points Awarded" },
                    { key: "rewardCreated", label: "Reward Created" },
                    { key: "rewardExpiring", label: "Reward Expiring" },
                    { key: "rewardRedeemed", label: "Reward Redeemed" },
                    { key: "salesTarget", label: "Sales Target" },
                    { key: "securityAlerts", label: "Security Alerts" },
                    { key: "systemUpdates", label: "System Updates" },
                    { key: "weeklySummary", label: "Weekly Summary" }
                  ].map(notification => (
                    <div key={notification.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`notification-${notification.key}`}
                        checked={
                          editingMerchant.notifications?.[notification.key as keyof typeof editingMerchant.notifications] || false
                        }
                        onCheckedChange={(checked) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            notifications: {
                              ...editingMerchant.notifications,
                              [notification.key]: checked === true
                            }
                          });
                        }}
                      />
                      <Label htmlFor={`notification-${notification.key}`}>{notification.label}</Label>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMerchant}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Merchant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this merchant? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {editingMerchant && (
            <div className="py-4">
              <p className="text-sm text-gray-500">
                You are about to delete: <strong>{editingMerchant.tradingName || editingMerchant.merchantName}</strong>
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMerchant}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Merchant Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Merchant</DialogTitle>
            <DialogDescription>
              Enter the details for the new merchant.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="newTradingName">Trading Name</Label>
                <Input
                  id="newTradingName"
                  value={newMerchant.tradingName || ""}
                  onChange={(e) => handleNewMerchantFieldChange("tradingName", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="newBusinessType">Business Type</Label>
                <Input
                  id="newBusinessType"
                  value={newMerchant.businessType || ""}
                  onChange={(e) => handleNewMerchantFieldChange("businessType", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="newAbn">ABN</Label>
                <Input
                  id="newAbn"
                  value={newMerchant.abn || ""}
                  onChange={(e) => handleNewMerchantFieldChange("abn", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="newPrimaryEmail">Primary Email</Label>
                <Input
                  id="newPrimaryEmail"
                  value={newMerchant.primaryEmail || ""}
                  onChange={(e) => handleNewMerchantFieldChange("primaryEmail", e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="newStreet">Street</Label>
                <Input
                  id="newStreet"
                  value={newMerchant.address?.street || ""}
                  onChange={(e) => handleNewMerchantAddressChange("street", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="newSuburb">Suburb</Label>
                <Input
                  id="newSuburb"
                  value={newMerchant.address?.suburb || ""}
                  onChange={(e) => handleNewMerchantAddressChange("suburb", e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="newPostcode">Postcode</Label>
                  <Input
                    id="newPostcode"
                    value={newMerchant.address?.postcode || ""}
                    onChange={(e) => handleNewMerchantAddressChange("postcode", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="newState">State</Label>
                  <Select 
                    value={newMerchant.address?.state} 
                    onValueChange={(value) => handleNewMerchantAddressChange("state", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="newStatus">Status</Label>
                <Select 
                  value={newMerchant.status} 
                  onValueChange={(value) => handleNewMerchantFieldChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMerchant}>
              Create Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 