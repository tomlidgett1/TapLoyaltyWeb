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
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"

interface MessagingConstraints {
  restrictedKeywords: string[]
}

interface MessagingConstraintsFormProps {
  data: MessagingConstraints
  onChange: (data: MessagingConstraints) => void
}

// Common restricted keywords suggestions
const restrictedKeywordSuggestions = [
  "Free", 
  "Guaranteed", 
  "Unlimited", 
  "Best", 
  "Cheapest", 
  "Discount", 
  "Sale", 
  "Limited time", 
  "Exclusive", 
  "Secret",
  "Promise",
  "Always",
  "Never",
  "Instantly",
  "Forever"
]

export function MessagingConstraintsForm({ data, onChange }: MessagingConstraintsFormProps) {
  const [newKeyword, setNewKeyword] = useState("")
  
  const handleAddKeyword = () => {
    if (newKeyword && !data.restrictedKeywords.some(k => k.toLowerCase() === newKeyword.toLowerCase())) {
      // Capitalize the first letter of the keyword
      const formattedKeyword = newKeyword.charAt(0).toUpperCase() + newKeyword.slice(1).toLowerCase();
      onChange({
        ...data,
        restrictedKeywords: [...data.restrictedKeywords, formattedKeyword]
      })
      setNewKeyword("")
    }
  }
  
  const handleRemoveKeyword = (keyword: string) => {
    onChange({
      ...data,
      restrictedKeywords: data.restrictedKeywords.filter(k => k !== keyword)
    })
  }
  
  const handleAddSuggestion = (keyword: string) => {
    if (!data.restrictedKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
      onChange({
        ...data,
        restrictedKeywords: [...data.restrictedKeywords, keyword]
      })
    }
  }
  
  const handleToggleKeyword = (keyword: string) => {
    if (data.restrictedKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
      // Find the keyword with the same lowercase value and remove it
      const keywordToRemove = data.restrictedKeywords.find(k => k.toLowerCase() === keyword.toLowerCase());
      if (keywordToRemove) {
        handleRemoveKeyword(keywordToRemove);
      }
    } else {
      handleAddSuggestion(keyword)
    }
  }
  
  // Get suggestions that aren't already selected
  const availableSuggestions = restrictedKeywordSuggestions.filter(
    keyword => !data.restrictedKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())
  )

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Messaging Constraints</CardTitle>
        <CardDescription>
          Define keywords and terms to avoid in customer communications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-0 mt-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Restricted Keywords</h3>
            <p className="text-sm text-muted-foreground">
              Define words or phrases that should not be used in customer communications.
            </p>
          </div>
          
          <div className="space-y-4">
            <Label>Select Restricted Keywords</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {restrictedKeywordSuggestions.map(keyword => (
                <button
                  key={keyword}
                  onClick={() => handleToggleKeyword(keyword)}
                  className={`
                    h-10 px-4 rounded-md text-sm font-medium transition-all
                    flex items-center justify-center
                    ${data.restrictedKeywords.some(k => k.toLowerCase() === keyword.toLowerCase()) 
                      ? "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200 shadow-sm" 
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"}
                  `}
                >
                  {keyword}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Add custom restricted keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddKeyword()
                  }
                }}
              />
              <Button 
                type="button" 
                onClick={handleAddKeyword}
                disabled={!newKeyword}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            
            {/* Custom keywords */}
            {data.restrictedKeywords.filter(k => !restrictedKeywordSuggestions.includes(k)).length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Label className="mb-2 block text-blue-700">Custom Restricted Keywords</Label>
                <div className="flex flex-wrap gap-2">
                  {data.restrictedKeywords
                    .filter(k => !restrictedKeywordSuggestions.includes(k))
                    .map(keyword => (
                      <Badge 
                        key={keyword} 
                        variant="default"
                        className="flex items-center gap-1 bg-white text-blue-700 border border-blue-200 hover:bg-blue-100"
                      >
                        {keyword}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 ml-1 text-blue-700 hover:bg-blue-200"
                          onClick={() => handleRemoveKeyword(keyword)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))
                  }
                </div>
              </div>
            )}
            
            <div className="bg-muted p-4 rounded-md text-sm space-y-2">
              <p className="font-medium">Why restrict keywords?</p>
              <p className="text-muted-foreground">
                Restricting certain keywords helps ensure marketing messages comply with regulations 
                and don't make unrealistic promises. Words like "free," "guaranteed," or "best" 
                can potentially mislead customers or violate marketing regulations.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 