"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Package, 
  Search, 
  Filter, 
  MoreHorizontal, 
  RefreshCw, 
  Download,
  Tag,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  Zap,
  Trash2,
  X
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, updateDoc, arrayUnion, setDoc } from "firebase/firestore"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import React from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

// Define types for Square Catalog objects
interface SquareCatalogObject {
  type: string
  id: string
  updated_at: string
  version: number
  is_deleted: boolean
  present_at_all_locations: boolean
  category_data?: {
    name: string
  }
  item_data?: {
    name: string
    description?: string
    category_id?: string
    variations?: SquareCatalogObject[]
  }
  item_variation_data?: {
    item_id: string
    name: string
    price_money?: {
      amount: number
      currency: string
    }
    sku?: string
    ordinal?: number
    pricing_type?: string
    available?: boolean
  }
  tax_data?: {
    name: string
    calculation_phase?: string
    inclusion_type?: string
    percentage?: string
    enabled?: boolean
  }
}

interface SquareCatalogResponse {
  objects: SquareCatalogObject[]
  cursor?: string
}

// Add a new interface for selected item
interface SelectedItem {
  item: SquareCatalogObject;
  categoryName: string;
}

// Add interface for inventory count
interface InventoryCount {
  catalogObjectId: string;
  quantity: string;
  state: string;
  locationId: string;
  updatedAt: string;
}

// Add interface for tap agent item
interface TapAgentItem extends SquareCatalogObject {
  costOfGoods?: number;
  selected?: boolean;
}

// Add interface for POS inventory item to be saved to Firestore
interface POSInventoryItem {
  id: string;
  name: string;
  retailPrice?: number;
  costOfGoods: number;
  type: string;
}

// Add interface for Lightspeed inventory items
interface LightspeedItem {
  itemID: string;
  systemSku: string;
  defaultCost: string;
  avgCost: string;
  discountable: string;
  tax: string;
  archived: string;
  itemType: string;
  serialized: string;
  description: string;
  modelYear: string;
  upc: string;
  ean: string;
  customSku: string;
  manufacturerSku: string;
  createTime: string;
  timeStamp: string;
  publishToEcom: string;
  categoryID: string;
  taxClassID: string;
  departmentID: string;
  itemMatrixID: string;
  manufacturerID: string;
  seasonID: string;
  defaultVendorID: string;
  Prices?: {
    ItemPrice: Array<{
      amount: string;
      useTypeID: string;
      useType: string;
    }> | {
      amount: string;
      useTypeID: string;
      useType: string;
    }
  }
  ItemShops?: {
    ItemShop: Array<{
      itemShopID: string;
      shopID: string;
      itemID: string;
      qoh: string; // Quantity on hand
      reorderPoint: string;
      reorderLevel: string;
      timeStamp: string;
    }> | {
      itemShopID: string;
      shopID: string;
      itemID: string;
      qoh: string; // Quantity on hand
      reorderPoint: string;
      reorderLevel: string;
      timeStamp: string;
    }
  }
}

// Add interface for Lightspeed Account
interface LightspeedAccount {
  accountID: string;
  name: string;
}

// Add a gradient text component for Tap Agent branding
const GradientText = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
      {children}
    </span>
  );
};

