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
import { X, PlusCircle, Trash2, Coffee, Utensils, Pizza, CupSoda, IceCream, Croissant, ChevronDown, Beer, Wine, Beef, ShoppingBag, Edit, Package as PackageIcon, Award, Loader2 } from "lucide-react"
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
    <div className="space-y-8">
      {/* Average Basket Size */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <ShoppingBag className="h-4 w-4 text-blue-600 mr-2" />
          Average Basket Size
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="averageBasketSize">Average transaction value ($)</Label>
            <Input
              id="averageBasketSize"
              type="number"
              min="0"
              step="0.01"
              value={data.averageBasketSize}
              onChange={(e) => handleBasketSizeChange(e.target.value)}
              className="rounded-md"
            />
            <p className="text-xs text-muted-foreground">
              The average amount spent per transaction by your customers
            </p>
          </div>
        </div>
      </div>
      
      {/* Products Section */}
      <div className="border rounded-md p-5 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center">
            <PackageIcon className="h-4 w-4 text-blue-600 mr-2" />
            Products
          </h3>
          
          <div className="flex items-center gap-2">
            <Select value={industry} onValueChange={handleIndustryChange}>
              <SelectTrigger className="w-[180px] rounded-md">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 rounded-md">
                  <PlusCircle className="h-4 w-4" />
                  Quick Add
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">Add Template Products</h4>
                  <p className="text-xs text-muted-foreground">
                    Quickly add common products based on your industry
                  </p>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-0">
                  {getTemplatesByType(currentTemplateType).map((template, i) => (
                    <div
                      key={`${template.name}-${i}`}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => addTemplateToRegularProducts(template)}
                    >
                      <div className="flex items-center gap-2">
                        {template.icon}
                        <span className="text-sm">{template.name}</span>
                      </div>
                      <div className="text-sm font-medium">${template.price.toFixed(2)}</div>
                    </div>
                  ))}
                  {getTemplatesByType(currentTemplateType).length === 0 && (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      No templates available for this industry
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Add your products or services with their pricing details
        </p>
        
        {/* Add Product Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              value={newProduct.name}
              onChange={(e) => handleProductChange("name", e.target.value)}
              placeholder="e.g. Coffee"
              className="rounded-md"
            />
          </div>
          
          <div>
            <Label htmlFor="product-category">Category</Label>
            <Select
              value={newProduct.category}
              onValueChange={(value) => handleProductChange("category", value)}
            >
              <SelectTrigger id="product-category" className="rounded-md">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="product-price">Price ($)</Label>
            <Input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              value={newProduct.price || ""}
              onChange={(e) => handleProductChange("price", e.target.value)}
              className="rounded-md"
            />
          </div>
          
          <div>
            <Label htmlFor="product-cost">Cost ($)</Label>
            <div className="flex gap-2">
              <Input
                id="product-cost"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.cost || ""}
                onChange={(e) => handleProductChange("cost", e.target.value)}
                className="rounded-md"
              />
              <Button 
                onClick={handleAddProduct} 
                disabled={!newProduct.name || !newProduct.category || newProduct.price <= 0}
                className="rounded-md"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
        
        {/* Products Table */}
        {data.products.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-md">
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>${product.cost.toFixed(2)}</TableCell>
                    <TableCell>
                      {product.price > 0 
                        ? `${Math.round((1 - product.cost / product.price) * 100)}%` 
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProduct(index)}
                        className="h-8 w-8 rounded-md hover:bg-red-50 hover:text-red-600"
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
          <div className="text-center p-8 border border-dashed rounded-md bg-gray-50">
            <PackageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-muted-foreground">No products added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add products using the form above or quick add templates</p>
          </div>
        )}
      </div>
      
      {/* Hero Products Section */}
      <div className="border rounded-md p-5 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center">
            <Award className="h-4 w-4 text-blue-600 mr-2" />
            Hero Products
          </h3>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 rounded-md">
                <PlusCircle className="h-4 w-4" />
                Quick Add
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b">
                <h4 className="font-medium text-sm">Add Hero Products</h4>
                <p className="text-xs text-muted-foreground">
                  Quickly add your best-selling products
                </p>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-0">
                {getTemplatesByType(currentTemplateType).map((template, i) => (
                  <div
                    key={`hero-${template.name}-${i}`}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => addTemplateToHeroProducts(template)}
                  >
                    <div className="flex items-center gap-2">
                      {template.icon}
                      <span className="text-sm">{template.name}</span>
                    </div>
                    <div className="text-sm font-medium">${template.price.toFixed(2)}</div>
                  </div>
                ))}
                {getTemplatesByType(currentTemplateType).length === 0 && (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No templates available for this industry
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Your best-selling or signature products that you want to highlight
        </p>
        
        {/* Add Hero Product Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="hero-name">Name</Label>
            <Input
              id="hero-name"
              value={newHeroProduct.name}
              onChange={(e) => handleHeroProductChange("name", e.target.value)}
              placeholder="e.g. Signature Dish"
              className="rounded-md"
            />
          </div>
          
          <div>
            <Label htmlFor="hero-rrp">Price ($)</Label>
            <Input
              id="hero-rrp"
              type="number"
              min="0"
              step="0.01"
              value={newHeroProduct.rrp || ""}
              onChange={(e) => handleHeroProductChange("rrp", e.target.value)}
              className="rounded-md"
            />
          </div>
          
          <div>
            <Label htmlFor="hero-cost">Cost ($)</Label>
            <div className="flex gap-2">
              <Input
                id="hero-cost"
                type="number"
                min="0"
                step="0.01"
                value={newHeroProduct.cost || ""}
                onChange={(e) => handleHeroProductChange("cost", e.target.value)}
                className="rounded-md"
              />
              <Button 
                onClick={handleAddHeroProduct} 
                disabled={!newHeroProduct.name || newHeroProduct.rrp <= 0}
                className="rounded-md"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
        
        {/* Hero Products Table */}
        {data.heroProducts.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.heroProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {editingItem === `hero-${index}-name` ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            handleHeroProductInlineEdit(index, "name", editValue);
                            setEditingItem(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleHeroProductInlineEdit(index, "name", editValue);
                              setEditingItem(null);
                            }
                          }}
                          className="h-8 rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            setEditingItem(`hero-${index}-name`);
                            setEditValue(product.name);
                          }}
                        >
                          {product.name}
                          <Edit className="h-3 w-3 opacity-50" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem === `hero-${index}-rrp` ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            handleHeroProductInlineEdit(index, "rrp", editValue);
                            setEditingItem(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleHeroProductInlineEdit(index, "rrp", editValue);
                              setEditingItem(null);
                            }
                          }}
                          className="h-8 w-24 rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            setEditingItem(`hero-${index}-rrp`);
                            setEditValue(product.rrp.toString());
                          }}
                        >
                          ${product.rrp.toFixed(2)}
                          <Edit className="h-3 w-3 opacity-50 ml-1 inline" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem === `hero-${index}-cost` ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            handleHeroProductInlineEdit(index, "cost", editValue);
                            setEditingItem(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleHeroProductInlineEdit(index, "cost", editValue);
                              setEditingItem(null);
                            }
                          }}
                          className="h-8 w-24 rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            setEditingItem(`hero-${index}-cost`);
                            setEditValue(product.cost.toString());
                          }}
                        >
                          ${product.cost.toFixed(2)}
                          <Edit className="h-3 w-3 opacity-50 ml-1 inline" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.rrp > 0 
                        ? `${Math.round((1 - product.cost / product.rrp) * 100)}%` 
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveHeroProduct(index)}
                        className="h-8 w-8 rounded-md hover:bg-red-50 hover:text-red-600"
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
          <div className="text-center p-8 border border-dashed rounded-md bg-gray-50">
            <Award className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-muted-foreground">No hero products added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your signature or best-selling products</p>
          </div>
        )}
      </div>
      
      {/* Low Velocity Products Section */}
      <div className="border rounded-md p-5 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center">
            <Loader2 className="h-4 w-4 text-blue-600 mr-2" />
            Low Velocity Products
          </h3>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 rounded-md">
                <PlusCircle className="h-4 w-4" />
                Quick Add
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b">
                <h4 className="font-medium text-sm">Add Low Velocity Products</h4>
                <p className="text-xs text-muted-foreground">
                  Quickly add products that need promotion
                </p>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-0">
                {getTemplatesByType(currentTemplateType).map((template, i) => (
                  <div
                    key={`low-${template.name}-${i}`}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => addTemplateToLowVelocityProducts(template)}
                  >
                    <div className="flex items-center gap-2">
                      {template.icon}
                      <span className="text-sm">{template.name}</span>
                    </div>
                    <div className="text-sm font-medium">${template.price.toFixed(2)}</div>
                  </div>
                ))}
                {getTemplatesByType(currentTemplateType).length === 0 && (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No templates available for this industry
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Products that sell slowly and could benefit from targeted promotions
        </p>
        
        {/* Add Low Velocity Product Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="low-name">Name</Label>
            <Input
              id="low-name"
              value={newLowVelocityProduct.name}
              onChange={(e) => handleLowVelocityProductChange("name", e.target.value)}
              placeholder="e.g. Slow-moving item"
              className="rounded-md"
            />
          </div>
          
          <div>
            <Label htmlFor="low-rrp">Price ($)</Label>
            <Input
              id="low-rrp"
              type="number"
              min="0"
              step="0.01"
              value={newLowVelocityProduct.rrp || ""}
              onChange={(e) => handleLowVelocityProductChange("rrp", e.target.value)}
              className="rounded-md"
            />
          </div>
          
          <div>
            <Label htmlFor="low-cost">Cost ($)</Label>
            <div className="flex gap-2">
              <Input
                id="low-cost"
                type="number"
                min="0"
                step="0.01"
                value={newLowVelocityProduct.cost || ""}
                onChange={(e) => handleLowVelocityProductChange("cost", e.target.value)}
                className="rounded-md"
              />
              <Button 
                onClick={handleAddLowVelocityProduct} 
                disabled={!newLowVelocityProduct.name || newLowVelocityProduct.rrp <= 0}
                className="rounded-md"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
        
        {/* Low Velocity Products Table */}
        {data.lowVelocityProducts.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowVelocityProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {editingItem === `low-${index}-name` ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            handleLowVelocityProductInlineEdit(index, "name", editValue);
                            setEditingItem(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleLowVelocityProductInlineEdit(index, "name", editValue);
                              setEditingItem(null);
                            }
                          }}
                          className="h-8 rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            setEditingItem(`low-${index}-name`);
                            setEditValue(product.name);
                          }}
                        >
                          {product.name}
                          <Edit className="h-3 w-3 opacity-50" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem === `low-${index}-rrp` ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            handleLowVelocityProductInlineEdit(index, "rrp", editValue);
                            setEditingItem(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleLowVelocityProductInlineEdit(index, "rrp", editValue);
                              setEditingItem(null);
                            }
                          }}
                          className="h-8 w-24 rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            setEditingItem(`low-${index}-rrp`);
                            setEditValue(product.rrp.toString());
                          }}
                        >
                          ${product.rrp.toFixed(2)}
                          <Edit className="h-3 w-3 opacity-50 ml-1 inline" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem === `low-${index}-cost` ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            handleLowVelocityProductInlineEdit(index, "cost", editValue);
                            setEditingItem(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleLowVelocityProductInlineEdit(index, "cost", editValue);
                              setEditingItem(null);
                            }
                          }}
                          className="h-8 w-24 rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            setEditingItem(`low-${index}-cost`);
                            setEditValue(product.cost.toString());
                          }}
                        >
                          ${product.cost.toFixed(2)}
                          <Edit className="h-3 w-3 opacity-50 ml-1 inline" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.rrp > 0 
                        ? `${Math.round((1 - product.cost / product.rrp) * 100)}%` 
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLowVelocityProduct(index)}
                        className="h-8 w-8 rounded-md hover:bg-red-50 hover:text-red-600"
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
          <div className="text-center p-8 border border-dashed rounded-md bg-gray-50">
            <Loader2 className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-muted-foreground">No low velocity products added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add products that need targeted promotions</p>
          </div>
        )}
      </div>
    </div>
  )
} 