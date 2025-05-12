"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar, Tag, Clock, FileText, Filter, ChevronDown, Eye, ArrowRight } from "lucide-react"
import { format, isValid } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { NoteDetailDialog } from "@/components/note-detail-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/page-header"

// Define the Note interface
interface Note {
  id: string;
  title: string;
  summary: string;
  rawText: string;
  tags: string[];
  areaId: string;
  areaTitle: string;
  categoryId: string;
  categoryTitle: string;
  createdAt: Date;
  reminderTime: Date | null;
  reminderSent: boolean;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areas, setAreas] = useState<{id: string, title: string}[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Safe date formatting function
  const safeFormatDate = (date: Date | null, formatString: string): string => {
    if (!date || !isValid(date)) {
      return "Invalid date";
    }
    try {
      return format(date, formatString);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };
  
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        // Using a hardcoded customer ID for now as specified
        const customerId = "ZU6nlhrznNgyR3E3OvBOiMXgXur2";
        const notesRef = collection(db, `customers/${customerId}/ThoughtsX`);
        const notesQuery = query(notesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(notesQuery);
        
        const notesData: Note[] = [];
        const areasMap = new Map<string, string>();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamp to Date, with proper checks
          const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
            ? data.createdAt.toDate() 
            : new Date();
          
          // Handle reminderTime safely
          let reminderTime: Date | null = null;
          if (data.reminderTime) {
            if (typeof data.reminderTime.toDate === 'function') {
              // It's a Firestore timestamp
              reminderTime = data.reminderTime.toDate();
            } else if (data.reminderTime instanceof Date) {
              // It's already a Date object
              reminderTime = data.reminderTime;
            } else if (typeof data.reminderTime === 'string') {
              // It's a string date
              reminderTime = new Date(data.reminderTime);
            } else if (typeof data.reminderTime === 'number') {
              // It's a timestamp in milliseconds
              reminderTime = new Date(data.reminderTime);
            }
          }
          
          const note: Note = {
            id: doc.id,
            title: data.title || "Untitled",
            summary: data.summary || "",
            rawText: data.rawText || "",
            tags: data.tags || [],
            areaId: data.areaId || "",
            areaTitle: data.areaTitle || "Uncategorized",
            categoryId: data.categoryId || "",
            categoryTitle: data.categoryTitle || "General",
            createdAt,
            reminderTime,
            reminderSent: data.reminderSent || false
          };
          
          notesData.push(note);
          
          // Collect unique areas
          if (data.areaId && data.areaTitle) {
            areasMap.set(data.areaId, data.areaTitle);
          }
        });
        
        // Convert areas map to array
        const areasArray = Array.from(areasMap).map(([id, title]) => ({ id, title }));
        
        setNotes(notesData);
        setAreas(areasArray);
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotes();
  }, []);
  
  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setDialogOpen(true);
  };
  
  // Filter notes based on search query and selected area
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery === "" || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesArea = selectedArea === null || note.areaId === selectedArea;
    
    const matchesTab = activeTab === "all" || 
      (activeTab === "reminders" && note.reminderTime !== null);
    
    return matchesSearch && matchesArea && matchesTab;
  });
  
  // Group notes by date for better organization
  const notesByDate = filteredNotes.reduce<Record<string, Note[]>>((acc, note) => {
    // Use safe date formatting to get the date key
    const dateKey = isValid(note.createdAt) 
      ? format(note.createdAt, "yyyy-MM-dd")
      : "invalid-date";
      
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(note);
    return acc;
  }, {});
  
  // Sort dates in descending order
  const sortedDates = Object.keys(notesByDate).sort((a, b) => b.localeCompare(a));
  
  return (
    <DashboardLayout>
    <div className="p-6 py-4">
      <PageHeader 
        title="Notes" 
        subtitle="View and manage your voice notes and thoughts" 
      />
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : notes.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : areas.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? 
                <Skeleton className="h-8 w-16" /> : 
                notes.filter(note => note.reminderTime !== null).length
              }
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search notes by title, content, or tags..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Area</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center justify-between"
                onClick={() => setSelectedArea(null)}
              >
                All Areas
                {selectedArea === null && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
              {areas.map(area => (
                <DropdownMenuItem 
                  key={area.id}
                  className="flex items-center justify-between"
                  onClick={() => setSelectedArea(area.id)}
                >
                  {area.title}
                  {selectedArea === area.id && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {selectedArea && (
            <Button 
              variant="secondary" 
              onClick={() => setSelectedArea(null)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {areas.find(area => area.id === selectedArea)?.title}
              <span className="ml-1">×</span>
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Notes</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 bg-card">
              <div className="flex justify-between items-start mb-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-1/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No notes found</h3>
          <p className="text-muted-foreground">
            {searchQuery 
              ? "Try adjusting your search query or filters" 
              : "Start by creating a voice note using the Voice Note button"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(dateKey => (
            <div key={dateKey}>
              <h2 className="text-lg font-medium mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                {dateKey === "invalid-date" 
                  ? "Unknown Date" 
                  : safeFormatDate(new Date(dateKey), "EEEE, MMMM d, yyyy")}
              </h2>
              
              <div className="space-y-3">
                {notesByDate[dateKey].map(note => (
                  <div 
                    key={note.id}
                    className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleNoteClick(note)}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-medium">{note.title}</h3>
                          {note.reminderTime && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {safeFormatDate(note.reminderTime, "MMM d, h:mm a")}
                            </Badge>
                          )}
                        </div>
                        
                        <div 
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedArea(note.areaId);
                          }}
                        >
                          <FileText className="h-3 w-3" />
                          {note.areaTitle} / {note.categoryTitle}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{note.summary}</p>
                        
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag, i) => (
                            <Badge 
                              key={i} 
                              variant="secondary" 
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchQuery(tag);
                              }}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 rounded-full self-start flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNoteClick(note);
                        }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <NoteDetailDialog 
        note={selectedNote} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </div>
    </DashboardLayout>
  )
} 