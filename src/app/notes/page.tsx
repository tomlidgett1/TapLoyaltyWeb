"use client"

import { useEffect, useState, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, Timestamp, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { getStorage, ref, getDownloadURL, uploadBytesResumable } from "firebase/storage"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar, Tag, Clock, FileText, Filter, ChevronDown, Eye, ArrowRight, LayoutGrid, MessageSquare, Gift, Plus, FileUp, Inbox, FileImage, FilePlus, FileQuestion, Check, Loader2, Image as ImageIcon, File as FileIcon, ChevronLeft, ChevronRight as ChevronRightIcon, ZoomIn, ZoomOut, Download, CornerDownLeft, File, ChevronRight, MoreVertical, PlusCircle, PlusIcon, Upload, X } from "lucide-react"
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
import { AnimatedCheckbox, ConnectionButton } from "@/components/ui/checkbox"

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
  contentType?: string;
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

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
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
    const fetchNotes = async () => {
    if (!user || !user.uid) {
      setLoading(false);
      setNotes([]);
      return;
    }
    
      try {
        setLoading(true);
      const notesRef = collection(db, `customers/${user.uid}/ThoughtsX`);
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
      } else if (notesData.length === 0) {
        setSelectedNote(null);
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
    if (user && user.uid) {
    fetchNotes();
    }
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
    const isPdf = selectedNote.type === 'pdf' || (selectedNote.fileUrl && selectedNote.fileUrl.toLowerCase().endsWith('.pdf'));
    const isImage = selectedNote.type === 'image' || (['jpg', 'jpeg', 'png', 'gif'].some(ext => 
      selectedNote.fileType?.toLowerCase() === ext || (selectedNote.fileUrl && selectedNote.fileUrl.toLowerCase().endsWith(`.${ext}`))));

    if (isPdf) {
      return (
        <div ref={pdfViewerContainerRef} className="w-full h-full overflow-y-auto rounded-md">
          {pdfLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading PDF...</span>
            </div>
          ) : (
            <>
              {/* Fallback to object tag which can sometimes bypass CORS */}
              <object 
                data={fileUrl} 
                type="application/pdf" 
                width="100%" 
                height="100%" 
                className="w-full h-full min-h-[500px] rounded-md"
              >
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FileIcon className="h-12 w-12 text-red-500 mb-4" />
                  <h3 className="font-medium mb-2">Unable to display PDF</h3>
                  <p className="text-sm text-muted-foreground mb-4">Your browser couldn't display this PDF due to security restrictions.</p>
                  <div className="flex gap-3">
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
                </div>
              </object>
            </>
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
      let fileType = fileExtension;
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

      const storage = getStorage();
      const storageRef = ref(storage, `customers/${user.uid}/documents/${Date.now()}_${uploadFile.name}`);
      
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
              
              const notesRef = collection(db, `customers/${user.uid}/ThoughtsX`);
              const tags = uploadTags.split(',').map(tag => tag.trim()).filter(tag => tag);
              
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
                fileName,
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
      const noteRef = doc(db, `customers/${user.uid}/ThoughtsX`, selectedNote.id);
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
      const noteRef = doc(db, `customers/${user.uid}/ThoughtsX`, selectedNote.id);
      
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
      const noteRef = doc(db, `customers/${user.uid}/ThoughtsX`, selectedNote.id);
      
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
        } else if (data?.success && data?.summary) {
          setKnowledgeChatResponse({ 
            answer: data.summary,
            sources: [],
            metadata: { contextCount: 0, query: semanticSearchQuery }
          });
        } else if (data?.success && data?.answer) {
          setKnowledgeChatResponse({ 
            ...data,
            answer: data.answer,
            sources: data.sources || [],
            metadata: data.metadata || { contextCount: 0, query: semanticSearchQuery }
          });
        } else if (data?.result?.summary) {
          setKnowledgeChatResponse({ 
            answer: data.result.summary,
            sources: [],
            metadata: { contextCount: 0, query: semanticSearchQuery } 
          });
        } else if (data?.summary) {
          setKnowledgeChatResponse({ 
            answer: data.summary,
            sources: [],
            metadata: { contextCount: 0, query: semanticSearchQuery }
          });
        } else if (data?.error) {
          throw new Error(data.error);
        } else {
          // Fallback for any other format
          setKnowledgeChatResponse({ 
            answer: typeof data === 'string' ? data : JSON.stringify(data),
            sources: [],
            metadata: { contextCount: 0, query: semanticSearchQuery }
          });
        }
        
        toast({
          title: "Knowledge Search Complete",
          description: "Your search has been processed successfully",
          variant: "default"
        });
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Failed to parse response text:', responseText);
        throw new Error('Failed to parse response as JSON');
      }
    } catch (error) {
      console.error('❌ Knowledge chat error:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      toast({
        title: "Error",
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
  
  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Custom header without margin */}
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold tracking-tight whitespace-nowrap">Notes</h1>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t flex-1 min-h-0">
          {/* Left Column - Notes List */}
          <div className="lg:col-span-1 border-r flex flex-col">
            <div className="p-4 border-b flex-shrink-0">
              {/* Unified search box */}
              <div className="relative mb-4">
                <div className="flex items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="unified-search-input"
                      placeholder={searchMode === "filter" ? "Search notes..." : "Ask a question about your documents..."}
                      className={`pl-10 ${searchMode === "filter" ? "pr-[110px]" : "pr-12"} h-9 rounded-md`}
                      value={searchMode === "filter" ? searchQuery : semanticSearchQuery}
                      onChange={(e) => {
                        if (searchMode === "filter") {
                          setSearchQuery(e.target.value);
                        } else {
                          handleSemanticSearch(e);
                        }
                      }}
                      onFocus={() => {
                        if (searchMode === "semantic" && semanticSearchQuery.trim() !== "") {
                          setShowSearchResults(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (searchMode === "semantic" && e.key === 'Enter') {
                          callKnowledgeChatFunction();
                          setSelectedNote(null);
                        }
                      }}
                    />
                    
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      {searchMode === "filter" ? (
                        <button
                          type="button"
                          className="text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded-sm bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-1"
                          onClick={() => setSearchMode("semantic")}
                          title="Switch to AI search (⌘/)"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>Ask a question</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-primary font-medium px-2 py-1 rounded-sm hover:bg-gray-100 transition-colors flex items-center gap-1"
                            onClick={() => setSearchMode("filter")}
                            title="Switch to filter search (⌘/)"
                          >
                            <Filter className="h-3 w-3" />
                            <span>Filter</span>
                          </button>
                          <kbd className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-muted-foreground/20 opacity-70">
                            <span className="text-xs">⏎</span>
                          </kbd>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Semantic search results dropdown */}
              {searchMode === "semantic" && showSearchResults && (
                <div className="absolute mt-1 w-full bg-white rounded-md border border-gray-200 shadow-lg z-10 left-0 right-0 max-w-md semantic-search-container">
                  <div className="p-2 border-b">
                    <h3 className="text-xs font-medium text-muted-foreground">Similar documents</h3>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto py-1 scrollable">
                      {searchResults.map((result, index) => (
                        <div 
                          key={index} 
                          className="px-2 py-1.5 hover:bg-muted cursor-pointer"
                          onClick={() => {
                            // Find the note that matches this result and select it
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
                    <div className="py-4 px-2 text-center">
                      <p className="text-sm text-muted-foreground">No matching documents found</p>
                    </div>
                  ) : recentSearches.length > 0 ? (
                    <div className="py-2">
                      <div className="px-2 pb-1">
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
                  ) : (
                    <div className="py-4 px-2 text-center">
                      <p className="text-sm text-muted-foreground">Type to search documents</p>
                    </div>
                  )}
                  <div className="p-2 border-t">
                    <button 
                      className="w-full text-xs text-primary hover:underline text-left flex items-center gap-1.5"
                      onClick={() => {
                        callKnowledgeChatFunction();
                      }}
                    >
                      <Search className="h-3 w-3" />
                      <span>Press Enter to search all documents</span>
                      <span className="ml-auto text-muted-foreground">⏎</span>
                    </button>
                  </div>
                </div>
              )}
              
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="other">Other</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
      
            <div className="flex-grow overflow-y-auto">
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
                          <Badge variant="outline" className="text-xs capitalize mb-1 whitespace-nowrap">
                            {note.type === 'pdf' ? 'PDF Document' : 
                             note.type === 'image' ? 'Image File' : 
                             note.type} 
                            </Badge>
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
                    <p className="text-sm text-muted-foreground">
                      {safeFormatDate(selectedNote.createdAt, "MMMM d, yyyy")} • {selectedNote.areaTitle}
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
                  </div>
                </div>
                
                {/* Document Controls Bar */}
                {selectedNote.fileUrl && (
                  <div className="px-6 py-2 border-b flex items-center justify-between flex-shrink-0 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-2 rounded-md">
                            <Tag className="h-4 w-4" />
                            <span>Mark as {selectedNote.type}</span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
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
                        className="h-8 gap-2 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <X className="h-4 w-4" />
                        <span>Delete file</span>
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" onClick={handleZoomOut}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" onClick={handleZoomIn}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                      </Button>
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
                    <h3 className="font-medium">Knowledge Search Results</h3>
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
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full border-t-2 border-b-2 border-gray-200 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Search className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <p className="mt-4 text-muted-foreground">Analysing your documents...</p>
                    </div>
                  ) : knowledgeChatResponse ? (
                    <div>
                      <div 
                        className="markdown-content bg-[#f8f9fb] p-5 rounded-md border border-gray-200 shadow-sm"
                        dangerouslySetInnerHTML={{ 
                          __html: knowledgeChatResponse?.answer
                            // First, escape any HTML that might be in the content
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            
                            // Process markdown elements in the correct order
                            
                            // Headings with more modest spacing
                            .replace(/^### (.*?)$/gm, '<h3 class="text-lg font-medium mt-5 mb-2 text-gray-900 border-b pb-1">$1</h3>')
                            .replace(/^## (.*?)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 border-b pb-1">$1</h2>')
                            .replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-gray-900 border-b pb-1">$1</h1>')
                            
                            // Blockquotes with better spacing
                            .replace(/^> (.*?)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 py-1 my-3 text-gray-700 italic">$1</blockquote>')
                            
                            // Lists (unordered) with tighter spacing
                            .replace(/^\- (.*?)$/gm, '<li class="ml-5 text-gray-800">$1</li>')
                            
                            // Lists (ordered) with tighter spacing
                            .replace(/^\d+\. (.*?)$/gm, '<li class="ml-5 text-gray-800">$1</li>')
                            
                            // Process list items into proper list containers with minimal spacing
                            .replace(/<li class="ml-5 text-gray-800">(.*?)<\/li>/g, function(match) {
                              if (match.includes('1. ') || match.includes('2. ') || match.includes('3. ')) {
                                return '<ol class="my-3 pl-1 list-decimal text-gray-800">' + match + '</ol>';
                              } else {
                                return '<ul class="my-3 pl-1 list-disc text-gray-800">' + match + '</ul>';
                              }
                            })
                            
                            // Clean up consecutive lists
                            .replace(/<\/ul><ul class="my-3 pl-1 list-disc text-gray-800">/g, '')
                            .replace(/<\/ol><ol class="my-3 pl-1 list-decimal text-gray-800">/g, '')
                            
                            // Horizontal rule with better spacing
                            .replace(/^---$/gm, '<hr class="my-4 border-t border-gray-300">')
                            
                            // These inline text formatting should come before paragraph processing
                            // Bold text
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                            
                            // Italic text
                            .replace(/\*(.*?)\*/g, '<em class="text-gray-700">$1</em>')
                            
                            // Code blocks (inline) with improved appearance
                            .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
                            
                            // Links
                            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
                            
                            // Handle multiple line breaks for better paragraph spacing
                            .replace(/\n\n+/g, '</p><p class="text-gray-800 mb-3">')
                            .replace(/\n/g, '<br>')
                            
                            // Paragraphs - process last to avoid nested paragraphs
                            // Wrap content in paragraphs, but not if it's already a block element
                            .replace(/^([^<].+[^>])$/gm, '<p class="text-gray-800 mb-3">$1</p>')

                            // Process all remaining plain text into paragraphs and clean up
                            .replace(/<p><\/p>/g, '')
                            .replace(/<p><(h|ul|ol|blockquote|hr)/g, '<$1')
                            .replace(/(<\/h\d|<\/ul|<\/ol|<\/blockquote|<hr)><\/p>/g, '$1>')
                        }} 
                      />
                      
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
                        <p>Found {knowledgeChatResponse?.metadata?.contextCount || 0} relevant document chunks</p>
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