export default function InventoryPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [inventoryItems, setInventoryItems] = useState<SquareCatalogObject[]>([])
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSquareConnected, setIsSquareConnected] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  // Add state for the selected item and sheet visibility
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  // Add state for inventory counts
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, InventoryCount>>({})
  const [loadingInventory, setLoadingInventory] = useState(false)
  
  // Add state for tap agent items
  const [tapAgentItems, setTapAgentItems] = useState<TapAgentItem[]>([])
  const [isTapAgentSheetOpen, setIsTapAgentSheetOpen] = useState(false)
  // Add state for tap agent activation
  const [isTapAgentActivated, setIsTapAgentActivated] = useState(false)
  const [checkingTapAgent, setCheckingTapAgent] = useState(false)
  // Add state for existing tap agent inventory
  const [existingTapAgentItems, setExistingTapAgentItems] = useState<POSInventoryItem[]>([])
  const [loadingExistingItems, setLoadingExistingItems] = useState(false)
  // Add state for all items sheet
  const [isAllItemsSheetOpen, setIsAllItemsSheetOpen] = useState(false)

  // Add state for Lightspeed inventory
  const [lightspeedItems, setLightspeedItems] = useState<LightspeedItem[]>([]);
  const [loadingLightspeedItems, setLoadingLightspeedItems] = useState(false);
  const [lightspeedItemsError, setLightspeedItemsError] = useState<string | null>(null);
  const [lightspeedAccountInfo, setLightspeedAccountInfo] = useState<LightspeedAccount | null>(null);
  const [activeInventoryTab, setActiveInventoryTab] = useState<string>("square");
  const [selectedLightspeedItem, setSelectedLightspeedItem] = useState<LightspeedItem | null>(null);
  const [isLightspeedItemSheetOpen, setIsLightspeedItemSheetOpen] = useState(false);
  
  // Add pagination state for Lightspeed inventory
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [previousPageUrl, setPreviousPageUrl] = useState<string | null>(null);
  const [currentLightspeedPage, setCurrentLightspeedPage] = useState(1);
  const [loadingMoreItems, setLoadingMoreItems] = useState(false);
  
  // Add search state for Lightspeed inventory
  const [lightspeedSearchQuery, setLightspeedSearchQuery] = useState('');

  // Add the animation state variables
  const [tabAnimation, setTabAnimation] = useState<"fadeIn" | "fadeOut">("fadeIn");
  const [prevTab, setPrevTab] = useState<string>("square");

  // Add effect to handle tab animations
  useEffect(() => {
    if (activeInventoryTab !== prevTab) {
      // Start the fade out animation
      setTabAnimation("fadeOut");
      
      // After a short delay, update the tab and start fade in
      const timer = setTimeout(() => {
        setPrevTab(activeInventoryTab);
        setTabAnimation("fadeIn");
      }, 100); // Duration of fadeOut
      
      return () => clearTimeout(timer);
    }
  }, [activeInventoryTab, prevTab]);

  // Updated tab animation classes
  const tabAnimationClasses = {
    fadeIn: "animate-fadeIn",
    fadeOut: "animate-fadeOut",
  };

  // Fetch inventory data from Square
  useEffect(() => {
    const fetchInventory = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        setError(null)
        
        // First, check if Square integration exists
        const squareIntegrationRef = doc(db, 'merchants', user.uid, 'integrations', 'square')
        const squareIntegrationDoc = await getDoc(squareIntegrationRef)
        
        if (!squareIntegrationDoc.exists() || !squareIntegrationDoc.data().connected) {
          setIsSquareConnected(false)
          setLoading(false)
          return
        }
        
        setIsSquareConnected(true)
        
        // Call our API endpoint that will fetch data from Square
        const response = await fetch(`/api/square/catalog?merchantId=${user.uid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch inventory: ${response.statusText}`)
        }
        
        const data: SquareCatalogResponse = await response.json()
        
        // Process categories
        const categoryMap: Record<string, string> = {}
        data.objects.forEach(obj => {
          if (obj.type === 'CATEGORY' && obj.category_data) {
            categoryMap[obj.id] = obj.category_data.name
          }
        })
        
        setCategories(categoryMap)
        
        // Filter to only show items and item variations
        const items = data.objects.filter(obj => 
          obj.type === 'ITEM' || 
          obj.type === 'ITEM_VARIATION' || 
          obj.type === 'CATEGORY'
        )
        
        setInventoryItems(items)
        
        // Collect item IDs for inventory count lookup
        const itemIds = items
          .filter(item => item.type === 'ITEM_VARIATION')
          .map(item => item.id)
        
        // Fetch inventory counts
        await fetchInventoryCounts(itemIds)
      } catch (error) {
        console.error("Error fetching inventory:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch inventory")
        toast({
          title: "Error",
          description: "Failed to load inventory data. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchInventory()
  }, [user, toast])
  
  // Refresh inventory data
  const handleRefresh = async () => {
    if (!user?.uid) return
    
    try {
      setRefreshing(true)
      
      // Call our API endpoint that will fetch data from Square
      const response = await fetch(`/api/square/catalog?merchantId=${user.uid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.statusText}`)
      }
      
      const data: SquareCatalogResponse = await response.json()
      
      // Process categories
      const categoryMap: Record<string, string> = {}
      data.objects.forEach(obj => {
        if (obj.type === 'CATEGORY' && obj.category_data) {
          categoryMap[obj.id] = obj.category_data.name
        }
      })
      
      setCategories(categoryMap)
      
      // Filter to only show items and item variations
      const items = data.objects.filter(obj => 
        obj.type === 'ITEM' || 
        obj.type === 'ITEM_VARIATION' || 
        obj.type === 'CATEGORY'
      )
      
      setInventoryItems(items)
      
      // Collect item IDs for inventory count lookup
      const itemIds = items
        .filter(item => item.type === 'ITEM_VARIATION')
        .map(item => item.id)
      
      // Fetch inventory counts
      await fetchInventoryCounts(itemIds)
      
      toast({
        title: "Inventory Refreshed",
        description: "Your inventory data has been updated.",
      })
    } catch (error) {
      console.error("Error refreshing inventory:", error)
      toast({
        title: "Error",
        description: "Failed to refresh inventory data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Filter inventory items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return inventoryItems.filter(item => 
        item.type === 'ITEM' || item.type === 'ITEM_VARIATION'
      );
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    return inventoryItems.filter(item => {
      if (item.type === 'ITEM' && item.item_data) {
        return (
          (item.item_data.name?.toLowerCase().includes(query)) ||
          (item.item_data.description?.toLowerCase().includes(query))
        );
      }
      
      if (item.type === 'ITEM_VARIATION' && item.item_variation_data) {
        return (
          (item.item_variation_data.name?.toLowerCase().includes(query)) ||
          (item.item_variation_data.sku?.toLowerCase().includes(query))
        );
      }
      
      return false;
    });
  }, [inventoryItems, searchQuery]);

  // Format price from cents to dollars
  const formatPrice = (amount: number | undefined, currency: string = 'USD') => {
    if (amount === undefined) return 'N/A'
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100)
  }

  // Get category name from category ID
  const getCategoryName = (categoryId: string | undefined) => {
    if (!categoryId) return 'Uncategorized'
    return categories[categoryId] || 'Unknown Category'
  }

  // Add function to handle item click
  const handleItemClick = (item: SquareCatalogObject) => {
    let categoryName = 'Uncategorized';
    
    // For items, get the category name
    if (item.type === 'ITEM' && item.item_data?.category_id) {
      categoryName = getCategoryName(item.item_data.category_id);
    }
    
    // For variations, try to find the parent item to get the category
    if (item.type === 'ITEM_VARIATION' && item.item_variation_data?.item_id) {
      const parentItem = inventoryItems.find(i => 
        i.type === 'ITEM' && i.id === item.item_variation_data?.item_id
      );
      
      if (parentItem?.item_data?.category_id) {
        categoryName = getCategoryName(parentItem.item_data.category_id);
      }
    }
    
    setSelectedItem({ item, categoryName });
    setIsSheetOpen(true);
  };

  // Add function to fetch inventory counts
  const fetchInventoryCounts = async (itemIds: string[]) => {
    if (!user?.uid || itemIds.length === 0) return
    
    try {
      setLoadingInventory(true)
      
      // Call our API endpoint to get inventory counts
      const response = await fetch(`/api/square/inventory?merchantId=${user.uid}&catalogItemIds=${itemIds.join(',')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory counts: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Process inventory counts
      const countsMap: Record<string, InventoryCount> = {}
      
      if (data.counts && Array.isArray(data.counts)) {
        data.counts.forEach((count: any) => {
          if (count.catalog_object_id && count.quantity) {
            countsMap[count.catalog_object_id] = {
              catalogObjectId: count.catalog_object_id,
              quantity: count.quantity,
              state: count.state || 'IN_STOCK',
              locationId: count.location_id || '',
              updatedAt: count.calculated_at || ''
            }
          }
        })
      }
      
      setInventoryCounts(countsMap)
    } catch (error) {
      console.error("Error fetching inventory counts:", error)
      // We don't want to show an error toast for this, as it's not critical
    } finally {
      setLoadingInventory(false)
    }
  }

  // Update getStockQuantity function to use inventory counts
  const getStockQuantity = (item: SquareCatalogObject): string => {
    if (item.type === 'ITEM_VARIATION') {
      const count = inventoryCounts[item.id]
      if (count) {
        return count.quantity
      }
    }
    
    // For items with variations, check if any variations have inventory
    if (item.type === 'ITEM' && item.item_data?.variations && item.item_data.variations.length > 0) {
      let totalStock = 0
      let hasStock = false
      
      item.item_data.variations.forEach(variation => {
        const count = inventoryCounts[variation.id]
        if (count) {
          hasStock = true
          totalStock += parseFloat(count.quantity)
        }
      })
      
      if (hasStock) {
        return totalStock.toString()
      }
    }
    
    return "N/A"
  }

  // Add function to render item details in the side panel
  const renderItemDetails = () => {
    if (!selectedItem) return null;
    
    const { item, categoryName } = selectedItem;
    
    if (item.type === 'ITEM' && item.item_data) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Item Details</h3>
            <p className="text-sm text-muted-foreground">View detailed information about this item.</p>
          </div>
          
          <div className="grid gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Name</h4>
              <p className="text-sm">{item.item_data.name}</p>
            </div>
            
            {item.item_data.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm">{item.item_data.description}</p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-1">Category</h4>
              <p className="text-sm">{categoryName}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">ID</h4>
              <p className="text-sm font-mono text-xs bg-gray-50 p-1 rounded">{item.id}</p>
            </div>
            
            {item.item_data.variations && item.item_data.variations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Variations</h4>
                <div className="space-y-2">
                  {item.item_data.variations.map(variation => {
                    const inventoryCount = inventoryCounts[variation.id]
                    
                    return (
                      <div key={variation.id} className="bg-gray-50 p-3 rounded-md">
                        <p className="font-medium text-sm">{variation.item_variation_data?.name}</p>
                        {variation.item_variation_data?.sku && (
                          <p className="text-xs text-muted-foreground mt-1">SKU: {variation.item_variation_data.sku}</p>
                        )}
                        {variation.item_variation_data?.price_money && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Price: {formatPrice(variation.item_variation_data.price_money.amount, variation.item_variation_data.price_money.currency)}
                          </p>
                        )}
                        {inventoryCount && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Stock: {inventoryCount.quantity}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-1">Last Updated</h4>
              <p className="text-sm">{new Date(item.updated_at).toLocaleString()}</p>
            </div>
          </div>
          
          <div className="pt-4">
            <Button variant="outline" className="w-full" onClick={() => setIsSheetOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      );
    }
    
    if (item.type === 'ITEM_VARIATION' && item.item_variation_data) {
      // Find parent item
      const parentItem = inventoryItems.find(i => 
        i.type === 'ITEM' && i.id === item.item_variation_data?.item_id
      );
      
      const inventoryCount = inventoryCounts[item.id]
      
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Variation Details</h3>
            <p className="text-sm text-muted-foreground">View detailed information about this variation.</p>
          </div>
          
          <div className="grid gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Name</h4>
              <p className="text-sm">{item.item_variation_data.name}</p>
            </div>
            
            {parentItem?.item_data?.name && (
              <div>
                <h4 className="text-sm font-medium mb-1">Parent Item</h4>
                <p className="text-sm">{parentItem.item_data.name}</p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-1">Category</h4>
              <p className="text-sm">{categoryName}</p>
            </div>
            
            {item.item_variation_data.sku && (
              <div>
                <h4 className="text-sm font-medium mb-1">SKU</h4>
                <p className="text-sm">{item.item_variation_data.sku}</p>
              </div>
            )}
            
            {item.item_variation_data.price_money && (
              <div>
                <h4 className="text-sm font-medium mb-1">Price</h4>
                <p className="text-sm">{formatPrice(item.item_variation_data.price_money.amount, item.item_variation_data.price_money.currency)}</p>
              </div>
            )}
            
            {inventoryCount && (
              <div>
                <h4 className="text-sm font-medium mb-1">Stock Quantity</h4>
                <p className="text-sm">{inventoryCount.quantity}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {new Date(inventoryCount.updatedAt).toLocaleString()}
                </p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-1">ID</h4>
              <p className="text-sm font-mono text-xs bg-gray-50 p-1 rounded">{item.id}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">Last Updated</h4>
              <p className="text-sm">{new Date(item.updated_at).toLocaleString()}</p>
            </div>
          </div>
          
          <div className="pt-4">
            <Button variant="outline" className="w-full" onClick={() => setIsSheetOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Add function to check if Tap Agent is activated
  const checkTapAgentActivation = async () => {
    if (!user?.uid) return false;
    
    try {
      setCheckingTapAgent(true);
      
      // Check if the merchant has a document in the agents collection
      const agentDocRef = doc(db, 'agents', user.uid);
      const agentDoc = await getDoc(agentDocRef);
      
      // If the agent document exists, also fetch the existing inventory items
      if (agentDoc.exists()) {
        const data = agentDoc.data();
        if (data.posInventory && Array.isArray(data.posInventory)) {
          setExistingTapAgentItems(data.posInventory);
        } else {
          setExistingTapAgentItems([]);
        }
      } else {
        setExistingTapAgentItems([]);
      }
      
      setIsTapAgentActivated(agentDoc.exists());
      return agentDoc.exists();
    } catch (error) {
      console.error("Error checking Tap Agent activation:", error);
      return false;
    } finally {
      setCheckingTapAgent(false);
    }
  };

  // Add function to handle opening tap agent sheet
  const handleOpenTapAgentSheet = async () => {
    // First check if Tap Agent is activated
    setLoadingExistingItems(true);
    const isActivated = await checkTapAgentActivation();
    
    if (!isActivated) {
      setIsTapAgentSheetOpen(true);
      setLoadingExistingItems(false);
      return;
    }
    
    // Convert inventory items to tap agent items
    const items = inventoryItems
      .filter(item => item.type === 'ITEM' || item.type === 'ITEM_VARIATION')
      .map(item => {
        // Check if this item already exists in the Tap Agent inventory
        const existingItem = existingTapAgentItems.find(existing => existing.id === item.id);
        
        return {
          ...item,
          costOfGoods: existingItem?.costOfGoods || 0,
          selected: false
        };
      });
    
    setTapAgentItems(items);
    setIsTapAgentSheetOpen(true);
    setLoadingExistingItems(false);
  };

  // Add function to navigate to Tap Agent activation
  const handleGoToTapAgent = () => {
    router.push('/tap-agent');
    setIsTapAgentSheetOpen(false);
  };

  // Add function to handle selecting all items
  const handleSelectAll = () => {
    setTapAgentItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        selected: true
      }))
    );
  };

  // Add function to handle unselecting all items
  const handleUnselectAll = () => {
    setTapAgentItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        selected: false
      }))
    );
  };

  // Add function to handle selecting a single item
  const handleSelectItem = (id: string) => {
    setTapAgentItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Add function to handle cost of goods change
  const handleCostOfGoodsChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    setTapAgentItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, costOfGoods: numValue } : item
      )
    );
  };

  // Add function to handle submit
  const handleSubmitToTapAgent = async () => {
    if (!user?.uid) return;
    
    const selectedItems = tapAgentItems.filter(item => item.selected);
    
    // Check if all selected items have a cost of goods
    const missingCosts = selectedItems.filter(item => !item.costOfGoods || item.costOfGoods <= 0);
    
    if (missingCosts.length > 0) {
      toast({
        title: "Missing Cost Information",
        description: "Please enter cost of goods for all selected items.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsTapAgentSheetOpen(false);
      
      // Show loading toast
      toast({
        title: "Saving Items",
        description: "Adding inventory items to Tap Agent...",
      });
      
      // Format items for Firestore
      const posInventoryItems: POSInventoryItem[] = selectedItems.map(item => {
        let name = '';
        let retailPrice: number | null = null;
        let type = item.type;
        
        if (item.type === 'ITEM' && item.item_data) {
          name = item.item_data.name;
        } else if (item.type === 'ITEM_VARIATION' && item.item_variation_data) {
          name = item.item_variation_data.name;
          
          if (item.item_variation_data.price_money) {
            retailPrice = item.item_variation_data.price_money.amount / 100; // Convert cents to dollars
          }
        }
        
        // Create the item object, ensuring no undefined values
        return {
          id: item.id,
          name,
          // Only include retailPrice if it's not null
          ...(retailPrice !== null && { retailPrice }),
          costOfGoods: item.costOfGoods || 0,
          type
        };
      });
      
      // Reference to the agent document
      const agentDocRef = doc(db, 'agents', user.uid);
      
      // Get the current document to check if it exists
      const agentDoc = await getDoc(agentDocRef);
      
      if (agentDoc.exists()) {
        // Document exists, but we need to handle the posInventory array differently
        // to avoid the arrayUnion with undefined values error
        
        // Get current posInventory or initialize as empty array
        const currentData = agentDoc.data();
        const currentInventory = currentData.posInventory || [];
        
        // Merge the arrays without using arrayUnion
        const updatedInventory = [...currentInventory, ...posInventoryItems];
        
        // Update with the combined array
        await updateDoc(agentDocRef, {
          posInventory: updatedInventory
        });
      } else {
        // Document doesn't exist, create it with the posInventory array
        await setDoc(agentDocRef, {
          posInventory: posInventoryItems
        });
      }
      
      // Success toast
      toast({
        title: "Items Added Successfully",
        description: `${selectedItems.length} items have been added to Tap Agent.`,
        variant: "default"
      });
      
    } catch (error) {
      console.error("Error saving items to Tap Agent:", error);
      
      // Error toast
      toast({
        title: "Error",
        description: "Failed to add items to Tap Agent. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add function to remove an item from Tap Agent inventory
  const handleRemoveFromTapAgent = async (itemId: string) => {
    if (!user?.uid) return;
    
    try {
      // Show loading toast
      toast({
        title: "Removing Item",
        description: "Removing item from Tap Agent...",
      });
      
      // Reference to the agent document
      const agentDocRef = doc(db, 'agents', user.uid);
      
      // Get the current document
      const agentDoc = await getDoc(agentDocRef);
      
      if (agentDoc.exists()) {
        const data = agentDoc.data();
        
        if (data.posInventory && Array.isArray(data.posInventory)) {
          // Filter out the item to be removed
          const updatedInventory = data.posInventory.filter((item: POSInventoryItem) => item.id !== itemId);
          
          // Update the document with the filtered array
          await updateDoc(agentDocRef, {
            posInventory: updatedInventory
          });
          
          // Update local state
          setExistingTapAgentItems(updatedInventory);
          
          // Success toast
          toast({
            title: "Item Removed",
            description: "Item has been removed from Tap Agent.",
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error("Error removing item from Tap Agent:", error);
      
      // Error toast
      toast({
        title: "Error",
        description: "Failed to remove item from Tap Agent. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add function to fetch Lightspeed account info and inventory
  const fetchLightspeedInventory = async (pageUrl?: string) => {
    if (!user?.uid) return;
    
    try {
      if (pageUrl) {
        setLoadingMoreItems(true);
      } else {
        setLoadingLightspeedItems(true);
        setLightspeedItemsError(null);
      }
      
      // Fetch account info first if we don't have it yet
      if (!lightspeedAccountInfo && !pageUrl) {
        console.log('Fetching Lightspeed account info first...');
        try {
          const accountResponse = await fetch(`/api/lightspeed/account?merchantId=${user.uid}`);
          const accountData = await accountResponse.json();
          
          if (!accountResponse.ok) {
            throw new Error(accountData.error || 'Failed to fetch Lightspeed account information');
          }
          
          if (accountData.success && accountData.account) {
            setLightspeedAccountInfo(accountData.account);
            // Now that we have the account info, we need to wait for state to update
            // So we'll exit early and let the useEffect call this function again
            setLoadingLightspeedItems(false);
            return;
          } else {
            throw new Error('No Lightspeed account found or API returned no data');
          }
        } catch (error) {
          console.error('Error fetching Lightspeed account:', error);
          throw error; // Re-throw to be caught by the outer try/catch
        }
      }
      
      // Make sure we have the account ID before proceeding
      const accountId = lightspeedAccountInfo?.accountID;
      if (!accountId && !pageUrl) {
        throw new Error('Lightspeed Account ID is required');
      }
      
      // Now fetch inventory items
      let apiUrl: string;
      
      if (pageUrl) {
        // If it's already a proxy URL (our own API), use it as is
        if (pageUrl.startsWith('/api/')) {
          apiUrl = pageUrl;
        } else {
          // Otherwise, parse the URL to extract parameters
          try {
            const url = new URL(pageUrl);
            // Start with the base URL
            apiUrl = `/api/lightspeed/inventory?merchantId=${user.uid}&accountId=${accountId}&limit=100`;
            
            // Copy all parameters from the original URL
            url.searchParams.forEach((value, key) => {
              if (key !== 'merchantId' && key !== 'accountId' && key !== 'limit') {
                apiUrl += `&${key}=${value}`;
              }
            });
          } catch (error) {
            console.error('Error parsing URL:', error);
            apiUrl = `/api/lightspeed/inventory?merchantId=${user.uid}&accountId=${accountId}&limit=100`;
          }
        }
      } else {
        apiUrl = `/api/lightspeed/inventory?merchantId=${user.uid}&accountId=${accountId}&limit=100`;
      }
      
      // Log the API URL we're using
      console.log('Fetching inventory with URL:', apiUrl);
      
      const itemsResponse = await fetch(apiUrl);
      const itemsData = await itemsResponse.json();
      
      // Add detailed logging for debugging
      console.log('API Response status:', itemsResponse.status);
      console.log('API Response data:', itemsData);
      
      if (!itemsResponse.ok) {
        throw new Error(itemsData.error || 'Failed to fetch Lightspeed inventory data');
      }
      
      if (itemsData.success && Array.isArray(itemsData.items)) {
        console.log(`Found ${itemsData.items.length} items in search results`);
        // Sort items by stock quantity (highest to lowest)
        const sortedItems = itemsData.items.sort((a: LightspeedItem, b: LightspeedItem) => {
          // Extract quantity on hand for item A
          let qohA = 0;
          if (a.ItemShops && a.ItemShops.ItemShop) {
            const itemShopsA = Array.isArray(a.ItemShops.ItemShop) 
              ? a.ItemShops.ItemShop 
              : [a.ItemShops.ItemShop];
            
            const totalShopA = itemShopsA.find((shop: { shopID: string; qoh: string }) => shop.shopID === "0");
            if (totalShopA) {
              qohA = parseInt(totalShopA.qoh) || 0;
            } else if (itemShopsA.length > 0) {
              qohA = parseInt(itemShopsA[0].qoh) || 0;
            }
          }
          
          // Extract quantity on hand for item B
          let qohB = 0;
          if (b.ItemShops && b.ItemShops.ItemShop) {
            const itemShopsB = Array.isArray(b.ItemShops.ItemShop) 
              ? b.ItemShops.ItemShop 
              : [b.ItemShops.ItemShop];
            
            const totalShopB = itemShopsB.find((shop: { shopID: string; qoh: string }) => shop.shopID === "0");
            if (totalShopB) {
              qohB = parseInt(totalShopB.qoh) || 0;
            } else if (itemShopsB.length > 0) {
              qohB = parseInt(itemShopsB[0].qoh) || 0;
            }
          }
          
          // Sort by stock quantity, descending (highest first)
          return qohB - qohA;
        });
        
        // If this is a pagination request, update the page number
        if (pageUrl) {
          setCurrentLightspeedPage(prev => {
            // If it's a next page request, increment
            if (pageUrl.includes('after=')) {
              return prev + 1;
            }
            // If it's a previous page request, decrement
            else if (pageUrl.includes('before=')) {
              return Math.max(1, prev - 1);
            }
            return prev;
          });
        } else {
          // Reset to page 1 for a fresh request
          setCurrentLightspeedPage(1);
        }
        
        // Set the items
        setLightspeedItems(sortedItems);
        
        // Set pagination URLs directly from the API response
        setNextPageUrl(itemsData.pagination?.nextUrl || null);
        setPreviousPageUrl(itemsData.pagination?.previousUrl || null);
      } else {
        console.log('No items found or invalid response format:', itemsData);
        setLightspeedItems([]);
        setNextPageUrl(null);
        setPreviousPageUrl(null);
      }
    } catch (error) {
      console.error('Error fetching Lightspeed inventory:', error);
      setLightspeedItemsError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      if (pageUrl) {
        setLoadingMoreItems(false);
      } else {
        setLoadingLightspeedItems(false);
      }
    }
  };

  // Add effect to fetch Lightspeed inventory when tab changes
  useEffect(() => {
    if (activeInventoryTab === 'lightspeed' && user?.uid) {
      fetchLightspeedInventory();
    }
  }, [activeInventoryTab, user?.uid, lightspeedAccountInfo?.accountID]);

  // Add function to handle Lightspeed item click
  const handleLightspeedItemClick = (item: LightspeedItem) => {
    setSelectedLightspeedItem(item);
    setIsLightspeedItemSheetOpen(true);
  };

  // Add function to retry loading Lightspeed inventory
  const handleTryAgain = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    fetchLightspeedInventory();
  };

  // Add function to handle search submission
  const handleLightspeedSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user?.uid || !lightspeedAccountInfo?.accountID) return;
    
    let searchUrl = `/api/lightspeed/inventory?merchantId=${user.uid}&accountId=${lightspeedAccountInfo.accountID}&limit=100`;
    
    if (lightspeedSearchQuery) {
      // Use 'like' operator (~) for text search on description with wildcards
      searchUrl += `&description=~,${encodeURIComponent(`%${lightspeedSearchQuery}%`)}`;
    }
    
    // Reset pagination state
    setCurrentLightspeedPage(1);
    
    // Fetch with search parameters
    fetchLightspeedInventory(searchUrl);
  };
  
  // Add handler to clear search
  const handleClearSearch = () => {
    setLightspeedSearchQuery('');
    
    if (user?.uid && lightspeedAccountInfo?.accountID) {
      fetchLightspeedInventory(`/api/lightspeed/inventory?merchantId=${user.uid}&accountId=${lightspeedAccountInfo.accountID}&limit=100`);
    }
  };

  // Add this CSS class between the existing Square and Lightspeed tab conditionals
  const tabContentClass = "transition-opacity duration-200";

  return (
    <PageTransition>
      <div className="p-6 py-4">
        <PageHeader
          title="Inventory"
        >
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={handleRefresh}
              disabled={refreshing || loading}
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              disabled={!isSquareConnected}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="h-8"
              disabled={!isSquareConnected || loading}
              onClick={handleOpenTapAgentSheet}
            >
              <Zap className="h-4 w-4 mr-2" />
              Add to Tap Agent
            </Button>
          </div>
        </PageHeader>

        {/* GitHub-inspired tabs (without slider animation) */}
        <div className="mb-6">
          <div className="flex items-center bg-gray-100 p-1 rounded-md inline-flex">
            <button
              onClick={() => setActiveInventoryTab("square")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeInventoryTab === "square"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Package className="h-4 w-4" />
              <span>Square</span>
            </button>
            <button
              onClick={() => setActiveInventoryTab("lightspeed")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 ml-1 text-sm font-medium rounded-md transition-colors",
                activeInventoryTab === "lightspeed"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Tag className="h-4 w-4" />
              <span>Lightspeed</span>
            </button>
          </div>
        </div>

        {/* Conditional rendering with AnimatePresence for transitions */}
        <AnimatePresence mode="wait">
          {activeInventoryTab === "square" ? (
            <motion.div
              key="square"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Square tab content */}
        {!isSquareConnected && !loading && (
                <div className="bg-muted p-6 rounded-md text-center">
            <h3 className="text-lg font-medium mb-2">Square Integration Required</h3>
            <p className="text-muted-foreground mb-4">
              To view and manage your inventory, you need to connect your Square account.
            </p>
            <Button onClick={() => router.push('/integrations')}>
              Go to Integrations
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading inventory...</span>
          </div>
        ) : error ? (
                <div className="bg-destructive/10 p-6 rounded-md text-center">
            <h3 className="text-lg font-medium mb-2 text-destructive">Error Loading Inventory</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : isSquareConnected && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search inventory..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {loadingInventory && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Updating inventory counts...
                </div>
              )}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Inventory Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          {searchQuery ? "No items found matching your search." : "No inventory items found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => {
                        // Skip rendering categories in the table
                        if (item.type === 'CATEGORY') return null
                        
                        // For items
                        if (item.type === 'ITEM' && item.item_data) {
                          return (
                            <TableRow 
                              key={item.id} 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => handleItemClick(item)}
                            >
                              <TableCell className="font-medium">
                                {item.item_data.name}
                                {item.item_data.description && (
                                  <p className="text-xs text-muted-foreground truncate max-w-xs">
                                    {item.item_data.description}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Item
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getCategoryName(item.item_data.category_id)}
                              </TableCell>
                              <TableCell>
                                N/A
                              </TableCell>
                              <TableCell className="text-right">
                                {item.item_data.variations && item.item_data.variations.length > 0 ? (
                                  <span>Various</span>
                                ) : (
                                  <span>N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {loadingInventory ? (
                                  <span className="flex justify-end">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </span>
                                ) : (
                                  <span className={`${getStockQuantity(item) === "0" ? "text-destructive" : getStockQuantity(item) === "N/A" ? "text-muted-foreground" : ""}`}>
                                    {getStockQuantity(item)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        }
                        
                        // For item variations
                        if (item.type === 'ITEM_VARIATION' && item.item_variation_data) {
                          return (
                            <TableRow 
                              key={item.id} 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => handleItemClick(item)}
                            >
                              <TableCell className="font-medium">
                                {item.item_variation_data.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  Variation
                                </Badge>
                              </TableCell>
                              <TableCell>
                                N/A
                              </TableCell>
                              <TableCell>
                                {item.item_variation_data.sku || 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.item_variation_data.price_money ? 
                                  formatPrice(item.item_variation_data.price_money.amount, item.item_variation_data.price_money.currency) : 
                                  'N/A'
                                }
                              </TableCell>
                              <TableCell>
                                {loadingInventory ? (
                                  <span className="flex justify-end">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </span>
                                ) : (
                                  <span className={`${getStockQuantity(item) === "0" ? "text-destructive" : getStockQuantity(item) === "N/A" ? "text-muted-foreground" : ""}`}>
                                    {getStockQuantity(item)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        }
                        
                        return null
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
            </motion.div>
          ) : (
            <motion.div
              key="lightspeed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Lightspeed tab content */}
              {loadingLightspeedItems ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-lg">Loading Lightspeed inventory...</span>
                </div>
              ) : lightspeedItemsError ? (
                <div className="bg-destructive/10 p-6 rounded-md text-center">
                  <h3 className="text-lg font-medium mb-2 text-destructive">Error Loading Lightspeed Inventory</h3>
                  <p className="text-muted-foreground mb-4">{lightspeedItemsError}</p>
                  <Button 
                    variant="outline" 
                    onClick={handleTryAgain}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  {lightspeedAccountInfo && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Account:</span> {lightspeedAccountInfo.name} 
                        <span className="ml-3 font-medium">ID:</span> {lightspeedAccountInfo.accountID}
                      </p>
                    </div>
                  )}
                  
                  {/* Lightspeed Search Box */}
                  <div className="mb-4">
                    <form onSubmit={handleLightspeedSearch} className="flex gap-2">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Search inventory..."
                          className="pl-8 rounded-md"
                          value={lightspeedSearchQuery}
                          onChange={(e) => setLightspeedSearchQuery(e.target.value)}
                        />
                        {lightspeedSearchQuery && (
                          <button
                            type="button"
                            onClick={handleClearSearch}
                            className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <Button type="submit" className="rounded-md">
                        Search
                      </Button>
                    </form>
                  </div>
                  
                  {/* Lightspeed Inventory Table */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Lightspeed Inventory Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[250px]">Description</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>UPC/EAN</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lightspeedItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="h-24 text-center">
                                No Lightspeed inventory items found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            lightspeedItems.map((item) => {
                              // Get quantity on hand from ItemShops relation
                              let qoh = "N/A";
                              if (item.ItemShops && item.ItemShops.ItemShop) {
                                const itemShops = Array.isArray(item.ItemShops.ItemShop) 
                                  ? item.ItemShops.ItemShop 
                                  : [item.ItemShops.ItemShop];
                                
                                // Try to find total inventory (shopID = 0)
                                const totalShop = itemShops.find(shop => shop.shopID === "0");
                                if (totalShop) {
                                  qoh = totalShop.qoh;
                                } else if (itemShops.length > 0) {
                                  // If no total, but we have shops, use the first one
                                  qoh = itemShops[0].qoh;
                                }
                              }
                              
                              return (
                                <TableRow key={item.itemID} className="cursor-pointer hover:bg-gray-50" onClick={() => handleLightspeedItemClick(item)}>
                                  <TableCell className="font-medium">
                                    {item.description}
                                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                                      Created: {new Date(item.createTime).toLocaleDateString()}
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    {item.customSku || item.systemSku}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-md">
                                      {item.itemType || 'default'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {item.upc || item.ean || 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${parseFloat(item.avgCost || item.defaultCost || '0').toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.Prices?.ItemPrice && (
                                      Array.isArray(item.Prices.ItemPrice)
                                        ? (item.Prices.ItemPrice.length > 0 
                                          ? `$${parseFloat(item.Prices.ItemPrice[0].amount || '0').toFixed(2)}`
                                          : 'N/A')
                                        : `$${parseFloat(item.Prices.ItemPrice.amount || '0').toFixed(2)}`
                                    ) || 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    <span className={qoh === "0" ? "text-red-600" : ""}>
                                      {qoh}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  {/* Pagination Controls */}
                  {(nextPageUrl || previousPageUrl) && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {currentLightspeedPage}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            if (previousPageUrl) fetchLightspeedInventory(previousPageUrl);
                          }}
                          disabled={!previousPageUrl || loadingMoreItems}
                          className="h-8 rounded-md"
                        >
                          {loadingMoreItems && previousPageUrl && (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          )}
                          Previous Page
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            if (nextPageUrl) fetchLightspeedInventory(nextPageUrl);
                          }}
                          disabled={!nextPageUrl || loadingMoreItems}
                          className="h-8 rounded-md"
                        >
                          Next Page
                          {loadingMoreItems && nextPageUrl && (
                            <Loader2 className="h-3 w-3 ml-2 animate-spin" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {loadingMoreItems && !previousPageUrl && !nextPageUrl && (
                    <div className="flex justify-center mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading more items...
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Add global style to prevent double backdrop when both sheets are open */}
        {isAllItemsSheetOpen && isTapAgentSheetOpen && (
          <style jsx global>{`
            body > div[role="presentation"] + div[role="presentation"] {
              display: none;
            }
          `}</style>
        )}

        {/* Side panel for item details */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle>
                {selectedItem?.item.type === 'ITEM' 
                  ? selectedItem.item.item_data?.name 
                  : selectedItem?.item.item_variation_data?.name || 'Item Details'}
              </SheetTitle>
              <SheetDescription>
                {selectedItem?.item.type === 'ITEM' 
                  ? 'Product information' 
                  : 'Variation information'}
              </SheetDescription>
            </SheetHeader>
            <Separator />
            <ScrollArea className="h-[calc(100vh-8rem)] py-4">
              {renderItemDetails()}
            </ScrollArea>
          </SheetContent>
        </Sheet>
        
        {/* Side panel for adding items to Tap Agent */}
        <Sheet open={isTapAgentSheetOpen} onOpenChange={setIsTapAgentSheetOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col">
            {!isTapAgentActivated ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-center space-y-4 p-6">
                  <Zap className="h-12 w-12 mx-auto text-orange-500" />
                  <h3 className="text-xl font-semibold">
                    Activate <GradientText>Tap Agent</GradientText> First
                  </h3>
                  <p className="text-muted-foreground">
                    You need to activate Tap Agent before adding inventory items.
                  </p>
                  <Button onClick={handleGoToTapAgent} className="mt-4">
                    Go to Tap Agent Setup
                  </Button>
                </div>
              </div>
            ) : loadingExistingItems ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>Loading inventory items...</p>
              </div>
            ) : (
              <>
                {/* Header section */}
                <div className="flex-none">
                  <SheetHeader className="pb-4">
                    <SheetTitle>
                      Add Items to <GradientText>Tap Agent</GradientText>
                    </SheetTitle>
                    <SheetDescription>
                      Select items to create a catalog for automatic customer rewards
                    </SheetDescription>
                  </SheetHeader>
                  
                  {/* Existing Tap Agent Items Section - Simplified to a single summary row */}
                  {existingTapAgentItems.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <div className="bg-blue-50 rounded-md py-2 px-3 flex-1 flex items-center mr-2">
                          <div className="mr-2 text-blue-600">
                            <Zap className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 flex items-center">
                            <div className="truncate">
                              <span className="text-sm font-medium text-blue-800">
                                {existingTapAgentItems.length === 1 ? (
                                  existingTapAgentItems[0].name
                                ) : (
                                  `${existingTapAgentItems[0].name}${existingTapAgentItems.length > 1 ? "..." : ""}`
                                )}
                              </span>
                            </div>
                            {existingTapAgentItems.length > 1 && (
                              <span className="text-sm text-blue-600 font-medium whitespace-nowrap ml-1">
                                +{existingTapAgentItems.length - 1} items
                              </span>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 py-0 whitespace-nowrap ml-2 flex-shrink-0"
                            onClick={() => setIsAllItemsSheetOpen(true)}
                          >
                            View all
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleUnselectAll}>
                        Unselect All
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tapAgentItems.filter(item => item.selected).length} items selected
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 mb-2">
                    * Cost of goods is required for all selected items
                  </div>
                  <Separator className="my-2" />
                </div>
                
                {/* Scrollable content - Fix the height calculation */}
                <div className="flex-grow overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-22rem)] pr-2">
                    <div className="space-y-1 pb-16">
                      {tapAgentItems
                        // Filter out items that already exist in Tap Agent
                        .filter(item => !existingTapAgentItems.some(existing => existing.id === item.id))
                        .map(item => {
                          const itemName = 
                            item.type === 'ITEM' && item.item_data
                              ? item.item_data.name
                              : item.type === 'ITEM_VARIATION' && item.item_variation_data
                                ? item.item_variation_data.name
                                : 'Unknown Item';
                          
                          const itemPrice = 
                            item.type === 'ITEM_VARIATION' && item.item_variation_data?.price_money
                              ? formatPrice(item.item_variation_data.price_money.amount, item.item_variation_data.price_money.currency)
                              : 'N/A';
                          
                          // Check if this item is selected and missing cost
                          const isMissingCost = item.selected && (!item.costOfGoods || item.costOfGoods <= 0);
                          
                          return (
                            <div key={item.id} className="flex items-center border-b border-gray-100 py-2">
                              <Checkbox 
                                id={`item-${item.id}`} 
                                checked={item.selected} 
                                onCheckedChange={() => handleSelectItem(item.id)}
                                className="mr-2"
                              />
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="flex items-center justify-between">
                                  <Label 
                                    htmlFor={`item-${item.id}`}
                                    className="font-medium cursor-pointer truncate text-sm"
                                  >
                                    {itemName}
                                  </Label>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {itemPrice}
                                  </span>
                                </div>
                              </div>
                              <div className="w-24 flex-shrink-0">
                                <Input
                                  id={`cog-${item.id}`}
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  placeholder="Cost ($)"
                                  value={item.costOfGoods || ''}
                                  onChange={(e) => handleCostOfGoodsChange(item.id, e.target.value)}
                                  className={`h-7 text-xs w-full ${isMissingCost ? 'border-red-500' : ''}`}
                                  aria-label="Cost of Goods"
                                  required={item.selected}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Sticky footer with submit button */}
                <div className="flex-none pt-4 mt-2 border-t bg-background sticky bottom-0 z-10">
                  <Button 
                    className="w-full" 
                    onClick={handleSubmitToTapAgent}
                    disabled={tapAgentItems.filter(item => item.selected).length === 0}
                  >
                    Submit to Tap Agent
                  </Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Secondary sheet for displaying all Tap Agent items */}
        <Sheet open={isAllItemsSheetOpen} onOpenChange={setIsAllItemsSheetOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col">
            <SheetHeader className="pb-4">
              <SheetTitle>
                All <GradientText>Tap Agent</GradientText> Items
              </SheetTitle>
              <SheetDescription>
                {existingTapAgentItems.length} items in your Tap Agent catalog
              </SheetDescription>
            </SheetHeader>
            <Separator className="mb-4" />
            
            <ScrollArea className="flex-grow pr-2 h-[calc(100vh-8rem)]">
              <div className="space-y-1">
                {existingTapAgentItems.map(item => (
                  <div key={`all-items-${item.id}`} className="flex items-center justify-between border-b border-gray-200 py-3 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <span className="mr-2">Cost: ${item.costOfGoods.toFixed(2)}</span>
                        {item.retailPrice && (
                          <span>Price: ${item.retailPrice.toFixed(2)}</span>
                        )}
                        <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                          {item.type === 'ITEM' ? 'Item' : 'Variation'}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveFromTapAgent(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex-none pt-4 mt-2 border-t">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setIsAllItemsSheetOpen(false)}
              >
                Close
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Side panel for Lightspeed item details */}
        <Sheet open={isLightspeedItemSheetOpen} onOpenChange={setIsLightspeedItemSheetOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle>
                {selectedLightspeedItem?.description || 'Item Details'}
              </SheetTitle>
              <SheetDescription>
                Lightspeed inventory information
              </SheetDescription>
            </SheetHeader>
            <Separator />
            <ScrollArea className="h-[calc(100vh-8rem)] py-4">
              {selectedLightspeedItem && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Item Details</h3>
                    <p className="text-sm text-muted-foreground">View detailed information about this item.</p>
                  </div>
                  
                  <div className="grid gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Description</h4>
                      <p className="text-sm">{selectedLightspeedItem.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">System SKU</h4>
                      <p className="text-sm">{selectedLightspeedItem.systemSku}</p>
                    </div>
                    
                    {selectedLightspeedItem.customSku && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Custom SKU</h4>
                        <p className="text-sm">{selectedLightspeedItem.customSku}</p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Type</h4>
                      <p className="text-sm">{selectedLightspeedItem.itemType || 'default'}</p>
                    </div>
                    
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Default Cost</h4>
                        <p className="text-sm">${parseFloat(selectedLightspeedItem.defaultCost || '0').toFixed(2)}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Average Cost</h4>
                        <p className="text-sm">${parseFloat(selectedLightspeedItem.avgCost || '0').toFixed(2)}</p>
                      </div>
                    </div>
                    
                    {selectedLightspeedItem.Prices && selectedLightspeedItem.Prices.ItemPrice && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Prices</h4>
                        <div className="space-y-2">
                          {Array.isArray(selectedLightspeedItem.Prices.ItemPrice) ? (
                            // Handle array case
                            selectedLightspeedItem.Prices.ItemPrice.map((price, index) => (
                              <div key={index} className="bg-gray-50 p-2 rounded-md flex justify-between">
                                <span className="text-sm">{price.useType}</span>
                                <span className="text-sm font-medium">${parseFloat(price.amount || '0').toFixed(2)}</span>
                              </div>
                            ))
                          ) : (
                            // Handle single object case
                            <div className="bg-gray-50 p-2 rounded-md flex justify-between">
                              <span className="text-sm">{selectedLightspeedItem.Prices.ItemPrice.useType}</span>
                              <span className="text-sm font-medium">${parseFloat(selectedLightspeedItem.Prices.ItemPrice.amount || '0').toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedLightspeedItem.ItemShops && selectedLightspeedItem.ItemShops.ItemShop && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Inventory Levels</h4>
                        <div className="space-y-2">
                          {Array.isArray(selectedLightspeedItem.ItemShops.ItemShop) 
                            ? selectedLightspeedItem.ItemShops.ItemShop.map((shop, index) => (
                                <div key={index} className="bg-gray-50 p-2 rounded-md flex justify-between items-center">
                                  <span className="text-sm">
                                    Shop ID: {shop.shopID === "0" ? "All Shops (Total)" : shop.shopID}
                                  </span>
                                  <span className="text-sm font-medium">
                                    <Badge className={parseInt(shop.qoh) <= 0 ? "bg-red-100 text-red-800 hover:bg-red-100" : "bg-green-100 text-green-800 hover:bg-green-100"}>
                                      {shop.qoh} in stock
                                    </Badge>
                                  </span>
                                </div>
                              ))
                            : (
                                <div className="bg-gray-50 p-2 rounded-md flex justify-between items-center">
                                  <span className="text-sm">
                                    Shop ID: {selectedLightspeedItem.ItemShops.ItemShop.shopID === "0" ? "All Shops (Total)" : selectedLightspeedItem.ItemShops.ItemShop.shopID}
                                  </span>
                                  <span className="text-sm font-medium">
                                    <Badge className={parseInt(selectedLightspeedItem.ItemShops.ItemShop.qoh) <= 0 ? "bg-red-100 text-red-800 hover:bg-red-100" : "bg-green-100 text-green-800 hover:bg-green-100"}>
                                      {selectedLightspeedItem.ItemShops.ItemShop.qoh} in stock
                                    </Badge>
                                  </span>
                                </div>
                              )
                          }
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">UPC</h4>
                        <p className="text-sm">{selectedLightspeedItem.upc || 'N/A'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">EAN</h4>
                        <p className="text-sm">{selectedLightspeedItem.ean || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Item ID</h4>
                      <p className="text-sm font-mono text-xs bg-gray-50 p-1 rounded-md">{selectedLightspeedItem.itemID}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Created</h4>
                        <p className="text-sm">{new Date(selectedLightspeedItem.createTime).toLocaleString()}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Updated</h4>
                        <p className="text-sm">{new Date(selectedLightspeedItem.timeStamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button variant="outline" className="w-full rounded-md" onClick={() => setIsLightspeedItemSheetOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </PageTransition>
  )
} 