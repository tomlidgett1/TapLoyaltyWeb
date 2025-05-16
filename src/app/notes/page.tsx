"use client"

import { useEffect, useState, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, Timestamp, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore"
import { getStorage, ref, getDownloadURL, uploadBytesResumable } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar, Tag, Clock, FileText, Filter, ChevronDown, Eye, ArrowRight, LayoutGrid, MessageSquare, Gift, Plus, FileUp, Inbox, FileImage, FilePlus, FileQuestion, Check, Loader2, Image as ImageIcon, File as FileIcon, ChevronLeft, ChevronRight as ChevronRightIcon, ZoomIn, ZoomOut, Download, CornerDownLeft, File, ChevronRight, MoreVertical, PlusCircle, PlusIcon, Upload, X, Share2, ExternalLink } from "lucide-react"
import { format, isValid, formatRelative } from "date-fns"
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
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnimatedCheckbox, ConnectionButton } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Image from "next/image"
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Add custom animation styles
const customAnimationStyles = `
  @keyframes pulseLeftToRight {
    0% {
      background-position: 0% 0;
    }
    100% {
      background-position: 100% 0;
    }
  }
  
  .animate-pulse-left-to-right {
    animation: pulseLeftToRight 2s ease-in-out infinite;
  }

  @keyframes fadeInOut {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  
  .animate-fade-in-out {
    animation: fadeInOut 2s ease-in-out infinite;
  }

  @keyframes fadeInSlide {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .knowledge-response {
    animation: fadeInSlide 0.3s ease-out forwards;
  }
  
  @keyframes slowFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-slowFadeIn {
    animation: slowFadeIn 0.5s ease-out forwards;
  }
`;

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  type: "note" | "invoice" | "other" | "pdf" | "image";
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  originalFileName?: string;
  fileId?: string;
  contentType?: string;
  inKnowledgeBase?: boolean;
  pendingKnowledgeBase?: boolean;
  origin?: string; // Add origin field to identify if note came from Gmail
}

// Knowledge chat response interface
interface KnowledgeChatResponse {
  answer: string;
  sources: string[];
  metadata: {
    contextCount: number;
    query: string;
  };
}

// Add AILogo component with gradient
const AILogo = () => (
  <svg 
    width="18" 
    height="18" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="flex-shrink-0"
  >
    <defs>
      <linearGradient id="aiLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285F4" /> {/* Blue */}
        <stop offset="100%" stopColor="#EA4335" /> {/* Orange-red */}
      </linearGradient>
    </defs>
    <path 
      d="M12 1.999c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10zm4.709 15.096a1 1 0 01-1.414 0L12 13.414l-3.292 3.293a1 1 0 11-1.414-1.414l3.293-3.293-3.29-3.292a1 1 0 011.414-1.414L12 10.586l3.295-3.294a1 1 0 011.414 1.414l-3.293 3.293 3.293 3.295a1 1 0 010 1.414zM7.404 6.126a1 1 0 00-.819 1.819A5.99 5.99 0 0112 18a1 1 0 100-2 4 4 0 01-3.538-6.066 1 1 0 00-.858-1.809zm9.195.016a1 1 0 10-.817 1.826A5.98 5.98 0 0118 12a6.003 6.003 0 01-6 6 1 1 0 100 2c4.411 0 8-3.589 8-8 0-2.129-.835-4.15-2.346-5.655a1 1 0 00-.055-.204z"
      fill="url(#aiLogoGradient)"
    />
  </svg>
);

