"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { X, PlusCircle, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

interface Product {
  name: string
  price: number
  cost: number
  category: string
}

interface ProductPricing {
  averageBasketSize: number
  products: Product[]
  heroProducts: string[]
  lowVelocityProducts: string[]
}

interface ProductPricingFormProps {
  data: ProductPricing
  onChange: (data: ProductPricing) => void
}

// Example product categories
const productCategories = [
  "Main", "Side", "Drink", "Dessert", "Appetizer", "Combo", "Special", "Other"
]

export function ProductPricingForm({ data, onChange }: ProductPricingFormProps) {
  const [newProduct, setNewProduct] = useState<Product>({
    name: "",
    price: 0,
    cost: 0,
    category: ""
  })
  
  const [newHeroProduct, setNewHeroProduct] = useState("")
  const [newLowVelocityProduct, setNewLowVelocityProduct] = useState("")
  
  const handleBasketSizeChange = (value: string) => {
    onChange({
      ...data,
      averageBasketSize: value === "" ? 0 : parseFloat(value)
    })
  }
  
  const handleProductChange = (field: keyof Product, value: string) => {
    setNewProduct({
      ...newProduct,
      [field]: field === 'name' || field === 'category' 
        ? value 
        : (value === "" ? 0 : parseFloat(value))
    })
  }
  
  const handleAddProduct = () => {
    if (!newProduct.name) return
    
    onChange({
      ...data,
      products: [...data.products, { ...newProduct }]
    })
    
    setNewProduct({
      name: "",
      price: 0,
      cost: 0,
      category: ""
    })
  }
  
  const handleRemoveProduct = (index: number) => {
    const newProducts = [...data.products]
    newProducts.splice(index, 1)
    
    onChange({
      ...data,
      products: newProducts
    })
  }
  
  const handleAddHeroProduct = () => {
    if (!newHeroProduct || data.heroProducts.includes(newHeroProduct)) return
    
    onChange({
      ...data,
      heroProducts: [...data.heroProducts, newHeroProduct]
    })
    
    setNewHeroProduct("")
  }
  
  const handleRemoveHeroProduct = (product: string) => {
    onChange({
      ...data,
      heroProducts: data.heroProducts.filter(p => p !== product)
    })
  }
  
  const handleAddLowVelocityProduct = () => {
    if (!newLowVelocityProduct || data.lowVelocityProducts.includes(newLowVelocityProduct)) return
    
    onChange({
      ...data,
      lowVelocityProducts: [...data.lowVelocityProducts, newLowVelocityProduct]
    })
    
    setNewLowVelocityProduct("")
  }
  
  const handleRemoveLowVelocityProduct = (product: string) => {
    onChange({
      ...data,
      lowVelocityProducts: data.lowVelocityProducts.filter(p => p !== product)
    })
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Product Pricing</CardTitle>
        <CardDescription>
          Configure your product catalog and pricing information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-0 mt-6">
        {/* Average Basket Size */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Average Basket Size</h3>
            <p className="text-sm text-muted-foreground">
              Set the average amount customers spend per transaction.
            </p>
          </div>
          
          <div className="flex items-center gap-2 max-w-xs">
            <span className="text-lg">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={data.averageBasketSize}
              onChange={(e) => handleBasketSizeChange(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        
        {/* Product Catalog */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Product Catalog</h3>
            <p className="text-sm text-muted-foreground">
              Add your products with their pricing information.
            </p>
          </div>
          
          {data.products.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price ($)</TableHead>
                    <TableHead>Cost ($)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((product, index) => (
                    <TableRow key={`product-${index}`}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>${product.price.toFixed(2)}</TableCell>
                      <TableCell>${product.cost.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProduct(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-md bg-muted/20">
              <p className="text-muted-foreground">No products added yet</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                value={newProduct.name}
                onChange={(e) => handleProductChange('name', e.target.value)}
                placeholder="e.g. Coffee"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-category">Category</Label>
              <Select 
                value={newProduct.category} 
                onValueChange={(value) => handleProductChange('category', value)}
              >
                <SelectTrigger id="product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {productCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-price">Price ($)</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.price || ""}
                onChange={(e) => handleProductChange('price', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-cost">Cost ($)</Label>
              <Input
                id="product-cost"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.cost || ""}
                onChange={(e) => handleProductChange('cost', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <Button
            onClick={handleAddProduct}
            disabled={!newProduct.name || !newProduct.category}
            className="mt-2"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
        
        {/* Special Product Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
          {/* Hero Products */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Hero Products</h3>
              <p className="text-sm text-muted-foreground">
                Products you want to promote or that are best sellers.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Add hero product..."
                value={newHeroProduct}
                onChange={(e) => setNewHeroProduct(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddHeroProduct()
                  }
                }}
              />
              <Button 
                onClick={handleAddHeroProduct}
                disabled={!newHeroProduct}
                size="sm"
              >
                Add
              </Button>
            </div>
            
            {data.heroProducts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {data.heroProducts.map(product => (
                  <Badge 
                    key={product} 
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {product}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => handleRemoveHeroProduct(product)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Low Velocity Products */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Low Velocity Products</h3>
              <p className="text-sm text-muted-foreground">
                Products that don't sell well and need promotion.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Add low velocity product..."
                value={newLowVelocityProduct}
                onChange={(e) => setNewLowVelocityProduct(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddLowVelocityProduct()
                  }
                }}
              />
              <Button 
                onClick={handleAddLowVelocityProduct}
                disabled={!newLowVelocityProduct}
                size="sm"
              >
                Add
              </Button>
            </div>
            
            {data.lowVelocityProducts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {data.lowVelocityProducts.map(product => (
                  <Badge 
                    key={product} 
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {product}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => handleRemoveLowVelocityProduct(product)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 