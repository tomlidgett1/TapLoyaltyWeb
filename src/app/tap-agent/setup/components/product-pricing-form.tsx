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
import { X, PlusCircle, Trash2, Coffee, Utensils, Pizza, CupSoda, IceCream, Croissant, ChevronDown, Beer, Wine, Beef, ShoppingBag, Edit, Package as PackageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Product {
  name: string
  price: number
  cost: number
  category: string
}

interface POSInventoryItem {
  id: string
  name: string
  retailPrice?: number
  costOfGoods: number
  type: string
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
  posInventory?: POSInventoryItem[]
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
  
  const { user } = useAuth()
  const [posInventoryItems, setPosInventoryItems] = useState<POSInventoryItem[]>([])
  const [loadingPosInventory, setLoadingPosInventory] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  
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

  // Fetch POS inventory items from Firestore
  useEffect(() => {
    async function fetchPOSInventory() {
      if (!user?.uid) return
      
      try {
        setLoadingPosInventory(true)
        
        console.log("Fetching POS inventory for user:", user.uid)
        
        // Check if the merchant has a document in the agents collection
        const agentDocRef = doc(db, 'agents', user.uid)
        const agentDoc = await getDoc(agentDocRef)
        
        // If the agent document exists, fetch the posInventory items
        if (agentDoc.exists()) {
          const agentData = agentDoc.data()
          console.log("Agent data retrieved:", agentData)
          
          if (agentData.posInventory && Array.isArray(agentData.posInventory)) {
            console.log("POS Inventory found:", agentData.posInventory)
            setPosInventoryItems(agentData.posInventory)
            
            // No need to call onChange here - this was causing an infinite loop
            // We'll just update our local state
          } else {
            console.log("No posInventory array found or it's empty")
            setPosInventoryItems([])
          }
        } else {
          console.log("No agent document exists for user")
          setPosInventoryItems([])
        }
      } catch (error) {
        console.error("Error fetching POS inventory:", error)
        setPosInventoryItems([])
      } finally {
        setLoadingPosInventory(false)
      }
    }
    
    fetchPOSInventory()
    // Remove data from the dependency array to prevent loops
  }, [user])
  
  // Handle retail price edit
  const handleSaveRetailPrice = async (itemId: string) => {
    if (!user?.uid || !editValue) {
      setEditingItem(null)
      return
    }
    
    const price = parseFloat(editValue)
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than zero.",
        variant: "destructive"
      })
      setEditingItem(null)
      return
    }
    
    try {
      console.log(`Updating retail price for item ${itemId} to ${price}`)
      
      // Update local state
      const updatedItems = posInventoryItems.map(item => 
        item.id === itemId 
          ? { ...item, retailPrice: price } 
          : item
      )
      
      console.log("Updated items:", updatedItems)
      setPosInventoryItems(updatedItems)
      
      // Update in Firestore
      const agentDocRef = doc(db, 'agents', user.uid)
      console.log("Saving to Firestore path:", `agents/${user.uid}`)
      
      await updateDoc(agentDocRef, {
        posInventory: updatedItems
      })
      
      console.log("Successfully updated in Firestore")
      
      // Also update the main data context
      onChange({
        ...data,
        posInventory: updatedItems
      })
      
      // Show success message
      toast({
        title: "Price updated",
        description: "Retail price has been saved successfully.",
      })
      
    } catch (error) {
      console.error("Error updating retail price:", error)
      toast({
        title: "Error saving price",
        description: "There was a problem updating the retail price. Please try again.",
        variant: "destructive"
      })
    } finally {
      setEditingItem(null)
    }
  }
  
  // Handle removing an item
  const handleRemovePosItem = async (itemId: string) => {
    if (!user?.uid) return
    
    try {
      console.log(`Removing item ${itemId} from inventory`)
      
      // Filter out the item to be removed
      const updatedItems = posInventoryItems.filter(item => item.id !== itemId)
      
      // Update local state
      setPosInventoryItems(updatedItems)
      
      // Update in Firestore
      const agentDocRef = doc(db, 'agents', user.uid)
      await updateDoc(agentDocRef, {
        posInventory: updatedItems
      })
      
      console.log("Successfully removed item from Firestore")
      
      // Also update the main data context
      onChange({
        ...data,
        posInventory: updatedItems
      })
      
      // Show success message
      toast({
        title: "Item removed",
        description: "Product has been removed from your catalog.",
      })
      
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Error removing item",
        description: "There was a problem removing the product. Please try again.",
        variant: "destructive"
      })
    }
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
        
        {/* Product Catalog from POS Inventory */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium flex items-center">
                <PackageIcon className="h-5 w-5 mr-2 text-primary" />
                Product Catalog
              </h3>
              <p className="text-sm text-muted-foreground">
                Your imported products from the inventory system
              </p>
            </div>
          </div>
          
          {loadingPosInventory ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posInventoryItems.length === 0 ? (
            <div className="text-center py-6 border rounded-md">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-40 mb-2" />
              <h3 className="font-medium text-base">No products added yet</h3>
              <p className="text-sm text-muted-foreground">
                Import products from your inventory page to manage them here
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <div className="mb-2 px-4 py-2 bg-muted/20 text-xs text-muted-foreground">
                {posInventoryItems.length} product{posInventoryItems.length !== 1 ? 's' : ''} in catalog
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Cost Price ($)</TableHead>
                    <TableHead>Retail Price ($)</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posInventoryItems.map((item) => (
                    <TableRow key={item.id || 'unknown'}>
                      <TableCell className="font-medium">
                        {item.name || 'Unnamed Product'}
                        {item.type && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {item.type === 'ITEM' ? 'Product' : 'Variation'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {typeof item.costOfGoods === 'number' ? 
                          item.costOfGoods.toFixed(2) : 
                          (item.costOfGoods ? String(item.costOfGoods) : 'Not set')}
                      </TableCell>
                      <TableCell>
                        {editingItem === item.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-20 h-7 text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveRetailPrice(item.id)
                                } else if (e.key === 'Escape') {
                                  setEditingItem(null)
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => handleSaveRetailPrice(item.id)}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center group cursor-pointer"
                            onClick={() => {
                              setEditingItem(item.id)
                              setEditValue(
                                typeof item.retailPrice === 'number' 
                                  ? item.retailPrice.toString() 
                                  : item.retailPrice || "0"
                              )
                            }}
                          >
                            <span>
                              {typeof item.retailPrice === 'number' 
                                ? item.retailPrice.toFixed(2)
                                : (item.retailPrice ? String(item.retailPrice) : "Not set")}
                            </span>
                            <Edit className="h-3.5 w-3.5 ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemovePosItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 border-t bg-blue-50/50 text-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-2 mt-0.5 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </div>
                  <div className="text-blue-800 text-xs">
                    <span className="font-medium">Recommendation:</span> Ensure all products have both cost and retail prices. 
                    This helps Tap Agent create more effective reward campaigns by accurately calculating margins 
                    and selecting the most profitable products to include in rewards.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {posInventoryItems.length === 0 && (
            <div className="flex items-start p-3 bg-blue-50/50 rounded-md mt-2 text-sm">
              <div className="flex-shrink-0 mr-2 mt-0.5 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div className="text-blue-800 text-xs">
                <span className="font-medium">Tip:</span> Import products from the inventory page and set both cost and retail prices.
                Complete product information helps Tap Agent make intelligent decisions when creating personalized rewards for your customers.
              </div>
            </div>
          )}
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