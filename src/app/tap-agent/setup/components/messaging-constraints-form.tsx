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
  "free", 
  "guaranteed", 
  "unlimited", 
  "best", 
  "cheapest", 
  "discount", 
  "sale", 
  "limited time", 
  "exclusive", 
  "secret",
  "promise",
  "always",
  "never",
  "instantly",
  "forever"
]

export function MessagingConstraintsForm({ data, onChange }: MessagingConstraintsFormProps) {
  const [newKeyword, setNewKeyword] = useState("")
  
  const handleAddKeyword = () => {
    if (newKeyword && !data.restrictedKeywords.includes(newKeyword.toLowerCase())) {
      onChange({
        ...data,
        restrictedKeywords: [...data.restrictedKeywords, newKeyword.toLowerCase()]
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
    if (!data.restrictedKeywords.includes(keyword)) {
      onChange({
        ...data,
        restrictedKeywords: [...data.restrictedKeywords, keyword]
      })
    }
  }
  
  // Get suggestions that aren't already selected
  const availableSuggestions = restrictedKeywordSuggestions.filter(
    keyword => !data.restrictedKeywords.includes(keyword)
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
            <div className="flex gap-2">
              <Input
                placeholder="Add a restricted keyword..."
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
            
            {/* Current restricted keywords */}
            {data.restrictedKeywords.length > 0 && (
              <div>
                <Label>Current restricted keywords</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.restrictedKeywords.map(keyword => (
                    <Badge 
                      key={keyword} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {keyword}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => handleRemoveKeyword(keyword)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Suggestions */}
            {availableSuggestions.length > 0 && (
              <div>
                <Label>Suggested restricted keywords</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableSuggestions.map(keyword => (
                    <Badge 
                      key={keyword} 
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => handleAddSuggestion(keyword)}
                    >
                      {keyword}
                    </Badge>
                  ))}
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