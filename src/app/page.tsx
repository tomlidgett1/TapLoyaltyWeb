import { redirect } from 'next/navigation'
import { 
  Plus, 
  Gift, 
  Receipt, 
  Tag, 
  MessageSquare, 
  Mail, 
  Ticket 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Link } from "next/navigation"

// Add this function to safely handle Firestore timestamps or ISO strings
const safelyGetDate = (dateField: any): Date => {
  if (!dateField) return new Date();
  
  try {
    // If it's a Firestore timestamp with toDate method
    if (typeof dateField.toDate === 'function') {
      return dateField.toDate();
    }
    // If it's an ISO string
    else if (typeof dateField === 'string') {
      return new Date(dateField);
    }
    // If it's already a Date
    else if (dateField instanceof Date) {
      return dateField;
    }
    // Fallback
    else {
      return new Date();
    }
  } catch (error) {
    console.error("Error parsing date:", error);
    return new Date();
  }
};

export default function Home() {
  redirect('/dashboard')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/rewards/create" className="flex items-center">
            <Gift className="h-4 w-4 mr-2" />
            New Reward
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/campaigns/create" className="flex items-center">
            <Tag className="h-4 w-4 mr-2" />
            New Campaign
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/promotions/create" className="flex items-center">
            <Ticket className="h-4 w-4 mr-2" />
            New Promotion
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/messages/create" className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            New Message
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/emails/create" className="flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            New Email
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
