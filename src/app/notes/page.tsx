"use client"

import { useEffect, useState, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, Timestamp, addDoc, serverTimestamp } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL, getBlob, uploadBytesResumable, getMetadata } from "firebase/storage"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar, Tag, Clock, FileText, Filter, ChevronDown, Eye, ArrowRight, LayoutGrid, MessageSquare, Gift, Plus, FileUp, Inbox, FileImage, FilePlus, FileQuestion, Check, Loader2 } from "lucide-react"
import { format, isValid } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DashboardLayout } from "@/components/dashboard-layout"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import axios from "axios"

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
  type: "note" | "invoice" | "other";
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  contentType?: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areas, setAreas] = useState<{id: string, title: string}[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [csAgentSelected, setCsAgentSelected] = useState(false);
  const [rewardAgentSelected, setRewardAgentSelected] = useState(false);
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSummary, setUploadSummary] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Fetch notes from Firestore
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
        
        // Assign a type based on some criteria (for demo purposes)
        // In a real app, this would come from the data
        const noteType = data.type || 
          (data.title?.toLowerCase().includes("invoice") ? "invoice" : 
           (Math.random() > 0.7 ? "other" : "note"));
        
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
          reminderSent: data.reminderSent || false,
          type: noteType as "note" | "invoice" | "other",
          fileUrl: data.fileUrl || "",
          fileType: data.fileType || "",
          fileName: data.fileName || "",
          contentType: data.contentType || ""
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
      
      // Set the first note as selected by default if available
      if (notesData.length > 0 && !selectedNote) {
        setSelectedNote(notesData[0]);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast({
        title: "Error",
        description: "Failed to load notes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchNotes();
  }, []);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      
      // Auto-fill title with filename (without extension)
      const fileName = file.name.split('.').slice(0, -1).join('.');
      setUploadTitle(fileName);
    }
  };
  
  // Function to render PDF viewer
  const renderFileViewer = () => {
    if (!selectedNote?.fileUrl) return null;
    
    if (selectedNote.fileType === 'pdf' || selectedNote.fileUrl.endsWith('.pdf')) {
      return (
        <iframe 
          src={`${selectedNote.fileUrl}#toolbar=0`} 
          className="w-full h-[500px] border-0 rounded-md"
          title={selectedNote.title}
        />
      );
    } else if (['jpg', 'jpeg', 'png', 'gif'].some(ext => 
      selectedNote.fileType === ext || (selectedNote.fileUrl && selectedNote.fileUrl.toLowerCase().endsWith(`.${ext}`)))
    ) {
      return (
        <img 
          src={selectedNote.fileUrl} 
          alt={selectedNote.title} 
          className="max-w-full max-h-[500px] object-contain mx-auto rounded-md"
        />
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-md">
        <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-center text-muted-foreground">
          Preview not available. <a href={selectedNote.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Download file</a>
        </p>
      </div>
    );
  };
  
  // Upload document to Firebase Storage and create a note in Firestore
  const handleUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUploading(true);
      
      // Get file extension and determine file type
      const fileExtension = uploadFile.name.split('.').pop()?.toLowerCase() || '';
      const fileName = uploadFile.name;
      let fileType = fileExtension;
      let noteType: "note" | "invoice" | "other" = "other";
      
      // Determine note type based on file extension
      if (fileExtension === 'pdf') {
        if (fileName.toLowerCase().includes('invoice')) {
          noteType = "invoice";
        } else {
          noteType = "other";
        }
      } else if (['doc', 'docx', 'txt', 'md'].includes(fileExtension)) {
        noteType = "note";
      }
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 300);
      
      try {
        // Get proper content type for the file
        let contentType = 'application/octet-stream'; // Default
        if (uploadFile.type) {
          contentType = uploadFile.type;
        } else if (fileExtension === 'pdf') {
          contentType = 'application/pdf';
        } else if (['jpg', 'jpeg'].includes(fileExtension)) {
          contentType = 'image/jpeg';
        } else if (fileExtension === 'png') {
          contentType = 'image/png';
        } else if (fileExtension === 'gif') {
          contentType = 'image/gif';
        } else if (fileExtension === 'txt') {
          contentType = 'text/plain';
        }

        // Create a storage reference
        const storage = getStorage();
        const customerId = "ZU6nlhrznNgyR3E3OvBOiMXgXur2";
        const storageRef = ref(storage, `customers/${customerId}/documents/${Date.now()}_${uploadFile.name}`);
        
        // Use plain uploadBytesResumable with correct metadata
        const uploadTask = uploadBytesResumable(storageRef, uploadFile, {
          contentType: contentType
        });
        
        // Wait for the upload to complete
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error('Upload error:', error);
              reject(error);
            },
            () => {
              console.log('Upload successful');
              resolve();
            }
          );
        });
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        // Clear progress interval
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Create a note document in Firestore
        const notesRef = collection(db, `customers/${customerId}/ThoughtsX`);
        const tags = uploadTags.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        const noteData = {
          title: uploadTitle || fileName,
          summary: uploadSummary,
          rawText: "", // No raw text for uploaded files
          tags,
          areaId: "uploads",
          areaTitle: "Uploaded Documents",
          categoryId: "documents",
          categoryTitle: "Documents",
          createdAt: serverTimestamp(),
          type: noteType,
          fileUrl: downloadURL,
          fileType,
          fileName,
          contentType
        };
        
        const docRef = await addDoc(notesRef, noteData);
        
        // Add the new note to the state with a proper ID
        const newNote: Note = {
          id: docRef.id,
          ...noteData,
          createdAt: new Date(),
          reminderTime: null,
          reminderSent: false,
          rawText: ""
        };
        
        setNotes(prevNotes => [newNote, ...prevNotes]);
        setSelectedNote(newNote);
        
        // Reset form and close dialog
        resetUploadForm();
        setUploadDialogOpen(false);
        
        toast({
          title: "Document uploaded",
          description: "Your document has been successfully uploaded.",
        });
      } catch (uploadError) {
        console.error("Error in upload or Firestore:", uploadError);
        clearInterval(progressInterval);
        throw uploadError;
      }
      
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Reset upload form
  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle("");
    setUploadSummary("");
    setUploadTags("");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Filter notes based on search query, selected area, and active tab
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery === "" || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesArea = selectedArea === null || note.areaId === selectedArea;
    
    const matchesTab = activeTab === "all" || 
      (activeTab === "invoices" && note.type === "invoice") ||
      (activeTab === "notes" && note.type === "note") ||
      (activeTab === "other" && note.type === "other");
    
    return matchesSearch && matchesArea && matchesTab;
  });
  
  // Function to get icon based on note type
  const getNoteIcon = (noteType: string) => {
    switch (noteType) {
      case 'invoice':
        return <FileText className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      case 'other':
        return <FileQuestion className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  // Function to use note in customer service agent
  const toggleCustomerServiceAgent = () => {
    if (!selectedNote) return;
    setCsAgentSelected(!csAgentSelected);
  };
  
  // Function to use note in reward agent
  const toggleRewardAgent = () => {
    if (!selectedNote) return;
    setRewardAgentSelected(!rewardAgentSelected);
  };
  
  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Custom header without margin */}
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight">Notes</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-8 gap-2 rounded-md">
                <Plus className="h-4 w-4" />
                New Note
              </Button>
              <Button 
                className="h-8 gap-2 rounded-md"
                onClick={() => setUploadDialogOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                Upload Document
              </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t flex-1">
          {/* Left Column - Notes List */}
          <div className="lg:col-span-1 border-r">
            <div className="p-4 border-b">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search notes..." 
                  className="pl-10 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="other">Other</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="border rounded-md p-3">
                      <div className="flex justify-between items-start mb-2">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">No documents found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Try adjusting your search" : "Upload or create a new document"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotes.map((note) => (
                    <div 
                      key={note.id}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedNote?.id === note.id && "bg-muted"
                      )}
                      onClick={() => setSelectedNote(note)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getNoteIcon(note.type)}
                            <h3 className="font-medium text-sm truncate">{note.title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{note.summary}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{safeFormatDate(note.createdAt, "MMM d, yyyy")}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {note.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Note Detail */}
          <div className="lg:col-span-2">
            {selectedNote ? (
              <div>
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium">{selectedNote.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {safeFormatDate(selectedNote.createdAt, "MMMM d, yyyy")} • {selectedNote.areaTitle}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium transition-colors",
                        csAgentSelected 
                          ? "text-primary" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={toggleCustomerServiceAgent}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                        csAgentSelected 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-gray-300"
                      )}>
                        {csAgentSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>Customer Service Agent</span>
                    </button>
                    
                    <button 
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium transition-colors",
                        rewardAgentSelected 
                          ? "text-primary" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={toggleRewardAgent}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                        rewardAgentSelected 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-gray-300"
                      )}>
                        {rewardAgentSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>Reward Agent</span>
                    </button>
                  </div>
                </div>
                
                <div className="px-6 py-6">
                  {selectedNote.fileUrl ? (
                    renderFileViewer()
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div className="bg-muted/50 rounded-md p-4 mb-4">
                        <p className="whitespace-pre-wrap">{selectedNote.rawText}</p>
                      </div>
                      
                      {selectedNote.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {selectedNote.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No document selected</h3>
                  <p className="text-muted-foreground">
                    Select a document from the list to view its contents
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to add it to your notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="file">File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="flex-1"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              </div>
              {uploadFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="summary">Summary (optional)</Label>
              <Textarea
                id="summary"
                value={uploadSummary}
                onChange={(e) => setUploadSummary(e.target.value)}
                placeholder="Brief description of the document"
                className="resize-none"
                rows={3}
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="Comma-separated tags"
              />
              <p className="text-xs text-muted-foreground">
                Separate tags with commas (e.g., invoice, receipt, important)
              </p>
            </div>
            
            {uploadProgress > 0 && (
              <div className="w-full">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center mt-1 text-muted-foreground">
                  {uploadProgress < 100 ? 'Uploading...' : 'Upload complete!'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                resetUploadForm();
                setUploadDialogOpen(false);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  <span>Upload</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
} 