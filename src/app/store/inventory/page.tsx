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
  ChevronRight
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
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

  return (
    <PageTransition>
      <div className="p-6">
        <PageHeader
          title="Inventory"
          subtitle="Manage your product inventory from Square"
        >
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
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
              className="h-9"
              disabled={!isSquareConnected}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </PageHeader>

        {!isSquareConnected && !loading && (
          <div className="bg-muted p-6 rounded-lg text-center">
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
          <div className="bg-destructive/10 p-6 rounded-lg text-center">
            <h3 className="text-lg font-medium mb-2 text-destructive">Error Loading Inventory</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : isSquareConnected && (
          <>
            <div className="flex justify-between items-center">
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
      </div>
    </PageTransition>
  )
} 