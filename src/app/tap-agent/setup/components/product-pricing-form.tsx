"use client"

import { useState, useEffect } from "react"
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
import { X, PlusCircle, Trash2, Coffee, Utensils, Pizza, CupSoda, IceCream, Croissant, ChevronDown, Beer, Wine, Beef, ShoppingBag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Product {
  name: string
  price: number
  cost: number
  category: string
}

interface HeroProduct {
  name: string
  rrp: number
  cost: number
}

interface LowVelocityProduct {
  name: string
  rrp: number
  cost: number
}

interface ProductPricing {
  averageBasketSize: number
  products: Product[]
  heroProducts: HeroProduct[]
  lowVelocityProducts: LowVelocityProduct[]
}

interface ProductPricingFormProps {
  data: ProductPricing
  onChange: (data: ProductPricing) => void
}

// Industry options
const industries = [
  { value: "cafe", label: "Cafe" },
  { value: "restaurant", label: "Restaurant" },
  { value: "pub_bar", label: "Pub/Bar" },
  { value: "other", label: "Other" }
]

// Product categories by industry
const productCategoriesByIndustry = {
  cafe: ["Main", "Side", "Drink", "Dessert", "Appetizer", "Combo", "Special", "Other"],
  restaurant: ["Starter", "Main Course", "Side", "Dessert", "Drink", "Special", "Other"],
  pub_bar: ["Beer", "Wine", "Spirits", "Cocktails", "Bar Snacks", "Meals", "Sides", "Other"],
  other: ["Product", "Service", "Subscription", "Other"]
}

// Cafe item templates library
const cafeItemTemplates = [
  { name: "Espresso", category: "Drink", price: 3.50, cost: 0.70, icon: <Coffee className="h-4 w-4" /> },
  { name: "Cappuccino", category: "Drink", price: 4.50, cost: 1.20, icon: <Coffee className="h-4 w-4" /> },
  { name: "Latte", category: "Drink", price: 4.80, cost: 1.30, icon: <Coffee className="h-4 w-4" /> },
  { name: "Flat White", category: "Drink", price: 4.50, cost: 1.25, icon: <Coffee className="h-4 w-4" /> },
  { name: "Mocha", category: "Drink", price: 5.00, cost: 1.50, icon: <Coffee className="h-4 w-4" /> },
  { name: "Iced Coffee", category: "Drink", price: 5.50, cost: 1.60, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Hot Chocolate", category: "Drink", price: 4.50, cost: 1.20, icon: <Coffee className="h-4 w-4" /> },
  { name: "Tea", category: "Drink", price: 4.00, cost: 0.50, icon: <Coffee className="h-4 w-4" /> },
  { name: "Croissant", category: "Appetizer", price: 3.50, cost: 1.20, icon: <Croissant className="h-4 w-4" /> },
  { name: "Muffin", category: "Appetizer", price: 4.00, cost: 1.50, icon: <Utensils className="h-4 w-4" /> },
  { name: "Sandwich", category: "Main", price: 8.50, cost: 3.50, icon: <Utensils className="h-4 w-4" /> },
  { name: "Avocado Toast", category: "Main", price: 12.00, cost: 4.50, icon: <Utensils className="h-4 w-4" /> },
  { name: "Salad Bowl", category: "Main", price: 10.00, cost: 4.00, icon: <Utensils className="h-4 w-4" /> },
  { name: "Cookie", category: "Dessert", price: 2.50, cost: 0.80, icon: <IceCream className="h-4 w-4" /> },
  { name: "Cake Slice", category: "Dessert", price: 5.50, cost: 2.00, icon: <IceCream className="h-4 w-4" /> },
  { name: "Brownie", category: "Dessert", price: 3.50, cost: 1.20, icon: <IceCream className="h-4 w-4" /> },
  // New 15 items start here
  { name: "Chai Latte", category: "Drink", price: 4.80, cost: 1.20, icon: <Coffee className="h-4 w-4" /> },
  { name: "Matcha Latte", category: "Drink", price: 5.50, cost: 1.80, icon: <Coffee className="h-4 w-4" /> },
  { name: "Cold Brew", category: "Drink", price: 5.00, cost: 1.10, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Fruit Smoothie", category: "Drink", price: 6.50, cost: 2.20, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Fresh Orange Juice", category: "Drink", price: 4.50, cost: 1.50, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Sparkling Water", category: "Drink", price: 3.00, cost: 0.50, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Pain au Chocolat", category: "Appetizer", price: 3.80, cost: 1.40, icon: <Croissant className="h-4 w-4" /> },
  { name: "Bagel & Cream Cheese", category: "Appetizer", price: 5.00, cost: 1.80, icon: <Utensils className="h-4 w-4" /> },
  { name: "Blueberry Scone", category: "Appetizer", price: 3.50, cost: 1.20, icon: <Utensils className="h-4 w-4" /> },
  { name: "Chicken Wrap", category: "Main", price: 9.50, cost: 3.80, icon: <Utensils className="h-4 w-4" /> },
  { name: "Quiche Slice", category: "Main", price: 7.50, cost: 2.80, icon: <Pizza className="h-4 w-4" /> },
  { name: "Veggie Panini", category: "Main", price: 8.00, cost: 3.00, icon: <Utensils className="h-4 w-4" /> },
  { name: "Tiramisu", category: "Dessert", price: 6.00, cost: 2.20, icon: <IceCream className="h-4 w-4" /> },
  { name: "Cheesecake", category: "Dessert", price: 5.80, cost: 2.10, icon: <IceCream className="h-4 w-4" /> },
  { name: "Cinnamon Roll", category: "Dessert", price: 4.50, cost: 1.50, icon: <Croissant className="h-4 w-4" /> },
];

// Australian pub/bar templates
const pubBarItemTemplates = [
  // Beers
  { name: "Schooner of VB", category: "Beer", price: 7.50, cost: 2.50, icon: <Beer className="h-4 w-4" /> },
  { name: "Pint of Carlton Draught", category: "Beer", price: 8.50, cost: 3.00, icon: <Beer className="h-4 w-4" /> },
  { name: "Schooner of Tooheys New", category: "Beer", price: 7.30, cost: 2.40, icon: <Beer className="h-4 w-4" /> },
  { name: "Pint of Great Northern", category: "Beer", price: 8.80, cost: 3.10, icon: <Beer className="h-4 w-4" /> },
  { name: "Bottle of Corona", category: "Beer", price: 9.00, cost: 3.80, icon: <Beer className="h-4 w-4" /> },
  { name: "Bottle of Coopers Pale Ale", category: "Beer", price: 9.50, cost: 4.00, icon: <Beer className="h-4 w-4" /> },
  { name: "Schooner of Stone & Wood", category: "Beer", price: 9.80, cost: 4.20, icon: <Beer className="h-4 w-4" /> },
  { name: "Pint of XXXX Gold", category: "Beer", price: 7.80, cost: 2.60, icon: <Beer className="h-4 w-4" /> },
  
  // Wines
  { name: "Glass of House Red", category: "Wine", price: 8.00, cost: 3.00, icon: <Wine className="h-4 w-4" /> },
  { name: "Glass of House White", category: "Wine", price: 8.00, cost: 3.00, icon: <Wine className="h-4 w-4" /> },
  { name: "Glass of Shiraz", category: "Wine", price: 11.00, cost: 4.50, icon: <Wine className="h-4 w-4" /> },
  { name: "Glass of Sauv Blanc", category: "Wine", price: 10.50, cost: 4.20, icon: <Wine className="h-4 w-4" /> },
  { name: "Bottle of Barossa Shiraz", category: "Wine", price: 45.00, cost: 18.00, icon: <Wine className="h-4 w-4" /> },
  
  // Spirits
  { name: "Vodka & Soda", category: "Spirits", price: 10.00, cost: 2.50, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Gin & Tonic", category: "Spirits", price: 11.00, cost: 3.00, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Bundy & Coke", category: "Spirits", price: 10.50, cost: 2.80, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Jack & Coke", category: "Spirits", price: 12.00, cost: 3.50, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Glass of Fireball", category: "Spirits", price: 9.50, cost: 3.20, icon: <CupSoda className="h-4 w-4" /> },
  
  // Bar Food
  { name: "Bowl of Chips", category: "Bar Snacks", price: 9.00, cost: 2.00, icon: <Utensils className="h-4 w-4" /> },
  { name: "Garlic Bread", category: "Bar Snacks", price: 8.00, cost: 2.50, icon: <Utensils className="h-4 w-4" /> },
  { name: "Salt & Pepper Calamari", category: "Bar Snacks", price: 14.00, cost: 5.50, icon: <Utensils className="h-4 w-4" /> },
  { name: "Chicken Parma", category: "Meals", price: 22.00, cost: 8.50, icon: <Beef className="h-4 w-4" /> },
  { name: "Steak Sandwich", category: "Meals", price: 18.00, cost: 7.50, icon: <Beef className="h-4 w-4" /> },
  { name: "Beef Burger", category: "Meals", price: 20.00, cost: 8.00, icon: <Beef className="h-4 w-4" /> },
  { name: "Classic Meat Pie", category: "Bar Snacks", price: 8.50, cost: 3.50, icon: <ShoppingBag className="h-4 w-4" /> },
  { name: "Sausage Roll", category: "Bar Snacks", price: 6.50, cost: 2.50, icon: <ShoppingBag className="h-4 w-4" /> },
  
  // Adding more Australian bar classics
  { name: "Chicken Schnitzel", category: "Meals", price: 19.50, cost: 7.50, icon: <Beef className="h-4 w-4" /> },
  { name: "Fish & Chips", category: "Meals", price: 21.00, cost: 8.00, icon: <Beef className="h-4 w-4" /> },
  { name: "Loaded Wedges", category: "Bar Snacks", price: 12.50, cost: 4.00, icon: <Utensils className="h-4 w-4" /> },
  { name: "Nachos", category: "Bar Snacks", price: 14.50, cost: 5.00, icon: <Utensils className="h-4 w-4" /> },
  { name: "Pint of Cider", category: "Beer", price: 9.00, cost: 3.50, icon: <Beer className="h-4 w-4" /> },
  { name: "Espresso Martini", category: "Cocktails", price: 16.00, cost: 5.50, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Aperol Spritz", category: "Cocktails", price: 15.00, cost: 5.00, icon: <CupSoda className="h-4 w-4" /> },
  { name: "Jug of Beer", category: "Beer", price: 23.00, cost: 8.00, icon: <Beer className="h-4 w-4" /> },
  { name: "Sunday Roast", category: "Meals", price: 25.00, cost: 10.00, icon: <Beef className="h-4 w-4" /> },
];

export function ProductPricingForm({ data, onChange }: ProductPricingFormProps) {
  const [industry, setIndustry] = useState<string>("pub_bar")
  const [currentTemplateType, setCurrentTemplateType] = useState<string>("pub_bar") // Template type for quick add popovers
  const [newProduct, setNewProduct] = useState<Product>({
    name: "",
    price: 0,
    cost: 0,
    category: ""
  })
  
  const [newHeroProduct, setNewHeroProduct] = useState<HeroProduct>({
    name: "",
    rrp: 0,
    cost: 0
  })
  
  const [newLowVelocityProduct, setNewLowVelocityProduct] = useState<LowVelocityProduct>({
    name: "",
    rrp: 0,
    cost: 0
  })
  
  // Get current product categories based on selected industry
  const productCategories = productCategoriesByIndustry[industry as keyof typeof productCategoriesByIndustry] || productCategoriesByIndustry.other;
  
  // Get template items based on industry
  const getTemplateItemsByIndustry = () => {
    switch(industry) {
      case "cafe":
        return cafeItemTemplates;
      case "pub_bar":
        return pubBarItemTemplates;
      default:
        return []; // No templates for other industries yet
    }
  };
  
  // Get templates by specific type for Quick Add popovers
  const getTemplatesByType = (type: string) => {
    switch(type) {
      case "cafe":
        return cafeItemTemplates;
      case "pub_bar":
        return pubBarItemTemplates;
      default:
        return []; // Fallback to empty array
    }
  };
  
  // Handle industry change
  const handleIndustryChange = (value: string) => {
    setIndustry(value);
    setCurrentTemplateType(value); // Also update the template type to match industry
    
    // Reset category if not available in new industry
    if (!productCategoriesByIndustry[value as keyof typeof productCategoriesByIndustry].includes(newProduct.category)) {
      setNewProduct({
        ...newProduct,
        category: ""
      });
    }
    
    // Update product input placeholder based on industry
    if (value === "cafe") {
      document.getElementById("product-name")?.setAttribute("placeholder", "e.g. Coffee");
    } else if (value === "pub_bar") {
      document.getElementById("product-name")?.setAttribute("placeholder", "e.g. Beer");
    } else if (value === "restaurant") {
      document.getElementById("product-name")?.setAttribute("placeholder", "e.g. Main Course");
    } else {
      document.getElementById("product-name")?.setAttribute("placeholder", "e.g. Product Name");
    }
  };
  
  // Handle compatibility with old data format
  useEffect(() => {
    // Check if heroProducts are strings instead of objects and convert if needed
    if (data.heroProducts && data.heroProducts.length > 0 && typeof data.heroProducts[0] === 'string') {
      const convertedHeroProducts = (data.heroProducts as unknown as string[]).map(name => ({
        name,
        rrp: 0,
        cost: 0
      }));
      
      onChange({
        ...data,
        heroProducts: convertedHeroProducts
      });
    }
    
    // Check if lowVelocityProducts are strings instead of objects and convert if needed
    if (data.lowVelocityProducts && data.lowVelocityProducts.length > 0 && typeof data.lowVelocityProducts[0] === 'string') {
      const convertedLowVelocityProducts = (data.lowVelocityProducts as unknown as string[]).map(name => ({
        name,
        rrp: 0,
        cost: 0
      }));
      
      onChange({
        ...data,
        lowVelocityProducts: convertedLowVelocityProducts
      });
    }
  }, [data, onChange]);
  
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
      ...newProduct,
      name: "",
      price: 0,
      cost: 0
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
  
  const handleHeroProductChange = (field: keyof HeroProduct, value: string) => {
    setNewHeroProduct({
      ...newHeroProduct,
      [field]: field === 'name' 
        ? value 
        : (value === "" ? 0 : parseFloat(value))
    })
  }
  
  const handleAddHeroProduct = () => {
    if (!newHeroProduct.name) return
    
    // Ensure heroProducts is an array of objects
    let currentHeroProducts = [...data.heroProducts];
    
    // Check if a hero product with the same name already exists
    const nameExists = currentHeroProducts.some(p => {
      if (typeof p === 'string') {
        return p === newHeroProduct.name;
      }
      return p.name === newHeroProduct.name;
    });
    
    if (nameExists) return;
    
    onChange({
      ...data,
      heroProducts: [...currentHeroProducts, { ...newHeroProduct }]
    })
    
    setNewHeroProduct({
      name: "",
      rrp: 0,
      cost: 0
    })
  }
  
  const handleRemoveHeroProduct = (index: number) => {
    const newHeroProducts = [...data.heroProducts]
    newHeroProducts.splice(index, 1)
    
    onChange({
      ...data,
      heroProducts: newHeroProducts
    })
  }
  
  const handleLowVelocityProductChange = (field: keyof LowVelocityProduct, value: string) => {
    setNewLowVelocityProduct({
      ...newLowVelocityProduct,
      [field]: field === 'name' 
        ? value 
        : (value === "" ? 0 : parseFloat(value))
    })
  }
  
  const handleAddLowVelocityProduct = () => {
    if (!newLowVelocityProduct.name) return
    
    // Ensure lowVelocityProducts is an array of objects
    let currentLowVelocityProducts = [...data.lowVelocityProducts];
    
    // Check if a low velocity product with the same name already exists
    const nameExists = currentLowVelocityProducts.some(p => {
      if (typeof p === 'string') {
        return p === newLowVelocityProduct.name;
      }
      return p.name === newLowVelocityProduct.name;
    });
    
    if (nameExists) return;
    
    onChange({
      ...data,
      lowVelocityProducts: [...currentLowVelocityProducts, { ...newLowVelocityProduct }]
    })
    
    setNewLowVelocityProduct({
      name: "",
      rrp: 0,
      cost: 0
    })
  }
  
  const handleRemoveLowVelocityProduct = (index: number) => {
    const newLowVelocityProducts = [...data.lowVelocityProducts]
    newLowVelocityProducts.splice(index, 1)
    
    onChange({
      ...data,
      lowVelocityProducts: newLowVelocityProducts
    })
  }

  // Add handlers for inline editing
  const handleHeroProductInlineEdit = (index: number, field: keyof HeroProduct, value: string) => {
    const updatedProducts = [...data.heroProducts];
    const product = { ...updatedProducts[index] };
    
    // Handle string type for backward compatibility
    if (typeof product === 'string') {
      return; // Skip editing string-type products
    }
    
    if (field === 'name') {
      product.name = value;
    } else {
      const numValue = value === '' ? 0 : parseFloat(value);
      if (field === 'rrp') {
        product.rrp = numValue;
      } else if (field === 'cost') {
        product.cost = numValue;
      }
    }
    
    updatedProducts[index] = product;
    onChange({
      ...data,
      heroProducts: updatedProducts
    });
  };
  
  const handleLowVelocityProductInlineEdit = (index: number, field: keyof LowVelocityProduct, value: string) => {
    const updatedProducts = [...data.lowVelocityProducts];
    const product = { ...updatedProducts[index] };
    
    // Handle string type for backward compatibility
    if (typeof product === 'string') {
      return; // Skip editing string-type products
    }
    
    if (field === 'name') {
      product.name = value;
    } else {
      const numValue = value === '' ? 0 : parseFloat(value);
      if (field === 'rrp') {
        product.rrp = numValue;
      } else if (field === 'cost') {
        product.cost = numValue;
      }
    }
    
    updatedProducts[index] = product;
    onChange({
      ...data,
      lowVelocityProducts: updatedProducts
    });
  };

  // Add handlers for template items
  const addTemplateToRegularProducts = (template: typeof cafeItemTemplates[0]) => {
    // Check if product already exists
    if (data.products.some(p => p.name === template.name)) {
      return;
    }
    
    onChange({
      ...data,
      products: [...data.products, {
        name: template.name,
        category: template.category,
        price: template.price,
        cost: template.cost
      }]
    });
  };
  
  const addTemplateToHeroProducts = (template: typeof cafeItemTemplates[0]) => {
    // Check if product already exists
    const nameExists = data.heroProducts.some(p => {
      if (typeof p === 'string') {
        return p === template.name;
      }
      return p.name === template.name;
    });
    
    if (nameExists) return;
    
    onChange({
      ...data,
      heroProducts: [...data.heroProducts, {
        name: template.name,
        rrp: template.price,
        cost: template.cost
      }]
    });
  };
  
  const addTemplateToLowVelocityProducts = (template: typeof cafeItemTemplates[0]) => {
    // Check if product already exists
    const nameExists = data.lowVelocityProducts.some(p => {
      if (typeof p === 'string') {
        return p === template.name;
      }
      return p.name === template.name;
    });
    
    if (nameExists) return;
    
    onChange({
      ...data,
      lowVelocityProducts: [...data.lowVelocityProducts, {
        name: template.name,
        rrp: template.price,
        cost: template.cost
      }]
    });
  };

  // Update category when industry changes
  useEffect(() => {
    // Reset category if not available in new industry
    if (newProduct.category && !productCategories.includes(newProduct.category)) {
      setNewProduct(prev => ({
        ...prev,
        category: ""
      }));
    }
  }, [industry, productCategories, newProduct.category]);

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Product Pricing</CardTitle>
        <CardDescription>
          Configure your product catalog and pricing information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-0 mt-6">
        {/* Industry Selector */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Business Type</h3>
            <p className="text-sm text-muted-foreground">
              Select your industry to see relevant product templates.
            </p>
          </div>
          
          <div className="max-w-xs">
            <Select value={industry} onValueChange={handleIndustryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      
        {/* Average Basket Size */}
        <div className="space-y-4 border-t pt-6">
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
        
        {/* Special Product Categories */}
        <div className="space-y-6 border-t pt-6">
          {/* Hero Products */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
          <div>
              <h3 className="text-lg font-medium">Hero Products</h3>
            <p className="text-sm text-muted-foreground">
                Products you want to promote or that are best sellers.
            </p>
          </div>
          
              {/* Library Quick Add */}
              {getTemplateItemsByIndustry().length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      {industry === "cafe" ? (
                        <Coffee className="h-4 w-4 mr-1" />
                      ) : industry === "pub_bar" ? (
                        <Beer className="h-4 w-4 mr-1" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 mr-1" />
                      )}
                      Quick Add
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[380px] p-0" align="end">
                    <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-slate-50">
                      <h4 className="text-base font-medium text-slate-800 flex items-center">
                        {industry === "cafe" ? (
                          <Coffee className="h-4 w-4 mr-2 text-blue-600" />
                        ) : industry === "pub_bar" ? (
                          <Beer className="h-4 w-4 mr-2 text-amber-600" />
                        ) : (
                          <ShoppingBag className="h-4 w-4 mr-2 text-slate-600" />
                        )}
                        {industry === "cafe" ? "Cafe" : industry === "pub_bar" ? "Pub/Bar" : "Item"} Templates
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Click to add as Hero Products</p>
                    </div>
                    <div className="p-2 border-b bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-slate-500 mr-1">Show templates for:</p>
                        <Button 
                          size="sm" 
                          variant={currentTemplateType === "cafe" ? "default" : "outline"} 
                          className={`h-8 px-3 text-xs ${currentTemplateType === "cafe" ? "bg-blue-600 hover:bg-blue-700" : "hover:border-blue-300 hover:text-blue-600"}`}
                          onClick={() => setCurrentTemplateType("cafe")}
                        >
                          <Coffee className="h-3.5 w-3.5 mr-1.5" /> Cafe
                        </Button>
              <Button 
                size="sm"
                          variant={currentTemplateType === "pub_bar" ? "default" : "outline"} 
                          className={`h-8 px-3 text-xs ${currentTemplateType === "pub_bar" ? "bg-amber-600 hover:bg-amber-700" : "hover:border-amber-300 hover:text-amber-600"}`}
                          onClick={() => setCurrentTemplateType("pub_bar")}
              >
                          <Beer className="h-3.5 w-3.5 mr-1.5" /> Pub/Bar
              </Button>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto py-1">
                      {getTemplatesByType(currentTemplateType).map((template, i) => (
                        <button
                          key={i}
                          className="w-full px-3 py-2.5 flex items-center text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                          onClick={() => addTemplateToHeroProducts(template)}
                        >
                          <div className="flex items-center w-full">
                            <div className="bg-blue-50 p-2 rounded-md border border-blue-100 mr-3 flex-shrink-0">
                              {template.icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-800">{template.name}</div>
                              <div className="text-xs text-slate-500">{template.category}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-800">${template.price.toFixed(2)}</div>
                              <div className="text-xs text-slate-500">Cost: ${template.cost.toFixed(2)}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            
            {data.heroProducts && data.heroProducts.length > 0 ? (
              <div className="border rounded-md overflow-hidden max-h-[180px]">
                <div className="overflow-y-auto max-h-[180px]">
              <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                        <TableHead>RRP ($)</TableHead>
                    <TableHead>Cost ($)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {data.heroProducts.map((product, index) => {
                        // Safely handle both string and object formats
                        const productName = typeof product === 'string' ? product : product.name;
                        const productRrp = typeof product === 'string' ? 0 : (product.rrp || 0);
                        const productCost = typeof product === 'string' ? 0 : (product.cost || 0);
                        
                        return (
                          <TableRow key={`hero-product-${index}`}>
                            <TableCell>{productName}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                $
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={productRrp}
                                  onChange={(e) => handleHeroProductInlineEdit(index, 'rrp', e.target.value)}
                                  className="h-7 w-20 ml-1"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                $
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={productCost}
                                  onChange={(e) => handleHeroProductInlineEdit(index, 'cost', e.target.value)}
                                  className="h-7 w-20 ml-1"
                                />
                              </div>
                            </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                                onClick={() => handleRemoveHeroProduct(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
                </div>
                <div className="text-xs text-muted-foreground text-right py-1 px-2 border-t">
                  {data.heroProducts.length} item{data.heroProducts.length !== 1 ? 's' : ''}
                </div>
            </div>
          ) : (
              <div className="text-center py-4 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">No hero products added yet</p>
            </div>
          )}
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mt-4">
            <div className="space-y-2">
                <Label htmlFor="hero-product-name">Product Name</Label>
              <Input
                  id="hero-product-name"
                  value={newHeroProduct.name}
                  onChange={(e) => handleHeroProductChange('name', e.target.value)}
                  placeholder="e.g. Special Coffee"
              />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="hero-product-rrp">RRP ($)</Label>
              <Input
                  id="hero-product-rrp"
                type="number"
                min="0"
                step="0.01"
                  value={newHeroProduct.rrp || ""}
                  onChange={(e) => handleHeroProductChange('rrp', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="hero-product-cost">Cost ($)</Label>
              <Input
                  id="hero-product-cost"
                type="number"
                min="0"
                step="0.01"
                  value={newHeroProduct.cost || ""}
                  onChange={(e) => handleHeroProductChange('cost', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <Button
              onClick={handleAddHeroProduct}
              disabled={!newHeroProduct.name}
              size="sm"
            className="mt-2"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
              Add Hero Product
                    </Button>
          </div>
          
          {/* Low Velocity Products */}
          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Low Velocity Products</h3>
              <p className="text-sm text-muted-foreground">
                Products that don't sell well and need promotion.
              </p>
            </div>
            
              {/* Library Quick Add */}
              {getTemplateItemsByIndustry().length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      {industry === "cafe" ? (
                        <Coffee className="h-4 w-4 mr-1" />
                      ) : industry === "pub_bar" ? (
                        <Beer className="h-4 w-4 mr-1" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 mr-1" />
                      )}
                      Quick Add
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[380px] p-0" align="end">
                    <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-slate-50">
                      <h4 className="text-base font-medium text-slate-800 flex items-center">
                        {industry === "cafe" ? (
                          <Coffee className="h-4 w-4 mr-2 text-blue-600" />
                        ) : industry === "pub_bar" ? (
                          <Beer className="h-4 w-4 mr-2 text-amber-600" />
                        ) : (
                          <ShoppingBag className="h-4 w-4 mr-2 text-slate-600" />
                        )}
                        {industry === "cafe" ? "Cafe" : industry === "pub_bar" ? "Pub/Bar" : "Item"} Templates
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Click to add as Low Velocity Products</p>
                    </div>
                    <div className="p-2 border-b bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-slate-500 mr-1">Show templates for:</p>
                        <Button 
                          size="sm" 
                          variant={currentTemplateType === "cafe" ? "default" : "outline"} 
                          className={`h-8 px-3 text-xs ${currentTemplateType === "cafe" ? "bg-blue-600 hover:bg-blue-700" : "hover:border-blue-300 hover:text-blue-600"}`}
                          onClick={() => setCurrentTemplateType("cafe")}
                        >
                          <Coffee className="h-3.5 w-3.5 mr-1.5" /> Cafe
                        </Button>
              <Button 
                size="sm"
                          variant={currentTemplateType === "pub_bar" ? "default" : "outline"} 
                          className={`h-8 px-3 text-xs ${currentTemplateType === "pub_bar" ? "bg-amber-600 hover:bg-amber-700" : "hover:border-amber-300 hover:text-amber-600"}`}
                          onClick={() => setCurrentTemplateType("pub_bar")}
              >
                          <Beer className="h-3.5 w-3.5 mr-1.5" /> Pub/Bar
              </Button>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto py-1">
                      {getTemplatesByType(currentTemplateType).map((template, i) => (
                        <button
                          key={i}
                          className="w-full px-3 py-2.5 flex items-center text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                          onClick={() => addTemplateToLowVelocityProducts(template)}
                        >
                          <div className="flex items-center w-full">
                            <div className="bg-blue-50 p-2 rounded-md border border-blue-100 mr-3 flex-shrink-0">
                              {template.icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-800">{template.name}</div>
                              <div className="text-xs text-slate-500">{template.category}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-800">${template.price.toFixed(2)}</div>
                              <div className="text-xs text-slate-500">Cost: ${template.cost.toFixed(2)}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            
            {data.lowVelocityProducts && data.lowVelocityProducts.length > 0 ? (
              <div className="border rounded-md overflow-hidden max-h-[180px]">
                <div className="overflow-y-auto max-h-[180px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>RRP ($)</TableHead>
                        <TableHead>Cost ($)</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.lowVelocityProducts.map((product, index) => {
                        // Safely handle both string and object formats
                        const productName = typeof product === 'string' ? product : product.name;
                        const productRrp = typeof product === 'string' ? 0 : (product.rrp || 0);
                        const productCost = typeof product === 'string' ? 0 : (product.cost || 0);
                        
                        return (
                          <TableRow key={`low-velocity-product-${index}`}>
                            <TableCell>{productName}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                $
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={productRrp}
                                  onChange={(e) => handleLowVelocityProductInlineEdit(index, 'rrp', e.target.value)}
                                  className="h-7 w-20 ml-1"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                $
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={productCost}
                                  onChange={(e) => handleLowVelocityProductInlineEdit(index, 'cost', e.target.value)}
                                  className="h-7 w-20 ml-1"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                                onClick={() => handleRemoveLowVelocityProduct(index)}
                    >
                                <Trash2 className="h-4 w-4" />
                    </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-xs text-muted-foreground text-right py-1 px-2 border-t">
                  {data.lowVelocityProducts.length} item{data.lowVelocityProducts.length !== 1 ? 's' : ''}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">No low velocity products added yet</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mt-4">
              <div className="space-y-2">
                <Label htmlFor="low-velocity-product-name">Product Name</Label>
                <Input
                  id="low-velocity-product-name"
                  value={newLowVelocityProduct.name}
                  onChange={(e) => handleLowVelocityProductChange('name', e.target.value)}
                  placeholder="e.g. Unpopular Dish"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="low-velocity-product-rrp">RRP ($)</Label>
                <Input
                  id="low-velocity-product-rrp"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newLowVelocityProduct.rrp || ""}
                  onChange={(e) => handleLowVelocityProductChange('rrp', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="low-velocity-product-cost">Cost ($)</Label>
                <Input
                  id="low-velocity-product-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newLowVelocityProduct.cost || ""}
                  onChange={(e) => handleLowVelocityProductChange('cost', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleAddLowVelocityProduct}
              disabled={!newLowVelocityProduct.name}
              size="sm"
              className="mt-2"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Low Velocity Product
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 