// Add a new interface for RelatedNote
interface RelatedNote {
  id: string;
  title: string; 
  summary: string;
  rawText: string;
  type: "note" | "invoice" | "other" | "pdf" | "image";
  fileUrl?: string;
  fileName?: string;
  score: number;
}

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [knowledgeBaseLoading, setKnowledgeBaseLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areas, setAreas] = useState<{id: string, title: string}[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [csAgentSelected, setCsAgentSelected] = useState(false);
  const [rewardAgentSelected, setRewardAgentSelected] = useState(false);
  const [animatingCs, setAnimatingCs] = useState(false);
  const [animatingReward, setAnimatingReward] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  const [searchMode, setSearchMode] = useState<"filter" | "semantic">("filter");
  
  // Semantic search state
  const [semanticSearchQuery, setSemanticSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<{title: string; summary: string; type: string}[]>([
    { title: "Invoice April 2023", summary: "Contains payment details and due dates", type: "invoice" },
    { title: "Client meeting notes", summary: "Discussion about payment schedules", type: "note" },
    { title: "Quarterly budget", summary: "Financial projections and expense tracking", type: "other" }
  ]);
  
  // Knowledge chat state
  const [isLoadingKnowledgeChat, setIsLoadingKnowledgeChat] = useState(false);
  const [knowledgeChatResponse, setKnowledgeChatResponse] = useState<KnowledgeChatResponse | null>(null);
  const [showKnowledgeChatResponse, setShowKnowledgeChatResponse] = useState(false);
  const [isKnowledgeResponseVisible, setIsKnowledgeResponseVisible] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const listTitleInputRef = useRef<HTMLInputElement>(null);
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSummary, setUploadSummary] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // PDF Viewer state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfScale, setPdfScale] = useState(1.0);
  const pdfViewerContainerRef = useRef<HTMLDivElement>(null);
  
  // Document type selector state
  const [isUpdatingDocType, setIsUpdatingDocType] = useState(false);
  
  // Add a state for PDF blob at the beginning of the component
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
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
  const fetchNotes = () => {
    if (!user || !user.uid) {
      setLoading(false);
      setNotes([]);
      return () => {};
    }
    
    try {
      setLoading(true);
      const notesRef = collection(db, `merchants/${user.uid}/files`);
      const notesQuery = query(notesRef, orderBy("createdAt", "desc"));
      
      // Setup real-time listener for notes collection
      const unsubscribe = onSnapshot(notesQuery, (querySnapshot) => {
        const notesData: Note[] = [];
        const areasMap = new Map<string, string>();
        
        // Gather all filenames for knowledge base check
        const fileNames: string[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamp to Date, with proper checks
          const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
            ? data.createdAt.toDate() 
            : new Date();
          
          // Handle reminderTime safely
          let reminderTime: Date | null = null;
          if (data.reminderTime) {
            if (data.reminderTime.toDate) {
              reminderTime = data.reminderTime.toDate();
            } else if (data.reminderTime instanceof Date) {
              reminderTime = data.reminderTime;
            } else if (typeof data.reminderTime === 'string') {
              reminderTime = new Date(data.reminderTime);
            } else if (typeof data.reminderTime === 'number') {
              reminderTime = new Date(data.reminderTime);
            }
          }
        
          // Assign a type based on some criteria (for demo purposes)
          // In a real app, this would come from the data
          let noteType = data.type || "other";
          const fileName = data.fileName || "";
          const fileTypeFromData = data.fileType || fileName.split('.').pop()?.toLowerCase() || '';

          if (!data.type) { // Only override if type isn't explicitly set
            if (fileTypeFromData === 'pdf') {
              noteType = fileName.toLowerCase().includes('invoice') ? "invoice" : "pdf";
            } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileTypeFromData)) {
              noteType = "image";
            } else if (['doc', 'docx', 'txt', 'md'].includes(fileTypeFromData)) {
              noteType = "note";
            } else if (fileName) { // If there is a filename but type is unknown
               noteType = "other"; // or a more generic 'file' type
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
              reminderSent: data.reminderSent || false,
              type: noteType as Note['type'],
              fileUrl: data.fileUrl || "",
              fileType: fileTypeFromData,
              fileName: fileName,
              originalFileName: data.originalFileName || "",
              fileId: data.fileId || "",
              contentType: data.contentType || "",
              inKnowledgeBase: data.inKnowledgeBase === true,
              // Set pending status for documents with files that don't yet have inKnowledgeBase=true
              // Documents older than 10 minutes won't show the spinner
              pendingKnowledgeBase: !data.inKnowledgeBase && !!fileName && 
                createdAt && ((new Date().getTime() - createdAt.getTime()) < 10 * 60 * 1000),
              origin: data.origin || "" // Capture the origin field
            };
            
            if (fileName) {
              fileNames.push(fileName);
            }
            
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
          setLoading(false);
        
          // Set the first note as selected by default if available
          if (notesData.length > 0 && !selectedNote) {
            setSelectedNote(notesData[0]);
          } else if (notesData.length === 0) {
            setSelectedNote(null);
          }
          
          // Check knowledge base status for all notes with filenames
          if (notesData.length > 0 && user && user.uid) {
            checkKnowledgeBaseStatus(notesData, user.uid);
          }
        }, (error) => {
          console.error("Error listening to notes collection:", error);
          toast({
            title: "Error",
            description: "Failed to listen for notes updates. Please refresh the page.",
            variant: "destructive"
          });
          setLoading(false);
        });
        
        // Return the unsubscribe function directly
        return unsubscribe;
      } catch (error) {
        console.error("Error setting up notes listener:", error);
        toast({
          title: "Error",
          description: "Failed to load notes. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return () => {}; // Return empty function if setup fails
      }
    };
    
  // Function to check if documents have been added to the knowledge base
  const checkKnowledgeBaseStatus = async (notesData: Note[], merchantId: string) => {
    try {
      setKnowledgeBaseLoading(true);
      
      // Create a batch of promises to check knowledge base status
      const knowledgeBasePromises = notesData
        .filter(note => note.fileName || note.originalFileName)
        .map(async (note) => {
          // If inKnowledgeBase is already true from the file document, keep it
          if (note.inKnowledgeBase === true) {
            console.log(`Note already marked as in KB: ${note.fileName || note.originalFileName}`);
            return { noteId: note.id, isInKnowledgeBase: true, isPending: false };
          }
          
          if (!note.fileName && !note.originalFileName) return null;
          
          // Check the knowledge base collection for this file
          const kbRef = collection(db, `merchants/${merchantId}/knowledgebase`);
          const kbQuery = query(kbRef, orderBy("createTime", "desc")); 
          const kbSnapshot = await getDocs(kbQuery);
          
          // Check if any document matches this file name and has status success
          let isInKnowledgeBase = false;
          let isPending = note.pendingKnowledgeBase || false;
          
          console.log(`Checking KB for file: ${note.fileName || note.originalFileName}`);
          
          kbSnapshot.forEach((docSnap) => {
            const kbData = docSnap.data();
            
            // Check for matches against multiple possible identifiers
            const isMatch = (note.fileId && kbData.fileId === note.fileId) ||
              ((note.fileName && (kbData.source?.includes(note.fileName) || kbData.fileName === note.fileName)) ||
               (note.originalFileName && (kbData.source?.includes(note.originalFileName) || kbData.fileName === note.originalFileName)) ||
               (note.fileName && note.fileName.includes('_') && 
                kbData.source?.includes(note.fileName.substring(note.fileName.lastIndexOf('_') + 1))));
                
            if (isMatch) {
              // If we find a matching entry in knowledge base
              if (kbData.status === "success") {
                isInKnowledgeBase = true;
                isPending = false;
                console.log(`KB Match found for: ${note.fileName || note.originalFileName}`);
                
                // Update file document to set inKnowledgeBase field for future reference
                updateFileKnowledgeBaseStatus(merchantId, note.id).catch(err => 
                  console.error(`Error updating inKnowledgeBase field: ${err}`)
                );
              } 
              // If status is pending/processing, keep the pending state true
              else if (kbData.status === "pending" || kbData.status === "processing") {
                isPending = true;
                console.log(`KB processing for: ${note.fileName || note.originalFileName}`);
              }
            }
          });
          
          if (!isInKnowledgeBase && !isPending) {
            console.log(`No KB match found for: ${note.fileName || note.originalFileName}`);
            // If it's been pending for more than 10 minutes, clear the pending status
            if (note.createdAt && ((new Date().getTime() - note.createdAt.getTime()) > 10 * 60 * 1000)) {
              isPending = false;
            }
          }
          
          return { noteId: note.id, isInKnowledgeBase, isPending };
        });
        
      // Wait for all promises to resolve
      const results = await Promise.all(knowledgeBasePromises);
      
      // Update the notes state with knowledge base info
      setNotes(prevNotes => {
        return prevNotes.map(note => {
          const result = results.find(r => r && r.noteId === note.id);
          if (result) {
            return { 
              ...note, 
              inKnowledgeBase: result.isInKnowledgeBase,
              pendingKnowledgeBase: result.isPending
            };
          }
          return note;
        });
      });
      
      // Also update selectedNote if it exists
      if (selectedNote) {
        const result = results.find(r => r && r.noteId === selectedNote.id);
        if (result) {
          setSelectedNote({ 
            ...selectedNote, 
            inKnowledgeBase: result.isInKnowledgeBase,
            pendingKnowledgeBase: result.isPending
          });
        }
      }
      
    } catch (error) {
      console.error("Error checking knowledge base status:", error);
    } finally {
      setKnowledgeBaseLoading(false);
    }
  };
    
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (user && user.uid) {
      unsubscribe = fetchNotes();
    }
    
    // Cleanup function to unsubscribe from real-time listeners when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);
  
  useEffect(() => {
    if (selectedNote && selectedNote.type === 'pdf') {
      setNumPages(null); // Reset numPages when a new PDF is selected
    } 
  }, [selectedNote]);
  
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
  
  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }) {
    setNumPages(nextNumPages);
  }

  // Add a helper function to fetch PDFs with proper CORS handling
  const fetchPdfAsDataUrl = async (url: string): Promise<string> => {
    setPdfLoading(true);
    try {
      // Create a new URL with a proxy service that handles CORS
      // For development purposes, you can use a CORS proxy service
      // In production, this should be replaced with your own proxy or Firebase function
      const corsAnywhereUrl = `https://cors-anywhere.herokuapp.com/${url}`;
      
      const response = await fetch(corsAnywhereUrl);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error fetching PDF:", error);
      toast({
        title: "PDF Error",
        description: "CORS issue detected. Try downloading the file instead or open in a new tab.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setPdfLoading(false);
    }
  };

  // Move the useEffect out of renderFileViewer and into the main component
  useEffect(() => {
    let isMounted = true;
    
    if (selectedNote?.fileUrl && 
        (selectedNote.type === 'pdf' || 
         (selectedNote.type === 'invoice' && selectedNote.fileUrl) || 
         (selectedNote.fileUrl && selectedNote.fileUrl.toLowerCase().endsWith('.pdf')))) {
      
      // Check if we already have this PDF loaded
      if (currentPdfUrl && currentPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentPdfUrl);
        setCurrentPdfUrl(null);
      }
      
      // Direct inline embedding with PDF object tag as a fallback approach
      setCurrentPdfUrl(selectedNote.fileUrl);
    }
    
    return () => {
      isMounted = false;
      if (currentPdfUrl && currentPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentPdfUrl);
      }
    };
  }, [selectedNote, currentPdfUrl]);

  // Now update the renderFileViewer function without the useEffect inside it
  const renderFileViewer = () => {
    if (!selectedNote?.fileUrl) return null;
    
    const fileUrl = selectedNote.fileUrl;
    const isPdf = selectedNote.type === 'pdf' || 
                  (selectedNote.type === 'invoice' && selectedNote.fileUrl) || 
                  (selectedNote.fileUrl && selectedNote.fileUrl.toLowerCase().endsWith('.pdf'));
                  
    const isImage = selectedNote.type === 'image' || (['jpg', 'jpeg', 'png', 'gif'].some(ext => 
      selectedNote.fileType?.toLowerCase() === ext || (selectedNote.fileUrl && selectedNote.fileUrl.toLowerCase().endsWith(`.${ext}`))));

    if (isPdf) {
      return (
        <div ref={pdfViewerContainerRef} className="w-full h-full overflow-y-auto rounded-md scrollbar-thin">
          {pdfLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading PDF...</span>
            </div>
          ) : (
            <div className="pdf-container w-full h-full min-h-[500px] relative">
              {/* Try iframe first as it handles CORS better in many cases */}
              <iframe 
                src={fileUrl} 
                className="w-full h-full rounded-md"
                style={{ display: 'block' }}
                onError={(e) => {
                  // If iframe fails, the fallback object tag will be shown
                  (e.target as HTMLIFrameElement).style.display = 'none';
                }}
              />
              
              {/* Fallback to object tag which sometimes works better */}
              <object 
                data={fileUrl} 
                type="application/pdf" 
                width="100%" 
                height="100%" 
                className="w-full h-full rounded-md"
              >
                {/* User-friendly error message with multiple options */}
                <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-md border border-gray-200 h-full">
                  <FileIcon className="h-12 w-12 text-red-500 mb-4" />
                  <h3 className="font-medium mb-2">Unable to display PDF</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md">
                    Your browser couldn't display this PDF due to security restrictions (CORS policy). 
                    Try one of these options:
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4" />
                      <span>Download PDF</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => window.open(fileUrl, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                      <span>Open in New Tab</span>
                    </Button>
                  </div>
                  <div className="mt-6 border-t border-gray-200 pt-4 w-full max-w-md">
                    <p className="text-xs text-muted-foreground mb-2">
                      PDF preview may be unavailable when documents are hosted on a different domain.
                      This is a security feature of web browsers.
                    </p>
                  </div>
                </div>
              </object>
            </div>
          )}
        </div>
      );
    } else if (isImage) {
      return (
        <div className="w-full h-full flex items-center justify-center p-2 bg-gray-50 rounded-md">
          <img 
            src={fileUrl} 
            alt={selectedNote.title} 
            className="max-w-full max-h-full object-contain rounded-sm shadow-md border border-gray-200"
            style={{ transform: `scale(${pdfScale})` }}
          />
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-md h-full bg-gray-50">
        <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-center text-muted-foreground">
          Preview not available. <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Download file</a>
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

    if (!user || !user.uid) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload documents.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      const fileExtension = uploadFile.name.split('.').pop()?.toLowerCase() || '';
      const fileName = uploadFile.name;
      let noteType: "note" | "invoice" | "other" | "pdf" | "image" = "other";
      
      if (fileExtension === 'pdf') {
        noteType = "pdf";
        if (fileName.toLowerCase().includes('invoice')) {
          noteType = "invoice";
        }
      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        noteType = "image";
      } else if (['doc', 'docx', 'txt', 'md'].includes(fileExtension)) {
        noteType = "note";
      }
      
      let contentType = uploadFile.type || 'application/octet-stream';
      if (!uploadFile.type) {
        if (fileExtension === 'pdf') contentType = 'application/pdf';
        else if (['jpg', 'jpeg'].includes(fileExtension)) contentType = 'image/jpeg';
        else if (fileExtension === 'png') contentType = 'image/png';
        else if (fileExtension === 'gif') contentType = 'image/gif';
        else if (fileExtension === 'txt') contentType = 'text/plain';
      }

      // Generate a unique file identifier
      const fileId = uuidv4();
      const timestamp = Date.now();
      const uniqueFileName = `${fileId}_${timestamp}_${uploadFile.name}`;
      
      const storage = getStorage();
      const storageRef = ref(storage, `merchants/${user.uid}/files/${uniqueFileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, uploadFile, {
        contentType: contentType
      });
      
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            switch (error.code) {
              case 'storage/unauthorized':
                toast({
                  title: "Upload Error",
                  description: "Permission denied. Check Firebase Storage rules.",
                  variant: "destructive"
                });
                break;
              case 'storage/canceled':
                toast({
                  title: "Upload Canceled",
                  description: "The upload was canceled.",
                  variant: "destructive"
                });
                break;
              case 'storage/unknown':
                toast({
                  title: "Upload Error",
                  description: "An unknown error occurred. Check CORS configuration on Firebase Storage.",
                  variant: "destructive"
                });
                break;
              default:
                toast({
                  title: "Upload Error",
                  description: error.message,
                  variant: "destructive"
                });
            }
            reject(error);
          },
          async () => {
            console.log('Upload successful');
            try {
              const downloadURL = await getDownloadURL(storageRef);
              
              const notesRef = collection(db, `merchants/${user.uid}/files`);
              const tags = uploadTags.split(',').map(tag => tag.trim()).filter(tag => tag);
              
              // Use the exact same uniqueFileName for storage and Firestore
              const noteData = {
                title: uploadTitle || fileName,
                summary: uploadSummary,
                rawText: "", 
                tags,
                areaId: "uploads",
                areaTitle: "Uploaded Documents",
                categoryId: "documents",
                categoryTitle: "Documents",
                createdAt: serverTimestamp(),
                type: noteType,
                fileUrl: downloadURL,
                fileType: fileExtension,
                fileName: uniqueFileName,
                originalFileName: fileName, // Store original filename separately
                fileId: fileId, // Store the UUID as a separate field for easy searching
                contentType
              };
              
              await addDoc(notesRef, noteData);
              
              await fetchNotes();
              
              resetUploadForm();
              setUploadDialogOpen(false);
              
              toast({
                title: "Document uploaded",
                description: "Your document has been successfully uploaded.",
              });
              resolve();
            } catch (firestoreError) {
              console.error("Error creating Firestore document:", firestoreError);
              toast({
                title: "Error",
                description: "File uploaded, but failed to save note details.",
                variant: "destructive"
              });
              reject(firestoreError);
            }
          }
        );
      });
      
    } catch (error) {
      console.error("Outer error during upload process:", error);
      if (!(error instanceof Error && (error.name === 'FirebaseError' || (error as any).code?.startsWith('storage/')))) {
        toast({
          title: "Upload failed",
          description: "An unexpected error occurred during the upload setup.",
          variant: "destructive"
        });
      }
    } finally {
      setUploading(false);
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
      (activeTab === "gmail" && note.origin === "gmail") ||
      (activeTab === "other" && note.type === "other");
    
    return matchesSearch && matchesArea && matchesTab;
  });
  
  // Updated function to get icon based on note type and fileType
  const getNoteIcon = (note: Note) => {
    if (note.type === 'pdf' || (note.fileUrl && note.fileName?.toLowerCase().endsWith('.pdf'))) {
      return <FileIcon className="h-4 w-4 text-red-500 flex-shrink-0" />;
    } else if (note.type === 'image' || (note.fileUrl && ['jpg', 'jpeg', 'png', 'gif'].some(ext => note.fileName?.toLowerCase().endsWith(ext)))) {
      return <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    } else if (note.type === 'invoice') {
      return <FileText className="h-4 w-4 text-green-500 flex-shrink-0" />;
    } else if (note.type === 'note') {
      return <FileText className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    } else if (note.type === 'other' && note.fileUrl) {
      return <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />;
    } else if (note.type === 'other') {
      return <FileQuestion className="h-4 w-4 text-purple-500 flex-shrink-0" />;
    }
    return <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />;
  };
  
  // Function to delete the current file/note
  const handleDeleteFile = async () => {
    if (!selectedNote || !user || !user.uid) return;
    
    try {
      setDeletingFile(true);
      
      // If there's a file URL, we might want to delete from storage too
      // This would require additional Firebase storage functions
      
      // Delete the document from Firestore
      const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
      await deleteDoc(noteRef);
      
      // Update local state
      setNotes(notes.filter(note => note.id !== selectedNote.id));
      
      // Select the next available note if any
      if (notes.length > 1) {
        const currentIndex = notes.findIndex(note => note.id === selectedNote.id);
        const nextNote = notes[currentIndex + 1] || notes[currentIndex - 1];
        setSelectedNote(nextNote);
      } else {
        setSelectedNote(null);
      }
      
      toast({
        title: "File deleted",
        description: "The file has been successfully deleted.",
      });
      
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingFile(false);
    }
  };
  
  // Update document type in Firestore
  const updateDocumentType = async (newType: Note['type']) => {
    if (!selectedNote || !user || !user.uid) return;
    
    try {
      setIsUpdatingDocType(true);
      const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
      
      await updateDoc(noteRef, {
        type: newType
      });
  
      // Update local state
      setSelectedNote({
        ...selectedNote,
        type: newType
      });
      
      // Update the notes array
      setNotes(notes.map(note => 
        note.id === selectedNote.id 
        ? { ...note, type: newType }
        : note
      ));
      
      toast({
        title: "Document updated",
        description: `Document type changed to ${newType}.`,
      });
    } catch (error) {
      console.error("Error updating document type:", error);
      toast({
        title: "Update failed",
        description: "Failed to update document type. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingDocType(false);
    }
  };
  
  // Handle zoom in/out for PDF viewer
  const handleZoomIn = () => {
    setPdfScale(prev => Math.min(prev + 0.25, 3.0));
  };
  
  const handleZoomOut = () => {
    setPdfScale(prev => Math.max(prev - 0.25, 0.5));
  };
  
  // Handle document download
  const handleDownload = () => {
    if (!selectedNote?.fileUrl) return;
    
    const link = document.createElement('a');
    link.href = selectedNote.fileUrl;
    link.download = selectedNote.fileName || selectedNote.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Update document title in Firestore
  const updateDocumentTitle = async () => {
    if (!selectedNote || !user || !user.uid || !editedTitle.trim()) return;
    
    try {
      const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
      
      await updateDoc(noteRef, {
        title: editedTitle
      });
      
      // Update local state
      setSelectedNote({
        ...selectedNote,
        title: editedTitle
      });
      
      // Update the notes array
      setNotes(notes.map(note => 
        note.id === selectedNote.id 
        ? { ...note, title: editedTitle }
        : note
      ));
      
      toast({
        title: "Document updated",
        description: "Document title updated successfully",
      });
    } catch (error) {
      console.error("Error updating document title:", error);
      toast({
        title: "Update failed",
        description: "Failed to update document title. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEditingTitle(false);
    }
  };
  
  // Handle double click on title to edit
  const handleTitleDoubleClick = (inListView = false) => {
    if (!selectedNote) return;
    setEditedTitle(selectedNote.title);
    setIsEditingTitle(true);
    // Focus the input after rendering
    setTimeout(() => {
      if (inListView && listTitleInputRef.current) {
        listTitleInputRef.current.focus();
        listTitleInputRef.current.select();
      } else if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 10);
  };
  
  // Handle title input blur or Enter key
  const handleTitleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateDocumentTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };
  
  // Handle title input blur
  const handleTitleInputBlur = () => {
    updateDocumentTitle();
  };
  
  // Function to get icon for search results
  const getSearchResultIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />;
      case 'note':
        return <FileText className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />;
      case 'pdf':
        return <FileIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />;
      case 'image':
        return <ImageIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />;
    }
  };

  // Function to handle semantic search
  const handleSemanticSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSemanticSearchQuery(query);
    
    if (query.trim() === "") {
      setShowSearchResults(false);
      return;
    }
    
    // Simulate semantic search results
    // In a real app, this would call an API or use a library for semantic search
    const filteredResults = notes
      .filter(note => 
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.summary.toLowerCase().includes(query.toLowerCase()) ||
        note.rawText.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5)
      .map(note => ({
        title: note.title,
        summary: note.summary || (note.fileName ? `File: ${note.fileName}` : 'No summary'),
        type: note.type
      }));
    
    setSearchResults(filteredResults.length > 0 ? filteredResults : searchResults);
    setShowSearchResults(true);
  };

  // Function to call the knowledgeChat Firebase function
  const callKnowledgeChatFunction = async () => {
    if (!semanticSearchQuery.trim() || !user?.uid) return;
    
    try {
      setIsLoadingKnowledgeChat(true);
      setShowSearchResults(false);
      setShowKnowledgeChatResponse(true);
      setIsKnowledgeResponseVisible(false); // Reset visibility for fade-in effect
      
      // Add to recent searches
      setRecentSearches(prev => {
        const newSearches = [semanticSearchQuery, ...prev.filter(s => s !== semanticSearchQuery)].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(newSearches));
        return newSearches;
      });
      
      // Log request details for debugging
      console.log('🔍 Knowledge Base Request:', {
        url: 'https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/knowledgeBase',
        userId: user.uid,
        prompt: semanticSearchQuery
      });
      
      // Make API call directly to knowledgeBase function - same approach as tap-agent-sheet.tsx
      const response = await fetch(
        'https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/knowledgeBase', 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchantId: user.uid,
            prompt: semanticSearchQuery
          }),
        }
      );
      
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }
      
      // Clone the response so we can log it and still use it
      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();
      console.log('📥 Response body:', responseText);
      
      // Parse the original response
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Parsed response data:', data);
        
        // Check for multiple possible response formats like in tap-agent-sheet.tsx
        if (data?.answer) {
          // Make sure we have a sources array even if it doesn't exist in the response
          setKnowledgeChatResponse({
            ...data,
            sources: data.sources || [],
            metadata: data.metadata || { 
              contextCount: 0, 
              query: semanticSearchQuery 
            }
          });
          
          toast({
            title: "Vault Search Complete",
            description: "Your vault search has been processed successfully",
            variant: "default"
          });
        } else if (data?.success && data?.summary) {
          setKnowledgeChatResponse({ 
            answer: data.summary,
            sources: [],
            metadata: { contextCount: 0, query: semanticSearchQuery }
          });
          
          toast({
            title: "Vault Search Complete",
            description: "Your vault search has been processed successfully",
            variant: "default"
          });
        } else if (data?.success && data?.answer) {
          setKnowledgeChatResponse({ 
            ...data,
            answer: data.answer,
            sources: data.sources || [],
            metadata: data.metadata || { contextCount: 0, query: semanticSearchQuery }
          });
          
          toast({
            title: "Vault Search Complete",
            description: "Your vault search has been processed successfully",
            variant: "default"
          });
        } else if (data?.result?.summary) {
          setKnowledgeChatResponse({ 
            answer: data.result.summary,
            sources: [],
            metadata: { contextCount: 0, query: semanticSearchQuery } 
          });
          
          toast({
            title: "Vault Search Complete",
            description: "Your vault search has been processed successfully",
            variant: "default"
          });
        } else if (data?.summary) {
          setKnowledgeChatResponse({ 
            answer: data.summary,
            sources: [],
            metadata: { contextCount: 0, query: semanticSearchQuery }
          });
          
          toast({
            title: "Vault Search Complete",
            description: "Your vault search has been processed successfully",
            variant: "default"
          });
        } else if (data?.error) {
          toast({
            title: "Vault Search Error",
            description: data.error,
            variant: "destructive"
          });
          throw new Error(data.error);
        } else {
          // Fallback for any other format
          console.error("Unrecognized response format:", data);
          setKnowledgeChatResponse({ 
            answer: `I couldn't process the documents properly. The response format was unexpected.\n\nPlease try a different search query or contact support if this issue persists.`,
            sources: [],
            metadata: { contextCount: 0, query: semanticSearchQuery }
          });
          
          toast({
            title: "Unexpected Response Format",
            description: "The response format wasn't recognized, but I've tried to display what I found",
            variant: "destructive"
          });
        }
        
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Failed to parse response text:', responseText);
        setKnowledgeChatResponse({ 
          answer: "I encountered an error while processing your search results. The response couldn't be parsed properly.",
          sources: [],
          metadata: { contextCount: 0, query: semanticSearchQuery }
        });
        
        toast({
          title: "Error Processing Response",
          description: "Could not process the vault search response",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Knowledge chat error:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      
      setKnowledgeChatResponse({ 
        answer: `I encountered an error while searching your vault: ${error instanceof Error ? error.message : "Unknown error"}.\n\nPlease try again with a different search query.`,
        sources: [],
        metadata: { contextCount: 0, query: semanticSearchQuery }
      });
      
      toast({
        title: "Vault Search Failed",
        description: error instanceof Error ? error.message : "Failed to search documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingKnowledgeChat(false);
    }
  };

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      try {
        const parsed = JSON.parse(savedSearches);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      } catch (e) {
        console.error("Failed to parse recent searches", e);
      }
    }
  }, []);

  // Function to handle clicking outside the search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.semantic-search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('unified-search-input');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
      }

      // Command/Ctrl + / to toggle search mode
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setSearchMode(prev => prev === "filter" ? "semantic" : "filter");
      }
      
      // Escape to close search results or knowledge chat
      if (e.key === 'Escape') {
        if (showKnowledgeChatResponse) {
          setShowKnowledgeChatResponse(false);
        } else {
          setShowSearchResults(false);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSearchResults, showKnowledgeChatResponse, setSearchMode]);
  
  useEffect(() => {
    let fadeInTimer: NodeJS.Timeout;
    if (!isLoadingKnowledgeChat && knowledgeChatResponse && !isKnowledgeResponseVisible && showKnowledgeChatResponse) {
      // Short delay to ensure element is mounted before transition starts
      fadeInTimer = setTimeout(() => {
        setIsKnowledgeResponseVisible(true);
      }, 50);
    }
    return () => {
      if (fadeInTimer) clearTimeout(fadeInTimer);
    };
  }, [isLoadingKnowledgeChat, knowledgeChatResponse, isKnowledgeResponseVisible, showKnowledgeChatResponse]);
  
  // Add this helper function before setupKnowledgeBaseListeners
  const updateFileKnowledgeBaseStatus = async (merchantId: string, fileId: string) => {
    try {
      const fileDocRef = doc(db, `merchants/${merchantId}/files`, fileId);
      await updateDoc(fileDocRef, { inKnowledgeBase: true });
      console.log(`Updated inKnowledgeBase field for file: ${fileId}`);
    } catch (updateErr: any) {
      console.error("Error updating file document:", updateErr);
      throw updateErr; // Re-throw to be caught by the caller
    }
  };

  // Add a function to set up real-time listeners for knowledge base status
  const setupKnowledgeBaseListeners = (notesData: Note[], merchantId: string): (() => void) => {
    if (!merchantId || notesData.length === 0) return () => {};

    console.log('Setting up knowledge base listeners');
    
    // Listen to the knowledgebase collection for changes
    const kbRef = collection(db, `merchants/${merchantId}/knowledgebase`);
    const kbQuery = query(kbRef, orderBy("createTime", "desc"));
    
    // Create an array to collect all unsubscribe functions
    const unsubscribeFunctions: Array<() => void> = [];
    
    // Set up a listener for the knowledge base collection
    const kbUnsubscribe = onSnapshot(kbQuery, (snapshot) => {
      console.log('Knowledge base collection updated');
      
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const kbData = change.doc.data();
          const kbStatus = kbData.status;
          
          // Only process if status is "success"
          if (kbStatus === "success") {
            // Find matching notes in our local state
            setNotes(prevNotes => {
              return prevNotes.map(note => {
                // Check if this KB entry matches this note
                const isMatch = (note.fileId && kbData.fileId === note.fileId) ||
                  ((note.fileName && (kbData.source?.includes(note.fileName) || kbData.fileName === note.fileName)) ||
                  (note.originalFileName && (kbData.source?.includes(note.originalFileName) || kbData.fileName === note.originalFileName)) ||
                  (note.fileName && note.fileName.includes('_') && 
                  kbData.source?.includes(note.fileName.substring(note.fileName.lastIndexOf('_') + 1))));
                
                if (isMatch) {
                  console.log(`Realtime update: KB success for ${note.title}`);
                  
                  // Update the document in Firestore to set inKnowledgeBase=true
                  const docRef = doc(db, `merchants/${merchantId}/files`, note.id);
                  updateDoc(docRef, { inKnowledgeBase: true })
                    .catch((err: Error) => console.error('Error updating KB status in files collection:', err));
                  
                  // Update in local state
                  return { 
                    ...note, 
                    inKnowledgeBase: true,
                    pendingKnowledgeBase: false
                  };
                }
                return note;
              });
            });
            
            // Also update selectedNote if it exists and matches
            if (selectedNote) {
              const isSelectedMatch = (selectedNote.fileId && kbData.fileId === selectedNote.fileId) ||
                ((selectedNote.fileName && (kbData.source?.includes(selectedNote.fileName) || kbData.fileName === selectedNote.fileName)) ||
                (selectedNote.originalFileName && (kbData.source?.includes(selectedNote.originalFileName) || kbData.fileName === selectedNote.originalFileName)) ||
                (selectedNote.fileName && selectedNote.fileName.includes('_') && 
                kbData.source?.includes(selectedNote.fileName.substring(selectedNote.fileName.lastIndexOf('_') + 1))));
              
              if (isSelectedMatch) {
                setSelectedNote(prev => prev ? {
                  ...prev,
                  inKnowledgeBase: true,
                  pendingKnowledgeBase: false
                } : null);
              }
            }
          }
        }
      });
    }, error => {
      console.error('Error in knowledge base listener:', error);
    });
    
    unsubscribeFunctions.push(kbUnsubscribe);
    
    // Set up individual listeners for each file document to detect direct updates to inKnowledgeBase
    notesData.forEach(note => {
      if (note.pendingKnowledgeBase && !note.inKnowledgeBase) {
        const fileDocRef = doc(db, `merchants/${merchantId}/files`, note.id);
        const fileUnsubscribe = onSnapshot(fileDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            if (data.inKnowledgeBase === true) {
              console.log(`Realtime update: Document ${note.title} directly marked as in KB`);
              
              // Update our local state
              setNotes(prevNotes => prevNotes.map(n => 
                n.id === note.id 
                  ? { ...n, inKnowledgeBase: true, pendingKnowledgeBase: false } 
                  : n
              ));
              
              // Update selected note if it matches
              if (selectedNote && selectedNote.id === note.id) {
                setSelectedNote(prev => prev ? {
                  ...prev,
                  inKnowledgeBase: true,
                  pendingKnowledgeBase: false
                } : null);
              }
            }
          }
        }, error => {
          console.error(`Error in file listener for ${note.id}:`, error);
        });
        
        unsubscribeFunctions.push(fileUnsubscribe);
      }
    });
    
    // Return a function to unsubscribe from all listeners
    return () => {
      console.log('Cleaning up knowledge base listeners');
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  };

  // Fix the useEffect hook
  useEffect(() => {
    // Set up realtime listeners when notes are loaded and user is authenticated
    if (notes.length > 0 && user && user.uid) {
      const unsubscribe = setupKnowledgeBaseListeners(notes, user.uid);
      return unsubscribe;
    }
    return undefined;
  }, [notes, user, selectedNote]);
  
  // Add state for related notes
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  
  // Add function to fetch related notes
  const fetchRelatedNotes = async (noteId: string) => {
    if (!user || !user.uid) return;
    
    try {
      setLoadingRelated(true);
      setRelatedError(null);
      
      const functions = getFunctions();
      const getRelatedNotesFunction = httpsCallable(functions, 'getRelatedNotes');
      
      const result = await getRelatedNotesFunction({
        merchantId: user.uid,
        noteId: noteId,
        limit: 5,
        minScore: 0.7
      });
      
      // Firebase functions return data in a 'data' property
      const data = result.data as { related: RelatedNote[] };
      setRelatedNotes(data.related || []);
      
      console.log('Related notes:', data.related);
    } catch (error) {
      console.error('Error fetching related notes:', error);
      setRelatedError('Failed to load similar documents');
      setRelatedNotes([]);
    } finally {
      setLoadingRelated(false);
    }
  };
  
  // Call fetchRelatedNotes when a note is selected
  useEffect(() => {
    if (selectedNote) {
      fetchRelatedNotes(selectedNote.id);
    } else {
      setRelatedNotes([]);
    }
  }, [selectedNote, user]);
  
  // Add new state for knowledge base processing stages
  const [knowledgeBaseProcessingStage, setKnowledgeBaseProcessingStage] = useState(0);
  
  // Add effect for cycling Knowledge Base processing messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoadingKnowledgeChat) {
      // Reset to first message when loading starts
      setKnowledgeBaseProcessingStage(0);
      
      // Set up interval to cycle through messages every 2 seconds
      interval = setInterval(() => {
        setKnowledgeBaseProcessingStage(prev => (prev + 1) % 4);
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoadingKnowledgeChat]);
  
  // Knowledge Base processing messages based on stage
  const getKnowledgeBaseProcessingMessage = () => {
    switch (knowledgeBaseProcessingStage) {
      case 0:
        return "Searching your vault...";
      case 1:
        return "Finding relevant documents...";
      case 2:
        return "Analysing content...";
      case 3:
        return "Generating response...";
      default:
        return "Processing your request...";
    }
  };
  
  return (
    <DashboardLayout>
      {/* Add custom animation styles */}
      <style dangerouslySetInnerHTML={{ __html: customAnimationStyles }} />
      <div className="flex flex-col h-full">
        {/* Custom header without margin */}
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold tracking-tight whitespace-nowrap">Vault</h1>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="h-8 gap-2 rounded-md bg-white hover:bg-gray-50 border-gray-200">
                      <Image 
                        src="/gmail.png" 
                        alt="Gmail" 
                        width={16} 
                        height={12} 
                        className="flex-shrink-0" 
                      />
                      <span className="text-sm">Auto Sync Gmail</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-4 bg-white shadow-lg rounded-md border border-gray-200">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-black">Gmail Auto Sync</h4>
                      <p className="text-xs text-black">
                        Automatically extract all files from your Gmail account and upload them directly to your Vault for easy reference and searching.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button variant="outline" className="h-8 gap-2 rounded-md">
                <Plus className="h-4 w-4" />
                New Document
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t flex-1 min-h-0 h-[calc(100vh-9rem)]">
          {/* Left Column - Notes List */}
          <div className="lg:col-span-1 border-r flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b flex-shrink-0">
              {/* Replace unified search with two separate search boxes */}
              <div className="flex gap-2 mb-4">
                {/* Filter search box */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="filter-search-input"
                    placeholder="Search your Vault..."
                    className="pl-10 h-9 rounded-md w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* AI Search Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-md bg-white hover:bg-gray-50 border-gray-200"
                        onClick={() => {
                          setShowSearchResults(true);
                          // Focus a hidden input for keyboard entry
                          const hiddenInput = document.getElementById('semantic-search-hidden-input');
                          if (hiddenInput) {
                            (hiddenInput as HTMLInputElement).focus();
                          }
                        }}
                      >
                        <AILogo />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="p-2 bg-white rounded-md border border-gray-200">
                      <p className="text-xs text-black">Ask a question about your documents</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Hidden input to capture keyboard entry when AI button clicked */}
                <input
                  id="semantic-search-hidden-input"
                  type="text"
                  className="sr-only"
                  value={semanticSearchQuery}
                  onChange={handleSemanticSearch}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && semanticSearchQuery.trim() !== '') {
                      callKnowledgeChatFunction();
                      setSelectedNote(null);
                    }
                  }}
                />
              </div>

              {/* AI Search Dialog instead of dropdown */}
              {showSearchResults && (
                <div className="absolute mt-1 right-4 w-full max-w-md bg-white rounded-md border border-gray-200 shadow-lg z-10 semantic-search-container">
                  <div className="p-3 border-b flex items-center gap-2">
                    <AILogo />
                    <Input 
                      autoFocus
                      placeholder="Ask a question about your documents..."
                      className="rounded-md h-9"
                      value={semanticSearchQuery}
                      onChange={handleSemanticSearch}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && semanticSearchQuery.trim() !== '') {
                          callKnowledgeChatFunction();
                          setSelectedNote(null);
                        } else if (e.key === 'Escape') {
                          setShowSearchResults(false);
                        }
                      }}
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 rounded-md" 
                      onClick={() => setShowSearchResults(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {semanticSearchQuery.trim() === '' && recentSearches.length > 0 ? (
                    <div className="py-2">
                      <div className="px-3 pb-1">
                        <h4 className="text-xs font-medium text-muted-foreground">Recent searches</h4>
                      </div>
                      {recentSearches.map((search, index) => (
                        <div
                          key={index}
                          className="px-3 py-1.5 hover:bg-muted cursor-pointer flex items-center gap-2"
                          onClick={() => {
                            setSemanticSearchQuery(search);
                            callKnowledgeChatFunction();
                          }}
                        >
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm truncate">{search}</span>
                        </div>
                      ))}
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto py-1 scrollable">
                      {searchResults.map((result, index) => (
                        <div 
                          key={index} 
                          className="px-3 py-1.5 hover:bg-muted cursor-pointer"
                          onClick={() => {
                            const matchingNote = notes.find(note => note.title === result.title);
                            if (matchingNote) {
                              setSelectedNote(matchingNote);
                              setShowSearchResults(false);
                              setSemanticSearchQuery("");
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {getSearchResultIcon(result.type)}
                            <div>
                              <p className="text-sm font-medium">{result.title}</p>
                              <p className="text-xs text-muted-foreground">{result.summary}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : semanticSearchQuery.trim() !== "" ? (
                    <div className="py-4 px-3 text-center">
                      <p className="text-sm text-muted-foreground">No matching documents found</p>
                    </div>
                  ) : (
                    <div className="py-4 px-3 text-center">
                      <p className="text-sm text-muted-foreground">Type to search documents</p>
                    </div>
                  )}
                  
                  <div className="p-3 border-t">
                    <Button 
                      className={cn(
                        "w-full gap-1.5 rounded-md",
                        isLoadingKnowledgeChat && "bg-blue-400 text-white hover:bg-blue-400"
                      )}
                      size="sm"
                      disabled={semanticSearchQuery.trim() === '' || isLoadingKnowledgeChat}
                      onClick={(() => callKnowledgeChatFunction()) as unknown as React.MouseEventHandler<HTMLButtonElement>}
                    >
                      {isLoadingKnowledgeChat ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Searching Vault...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-3.5 w-3.5" />
                          <span>Search Vault</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="gmail" className="flex items-center justify-center gap-1">
                    <Image 
                      src="/gmail.png" 
                      alt="Gmail" 
                      width={16} 
                      height={12} 
                      className="flex-shrink-0" 
                    />
                    <span>Gmail</span>
                  </TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="other">Other</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
      
            <div className="flex-grow overflow-y-auto h-[calc(100%-8rem)] min-h-0 scrollbar-thin">
              <style jsx global>{`
                .scrollbar-thin {
                  scrollbar-width: thin;
                  scrollbar-color: rgba(203, 213, 225, 0.5) transparent;
                }
                .scrollbar-thin::-webkit-scrollbar {
                  width: 6px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                  background: transparent;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                  background-color: rgba(203, 213, 225, 0.5);
                  border-radius: 20px;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                  background-color: rgba(148, 163, 184, 0.7);
                }
              `}</style>
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
                        selectedNote?.id === note.id && "bg-muted",
                        note.inKnowledgeBase && "border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent" // Enhanced highlight for KB docs
                      )}
                      onClick={() => {
                        // Stop editing title if selecting a different note
                        if (isEditingTitle && selectedNote && selectedNote.id !== note.id) {
                          updateDocumentTitle();
                        }
                        setSelectedNote(note);
                      }}
                  >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-shrink">
                           {getNoteIcon(note)}
                           <div className="flex-1 min-w-0">
                            {isEditingTitle && selectedNote?.id === note.id ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <Input
                                  ref={listTitleInputRef}
                                  value={editedTitle}
                                  onChange={(e) => setEditedTitle(e.target.value)}
                                  onKeyDown={handleTitleInputKeyDown}
                                  onBlur={handleTitleInputBlur}
                                  className="text-sm font-medium h-6 py-0 px-1 rounded-md"
                                />
                        </div>
                            ) : (
                              <h3 
                                className="font-medium text-sm truncate"
                                onDoubleClick={(e) => {
                                e.stopPropagation();
                                  if (selectedNote?.id === note.id) {
                                    handleTitleDoubleClick(true);
                                  }
                                }}
                              >
                                {note.title}
                              </h3>
                            )}
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{note.summary || (note.fileName ? `File: ${note.fileName}` : 'No summary')}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <div className="flex items-center gap-1 mb-1">
                            <Badge variant="outline" className="text-xs capitalize whitespace-nowrap bg-gray-50 border-gray-200 px-2 py-0 h-5 font-medium rounded-md">
                              {note.type === 'pdf' ? 'PDF' : 
                               note.type === 'image' ? 'Image File' : 
                               note.type} 
                            </Badge>
                            {note.inKnowledgeBase ? (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 px-2 py-0 h-5 ml-1 font-medium rounded-md">
                                <Check className="h-3 w-3 mr-1" />Vault
                              </Badge>
                            ) : note.pendingKnowledgeBase ? (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200 px-2 py-0 h-5 ml-1 font-medium rounded-md">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />Vault
                              </Badge>
                            ) : null}
                            {note.origin === "gmail" && (
                              <div className="ml-1 flex items-center justify-center h-5 w-5">
                                <Image 
                                  src="/gmail.png" 
                                  alt="Gmail" 
                                  width={16} 
                                  height={12}
                                  className="object-contain" 
                                  title="Imported from Gmail"
                                />
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {safeFormatDate(note.createdAt, "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                        </div>
                      </div>
                      
          {/* Right Column - Note Detail */}
          <div className="lg:col-span-2 flex flex-col min-h-0 p-0">
            {selectedNote ? (
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                  <div>
                    {isEditingTitle ? (
                      <Input
                        ref={titleInputRef}
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyDown={handleTitleInputKeyDown}
                        onBlur={handleTitleInputBlur}
                        className="text-lg font-medium py-0 h-8 rounded-md"
                      />
                    ) : (
                      <h2 
                        className="text-lg font-medium cursor-text" 
                        onDoubleClick={() => handleTitleDoubleClick(false)}
                      >
                        {selectedNote.title}
                      </h2>
                    )}
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      {safeFormatDate(selectedNote.createdAt, "MMMM d, yyyy")} • {selectedNote.areaTitle}
                      {selectedNote.origin === "gmail" && (
                        <span className="flex items-center" title="Imported from Gmail">
                          <Image 
                            src="/gmail.png" 
                            alt="Gmail" 
                            width={16} 
                            height={12}
                            className="object-contain" 
                          />
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConnectionButton
                      initialText="Add to CS agent"
                      connectedText="Connected to CS agent"
                      isConnected={csAgentSelected}
                      onToggle={(connected) => {
                        setCsAgentSelected(connected);
                        setAnimatingCs(true);
                        setTimeout(() => setAnimatingCs(false), 500);
                      }}
                      type="cs"
                    />
                    
                    <ConnectionButton
                      initialText="Add to reward agent"
                      connectedText="Connected to reward agent"
                      isConnected={rewardAgentSelected}
                      onToggle={(connected) => {
                        setRewardAgentSelected(connected);
                        setAnimatingReward(true);
                        setTimeout(() => setAnimatingReward(false), 500);
                      }}
                      type="reward"
                    />
                    
                    {selectedNote.fileUrl && (
                      <>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1 rounded-md">
                              <Tag className="h-4 w-4" />
                              <span>{selectedNote.type}</span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Document Type</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => updateDocumentType("invoice")}
                              disabled={isUpdatingDocType || selectedNote.type === "invoice"}
                            >
                              <FileText className="h-4 w-4 text-green-500 mr-2" />
                              Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateDocumentType("pdf")}
                              disabled={isUpdatingDocType || selectedNote.type === "pdf"}
                            >
                              <FileIcon className="h-4 w-4 text-red-500 mr-2" />
                              PDF Document
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateDocumentType("image")}
                              disabled={isUpdatingDocType || selectedNote.type === "image"}
                            >
                              <ImageIcon className="h-4 w-4 text-blue-500 mr-2" />
                              Image
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateDocumentType("note")}
                              disabled={isUpdatingDocType || selectedNote.type === "note"}
                            >
                              <FileText className="h-4 w-4 text-yellow-500 mr-2" />
                              Note
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateDocumentType("other")}
                              disabled={isUpdatingDocType || selectedNote.type === "other"}
                            >
                              <FileQuestion className="h-4 w-4 text-purple-500 mr-2" />
                              Other Document
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button 
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <X className="h-4 w-4" />
                          <span>Delete</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Add Summary section right after the document header, before Similar Documents */}
                <div className="border-b bg-gradient-to-r from-blue-50 to-transparent">
                  <Collapsible defaultOpen={true} className="w-full">
                    <div className="px-6 py-3 flex items-center justify-between cursor-pointer">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full justify-between hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <h3 className="text-sm font-medium">Summary</h3>
                          </div>
                          <span className="text-xs bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-medium">
                            Powered by Tap Agent
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform ui-open:rotate-180" />
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="px-6 py-3 pt-0">
                        {selectedNote?.summary ? (
                          <div className="p-3 bg-white rounded-md border border-blue-100 shadow-sm">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedNote.summary}</p>
                          </div>
                        ) : (
                          <div className="p-3 bg-white rounded-md border border-gray-200 text-muted-foreground text-sm italic text-center">
                            No summary available for this document
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
                
                {/* Add Similar Documents section */}
                {selectedNote && (
                  <div className="border-b">
                    <div className="px-6 py-2 flex items-center justify-between">
                      <h3 className="text-xs font-medium flex items-center gap-1.5">
                        <Share2 className="h-3 w-3 text-muted-foreground" />
                        Similar Documents
                      </h3>
                      
                      {loadingRelated && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Finding similar...</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="px-4 pb-2">
                      {relatedError ? (
                        <div className="text-xs text-muted-foreground py-1 px-2">
                          {relatedError}
                        </div>
                      ) : loadingRelated ? (
                        <div className="flex gap-2 overflow-x-auto py-1 px-2 scrollbar-thin">
                          {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-7 w-40 flex-shrink-0" />
                          ))}
                        </div>
                      ) : relatedNotes.length > 0 ? (
                        <div className="flex flex-wrap gap-2 py-1">
                          {relatedNotes.map(note => (
                            <TooltipProvider key={note.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className="h-7 flex items-center bg-white border border-gray-100 rounded-full px-2 py-1 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-colors shadow-sm group"
                                    onClick={() => {
                                      const fullNote = notes.find(n => n.id === note.id);
                                      if (fullNote) {
                                        setSelectedNote(fullNote);
                                      }
                                    }}
                                  >
                                    {note.type === 'pdf' ? (
                                      <FileIcon className="h-3 w-3 text-red-500 flex-shrink-0 mr-1.5" />
                                    ) : note.type === 'image' ? (
                                      <ImageIcon className="h-3 w-3 text-blue-500 flex-shrink-0 mr-1.5" />
                                    ) : note.type === 'invoice' ? (
                                      <FileText className="h-3 w-3 text-green-500 flex-shrink-0 mr-1.5" />
                                    ) : (
                                      <FileText className="h-3 w-3 text-gray-500 flex-shrink-0 mr-1.5" />
                                    )}
                                    <span className="text-xs font-medium truncate min-w-[120px] max-w-[180px]">{note.title}</span>
                                    <Badge className="ml-1.5 text-[8px] py-0 h-3 px-1 rounded-md bg-blue-50 text-blue-600 border-blue-100">
                                      {Math.round(note.score * 100)}%
                                    </Badge>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-4 w-4 ml-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const fullNote = notes.find(n => n.id === note.id);
                                        if (fullNote && fullNote.fileUrl) {
                                          window.open(fullNote.fileUrl, '_blank');
                                        }
                                      }}
                                    >
                                      <ExternalLink className="h-2 w-2 text-gray-400" />
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[280px] p-3">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="text-sm font-medium">{note.title}</h4>
                                      <Badge className="text-[8px] py-0 h-3 px-1 rounded-md bg-primary/10 text-primary border-primary/20">
                                        {Math.round(note.score * 100)}% Match
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {note.summary || "No summary available for this document"}
                                    </p>
                                    <div className="flex justify-end pt-1">
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="h-5 p-0 text-xs text-blue-500"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const fullNote = notes.find(n => n.id === note.id);
                                          if (fullNote) {
                                            setSelectedNote(fullNote);
                                          }
                                        }}
                                      >
                                        View Document <ArrowRight className="h-3 w-3 ml-1" />
                                      </Button>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-center text-muted-foreground py-1">
                          No similar documents found
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="px-6 py-6 flex-grow overflow-y-auto">
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
            ) : showKnowledgeChatResponse ? (
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">Vault Search Results</h3>
                    <span className="text-sm bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-medium ml-2">
                      Powered By Tap Agent
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-md" 
                    onClick={() => setShowKnowledgeChatResponse(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5">
                  {isLoadingKnowledgeChat ? (
                    <div className="h-60 flex flex-col items-center justify-center">
                      {/* Updated loading indicator with thinking box from tap-agent-sheet */}
                      <div className="bg-white border border-gray-200 shadow-sm rounded-md p-6 mb-4 w-full max-w-xl animate-slowFadeIn">
                        <div className="flex items-center gap-3 mb-2">
                          <Search className="h-5 w-5 text-blue-500" />
                          <div className="flex items-center gap-1">
                            <h3 className="text-sm font-medium text-gray-900">Vault search in progress...</h3>
                            <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                          </div>
                        </div>
                        <div className="mt-1 flex flex-col items-start text-left py-2 pl-8">
                          <p className="text-xs animate-fade-in-out bg-gradient-to-r from-gray-400 to-gray-700 bg-clip-text text-transparent font-medium w-full text-left">
                            {getKnowledgeBaseProcessingMessage()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : knowledgeChatResponse ? (
                    <div 
                      className={cn(
                        "knowledge-response transition-opacity duration-700 ease-in-out",
                        isKnowledgeResponseVisible ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <div 
                        className="markdown-content rounded-md"
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-3 text-gray-900 border-b pb-1" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-900 border-b pb-1" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-5 mb-2 text-gray-900 border-b pb-1" {...props} />,
                            p: ({node, ...props}) => <p className="text-gray-800 mb-3" {...props} />,
                            ul: ({node, ...props}) => <ul className="my-3 pl-5 list-disc text-gray-800 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="my-3 pl-5 list-decimal text-gray-800 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="text-gray-800" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-3 text-gray-700 italic" {...props} />,
                            hr: ({node, ...props}) => <hr className="my-4 border-t border-gray-300" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                            em: ({node, ...props}) => <em className="text-gray-700" {...props} />,
                            code: ({node, inline, className, children, ...props}: any) => {
                              const match = /language-(\w+)/.exec(className || '')
                              return !inline && match ? (
                                <pre className="bg-gray-100 p-3 rounded-md my-3 overflow-x-auto">
                                  <code className={className} {...props}>
                                    {String(children).replace(/\n$/, '')}
                                  </code>
                                </pre>
                              ) : (
                                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded-sm text-sm font-mono" {...props}>
                                  {children}
                                </code>
                              )
                            },
                            a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                          }}
                        >
                          {knowledgeChatResponse?.answer}
                        </ReactMarkdown>
                      </div>
                      
                      {knowledgeChatResponse?.sources && knowledgeChatResponse.sources.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                          <h4 className="text-sm font-medium mb-3">Sources:</h4>
                          <ul className="space-y-2">
                            {knowledgeChatResponse.sources.map((source, i) => (
                              <li key={i} className="flex gap-2 items-start bg-gray-50 p-2 rounded-md border border-gray-200">
                                <div className="bg-primary/10 p-1.5 rounded-md">
                                  <File className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-sm">{source}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
                        <p>Query: "{knowledgeChatResponse?.metadata?.query || semanticSearchQuery}"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center">
                      <div className="text-center">
                        <FileQuestion className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No results found</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="px-6 py-3 border-t bg-gray-50 flex justify-between">
                  <div className="text-xs text-muted-foreground">
                    Powered by AI
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 text-sm rounded-md"
                    onClick={() => setShowKnowledgeChatResponse(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No document selected</h3>
                  <p className="text-muted-foreground">
                    Select a document from the list to view its contents or search to see results here
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
      
      {/* Delete File Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingFile}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteFile();
              }}
              disabled={deletingFile}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {deletingFile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Deleting...</span>
                </>
              ) : (
                'Delete file'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
} 