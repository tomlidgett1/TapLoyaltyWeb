"use client"

import { useState, useEffect, useRef, useMemo, memo } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, Timestamp, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, onSnapshot, getDoc, setDoc } from "firebase/firestore"
import { getStorage, ref, getDownloadURL, uploadBytesResumable } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, FileUp, X, DownloadCloud, ExternalLink, MoreHorizontal, Edit, Trash2, Check, FileText, File as FileIcon, Image as ImageIcon, Calendar, Filter, User, ArrowRight, Loader2 } from "lucide-react"
import { format, isValid } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Image from "next/image"
import { getFunctions, httpsCallable } from "firebase/functions"

// Define types we need
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
  type: "note" | "invoice" | "other" | "pdf" | "image";
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  originalFileName?: string;
  fileId?: string;
  contentType?: string;
  inKnowledgeBase?: boolean;
  pendingKnowledgeBase?: boolean;
  origin?: string;
}

// Add Knowledge chat response interface after the Note interface
interface KnowledgeChatResponse {
  answer: string;
  sources: string[];
  metadata: {
    contextCount: number;
    query: string;
  };
}

// Add the RelatedNote interface after the KnowledgeChatResponse interface
interface RelatedNote {
  id: string;
  title: string; 
  summary: string;
  type: "note" | "invoice" | "other" | "pdf" | "image";
  fileUrl?: string;
  fileName?: string;
  score: number;
}

// Apple-like smooth transition styles
const transitionStyles = `
  .smooth-appear {
    animation: smoothAppear 0.3s ease-out forwards;
  }
  
  @keyframes smoothAppear {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .scale-in {
    animation: scaleIn 0.3s ease-out forwards;
  }
  
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .document-container {
    transition: background-color 0.2s ease, border-color 0.2s ease;
    will-change: auto;
  }
  
  .document-container:hover {
    background-color: rgba(246, 246, 246, 0.7);
  }
  
  .document-container.selected {
    background-color: rgba(239, 246, 255, 0.6);
    border-color: rgba(191, 219, 254, 1);
  }
  
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: rgba(203, 213, 225, 0.3) transparent;
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: rgba(203, 213, 225, 0.3);
    border-radius: 20px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: rgba(203, 213, 225, 0.5);
  }
  
  /* Editor styles */
  .document-editor {
    width: 100%;
    height: 100%;
    outline: none;
    padding: 1.5rem;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #333;
    min-height: 300px;
  }
  
  .document-editor:empty:before {
    content: "Start typing your document...";
    color: #9ca3af;
    position: absolute;
    pointer-events: none;
  }
  
  .document-editor h1 {
    font-size: 1.75rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  
  .document-editor h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.75rem;
  }
  
  .document-editor p {
    margin-bottom: 0.75rem;
  }
  
  /* Smooth transitions between document selection */
  .detail-view-container {
    will-change: opacity;
    transition: opacity 0.2s ease-out;
  }
  
  .detail-view-container.fade-out {
    opacity: 0;
  }
  
  .detail-view-container.fade-in {
    opacity: 1;
  }
  
  /* Optimize renders by using contain */
  .document-list-container {
    contain: content;
  }
  
  /* AI response styles */
  .ai-response-container {
    animation: fadeIn 0.3s ease-out;
  }
`;

// Add the AI Logo component after interfaces
const AILogo = () => (
  <svg 
    width="16" 
    height="16" 
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

// Add memoized DocumentItem component
const DocumentItem = memo(({ 
  note, 
  isSelected, 
  onSelect, 
  formatDate 
}: { 
  note: Note; 
  isSelected: boolean; 
  onSelect: (note: Note) => void;
  formatDate: (date: Date, format: string) => string;
}) => {
  return (
    <div 
      className={cn(
        "p-3 cursor-pointer border bg-white rounded-md document-container transition-colors",
        isSelected ? "selected" : "border-transparent"
      )}
      onClick={() => onSelect(note)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {note.type === 'pdf' || (note.fileUrl && note.fileName?.toLowerCase().endsWith('.pdf')) ? (
            <FileIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
          ) : note.type === 'image' || (note.fileUrl && ['jpg', 'jpeg', 'png', 'gif'].some(ext => note.fileName?.toLowerCase().endsWith(ext))) ? (
            <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
          ) : note.type === 'invoice' ? (
            <FileText className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : note.type === 'note' ? (
            <FileText className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          ) : (
            <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{note.title}</h3>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {note.summary || (note.fileName ? note.fileName : 'No description')}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-4 rounded-full bg-gray-50 border-gray-200"
            >
              {note.type}
            </Badge>
            <span className="text-[10px] text-gray-400">
              {formatDate(note.createdAt, "MMM d, yyyy")}
            </span>
            {note.origin === "gmail" && (
              <span className="flex items-center" title="Imported from Gmail">
                <Image 
                  src="/gmail.png" 
                  alt="Gmail" 
                  width={12} 
                  height={9}
                  className="object-contain ml-1" 
                />
              </span>
            )}
            {note.inKnowledgeBase && (
              <Badge 
                className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-100 rounded-full"
              >
                <Check className="h-2 w-2" /> Vault
              </Badge>
            )}
            {note.pendingKnowledgeBase && (
              <Badge 
                className="flex items-center gap-0.5 text-xs ml-2 bg-amber-50 text-amber-600 border-amber-100 rounded-full"
              >
                <Loader2 className="h-2 w-2 animate-spin" /> Processing
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

DocumentItem.displayName = "DocumentItem";

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  
  // Upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSummary, setUploadSummary] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  
  // Title editing
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Knowledge Chat states
  const [searchMode, setSearchMode] = useState<"filter" | "semantic">("filter");
  const [semanticSearchQuery, setSemanticSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLoadingKnowledgeChat, setIsLoadingKnowledgeChat] = useState(false);
  const [knowledgeChatResponse, setKnowledgeChatResponse] = useState<KnowledgeChatResponse | null>(null);
  const [showKnowledgeChatResponse, setShowKnowledgeChatResponse] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
   
  // Related notes states
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  // Add document editor states
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  const [documentContent, setDocumentContent] = useState("");
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Add transition states
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Add state for showing AI response in main content
  const [showAiResponseInContent, setShowAiResponseInContent] = useState(false);
  
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
  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      setNotes([]);
      return;
    }
    
        setLoading(true);
      const notesRef = collection(db, `merchants/${user.uid}/files`);
        const notesQuery = query(notesRef, orderBy("createdAt", "desc"));
        
      const unsubscribe = onSnapshot(notesQuery, (querySnapshot) => {
        const notesData: Note[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
        // Convert Firestore timestamp to Date
          const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
            ? data.createdAt.toDate() 
            : new Date();
          
        // Determine file type
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
            type: noteType as Note['type'],
            fileUrl: data.fileUrl || "",
            fileType: fileTypeFromData,
            fileName: fileName,
            originalFileName: data.originalFileName || "",
            fileId: data.fileId || "",
            contentType: data.contentType || "",
            inKnowledgeBase: data.inKnowledgeBase === true,
          pendingKnowledgeBase: data.pendingKnowledgeBase === true,
          origin: data.origin || ""
        };
          
          notesData.push(note);
        });
        
        setNotes(notesData);
      
      // Run KB status check
      checkKnowledgeBaseStatus(notesData);
      
          setLoading(false);
      
      // Set the first note as selected by default if available
      if (notesData.length > 0 && !selectedNote) {
        setSelectedNote(notesData[0]);
      } else if (notesData.length === 0) {
        setSelectedNote(null);
      }
        }, (error) => {
          console.error("Error listening to notes collection:", error);
          toast({
            title: "Error",
        description: "Failed to load documents. Please try again.",
            variant: "destructive"
          });
          setLoading(false);
        });
        
    return () => unsubscribe();
  }, [user, selectedNote]);
  
  // Filter notes based on search query and active tab
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = searchQuery === "" || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesTab = activeTab === "all" || 
        (activeTab === "invoices" && note.type === "invoice") ||
        (activeTab === "notes" && note.type === "note") ||
        (activeTab === "gmail" && note.origin === "gmail") ||
        (activeTab === "other" && (note.type === "other" || note.type === "pdf" || note.type === "image"));
      
      return matchesSearch && matchesTab;
    });
  }, [notes, searchQuery, activeTab]);
  
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
                toast({
                  title: "Upload Error",
                  description: error.message,
                  variant: "destructive"
                });
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(storageRef);
              
              const notesRef = collection(db, `merchants/${user.uid}/files`);
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
                fileName: uniqueFileName,
                originalFileName: fileName,
                fileId: fileId,
                contentType
              };
              
              await addDoc(notesRef, noteData);
              
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
                description: "File uploaded, but failed to save document details.",
                variant: "destructive"
              });
              reject(firestoreError);
            }
          }
        );
      });
      
    } catch (error) {
      console.error("Error during upload process:", error);
        toast({
          title: "Upload failed",
        description: "An unexpected error occurred during the upload.",
          variant: "destructive"
        });
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
  
  // Function to get icon based on note type
  const getNoteIcon = (note: Note) => {
    if (note.type === 'pdf' || (note.fileUrl && note.fileName?.toLowerCase().endsWith('.pdf'))) {
      return <FileIcon className="h-4 w-4 text-red-500 flex-shrink-0" />;
    } else if (note.type === 'image' || (note.fileUrl && ['jpg', 'jpeg', 'png', 'gif'].some(ext => note.fileName?.toLowerCase().endsWith(ext)))) {
      return <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    } else if (note.type === 'invoice') {
      return <FileText className="h-4 w-4 text-green-500 flex-shrink-0" />;
    } else if (note.type === 'note') {
      return <FileText className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    }
    return <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />;
  };
  
  // Function to delete the current file/note
  const handleDeleteFile = async () => {
    if (!selectedNote || !user || !user.uid) return;
    
    try {
      setDeletingFile(true);
      
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
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
      
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingFile(false);
    }
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
  
  // Handle opening document in new tab
  const handleOpenInNewTab = () => {
    if (!selectedNote?.fileUrl) return;
    window.open(selectedNote.fileUrl, '_blank');
  };
  
  // Handle title editing
  const handleStartTitleEdit = () => {
    if (!selectedNote) return;
    setEditedTitle(selectedNote.title);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };
  
  // Handle title input key down
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateDocumentTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };
  
  // Render file preview
  const renderFilePreview = () => {
    if (!selectedNote?.fileUrl) return null;
    
    const fileUrl = selectedNote.fileUrl;
    const isPdf = selectedNote.type === 'pdf' || 
                  (selectedNote.type === 'invoice' && selectedNote.fileUrl) || 
                  (selectedNote.fileUrl && selectedNote.fileUrl.toLowerCase().endsWith('.pdf'));
                  
    const isImage = selectedNote.type === 'image' || (['jpg', 'jpeg', 'png', 'gif'].some(ext => 
      selectedNote.fileType?.toLowerCase() === ext || (selectedNote.fileUrl && selectedNote.fileUrl.toLowerCase().endsWith(`.${ext}`))));

    if (isPdf) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
          <iframe 
            src={fileUrl} 
            className="w-full h-full rounded-md"
          />
        </div>
      );
    } else if (isImage) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gray-50 rounded-lg">
          <img 
            src={fileUrl} 
            alt={selectedNote.title} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
          />
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg h-full bg-gray-50">
        <FileIcon className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-center text-gray-500 mb-4">
          Preview not available for this file type
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline" 
            size="sm"
            className="gap-2 rounded-md"
            onClick={handleDownload}
          >
            <DownloadCloud className="h-4 w-4" />
            <span>Download</span>
          </Button>
          
          <Button
            variant="outline" 
            size="sm"
            className="gap-2 rounded-md"
            onClick={handleOpenInNewTab}
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open</span>
          </Button>
        </div>
      </div>
    );
  };

  // Fix the handleNoteSelection function to prevent sidebar flashing
  const handleNoteSelection = (note: Note) => {
    if (note.id === selectedNote?.id) return;
    
    // First clear AI response view if it's showing
    if (showAiResponseInContent) {
      setShowAiResponseInContent(false);
    }
    
    // Just set transition state on the detail view
    setIsTransitioning(true);
    
    // Set selected note immediately to prevent sidebar re-rendering
    // This prevents the list from flashing
    setSelectedNote(note);
    
    // Use requestAnimationFrame to ensure smooth transition only on the content area
    requestAnimationFrame(() => {
      // After a brief moment, complete the transition
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    });
    
    // Also fetch related notes now
    if (note) {
      fetchRelatedNotes(note.id);
    }
  };
  
  // Update the knowledge chat function to show results in main content
  const callKnowledgeChatFunction = async () => {
    if (!semanticSearchQuery.trim() || !user?.uid) return;
    
    try {
      // Hide the selected note or document editor
      setSelectedNote(null);
      setShowDocumentEditor(false);
      
      // Show AI response in main content
      setShowAiResponseInContent(true);
      setIsLoadingKnowledgeChat(true);
      
      // Close any dialog
      setShowKnowledgeChatResponse(false);
      
      // Log request
      console.log('Knowledge Base Search:', {
        merchantId: user.uid,
        prompt: semanticSearchQuery
      });
      
      // Make API call to knowledge base
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
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('Response body:', responseText);
      
      // Handle multiple possible response formats
      try {
        const data = JSON.parse(responseText);
        
        if (data?.answer) {
          setKnowledgeChatResponse({
            answer: data.answer,
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
            answer: data.answer,
            sources: data.sources || [],
            metadata: data.metadata || { contextCount: 0, query: semanticSearchQuery }
          });
        } else if (data?.summary) {
          setKnowledgeChatResponse({ 
            answer: data.summary,
            sources: [],
            metadata: { contextCount: 0, query: semanticSearchQuery }
          });
        } else {
          throw new Error("Unexpected response format");
        }
        
        toast({
          title: "Search Complete",
          description: "Your document search has been processed",
          variant: "default"
        });
        
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error("Failed to parse response");
      }
    } catch (error) {
      console.error('Knowledge chat error:', error);
      
      setKnowledgeChatResponse({ 
        answer: `I encountered an error while searching your documents: ${error instanceof Error ? error.message : "Unknown error"}.\n\nPlease try again with a different search query.`,
        sources: [],
        metadata: { contextCount: 0, query: semanticSearchQuery }
      });
      
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search documents",
        variant: "destructive"
      });
    } finally {
      setIsLoadingKnowledgeChat(false);
    }
  };
  
  // Add function to fetch related notes
  const fetchRelatedNotes = async (noteId: string) => {
    if (!user || !user.uid) return;
    
    try {
      setLoadingRelated(true);
      
      const functions = getFunctions();
      const getRelatedNotesFunction = httpsCallable(functions, 'getRelatedNotes');
      
      const result = await getRelatedNotesFunction({
        merchantId: user.uid,
        noteId: noteId,
        limit: 3,
        minScore: 0.7
      });
      
      // Firebase functions return data in a 'data' property
      const data = result.data as { related: RelatedNote[] };
      setRelatedNotes(data.related || []);
    } catch (error) {
      console.error('Error fetching related notes:', error);
      setRelatedNotes([]);
    } finally {
      setLoadingRelated(false);
    }
  };
  
  // Modify the effect that fetches related notes to avoid unnecessary fetches
  useEffect(() => {
    if (selectedNote && !isTransitioning) {
      // Only fetch if we're not transitioning between notes
      // This prevents duplicate fetches from handleNoteSelection
    } else {
      setRelatedNotes([]);
    }
  }, [selectedNote, isTransitioning, user]);
  
  // Add function to handle creating a new document
  const handleNewDocument = () => {
    setSelectedNote(null);
    setShowKnowledgeChatResponse(false);
    setDocumentTitle("Untitled Document");
    setDocumentContent("");
    setShowDocumentEditor(true);
  };
  
  // Add function to save document
  const saveDocument = async () => {
    if (!user || !user.uid) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save documents.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSavingDocument(true);
      
      // Get content from editor
      const editorContent = editorRef.current?.innerHTML || "";
      const plainText = editorRef.current?.textContent || "";
      
      const notesRef = collection(db, `merchants/${user.uid}/files`);
      
      // Create document data
      const noteData = {
        title: documentTitle,
        summary: plainText.slice(0, 150) + (plainText.length > 150 ? '...' : ''),
        rawText: plainText,
        tags: [],
        areaId: "documents",
        areaTitle: "Documents",
        categoryId: "notes",
        categoryTitle: "Notes",
        createdAt: serverTimestamp(),
        type: "note",
        content: editorContent
      };
      
      await addDoc(notesRef, noteData);
      
      toast({
        title: "Document Saved",
        description: "Your document has been saved successfully.",
      });
      
      // Close editor and update UI
      setShowDocumentEditor(false);
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        title: "Save Error",
        description: "Failed to save your document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingDocument(false);
    }
  };
  
  // Check knowledge base status
  const checkKnowledgeBaseStatus = async (notesData: Note[]) => {
    if (!user?.uid) return;
    
    try {
      // Create a batch of promises to check KB status
      const knowledgeBasePromises = notesData
        .filter(note => note.fileName || note.originalFileName)
        .map(async (note) => {
          if (note.inKnowledgeBase === true) {
            return { noteId: note.id, isInKnowledgeBase: true, isPending: false };
          }
          
          // Check the knowledge base collection for this file
          const kbRef = collection(db, `merchants/${user.uid}/knowledgebase`);
          const kbQuery = query(kbRef, orderBy("createTime", "desc")); 
          const kbSnapshot = await getDocs(kbQuery);
          
          let isInKnowledgeBase = false;
          let isPending = note.pendingKnowledgeBase || false;
          
          kbSnapshot.forEach((docSnap) => {
            const kbData = docSnap.data();
            
            const isMatch = (note.fileId && kbData.fileId === note.fileId) ||
              ((note.fileName && (kbData.source?.includes(note.fileName) || kbData.fileName === note.fileName)) ||
               (note.originalFileName && (kbData.source?.includes(note.originalFileName) || kbData.fileName === note.originalFileName)));
                
            if (isMatch && kbData.status === "success") {
              isInKnowledgeBase = true;
              isPending = false;
            } else if (isMatch && (kbData.status === "pending" || kbData.status === "processing")) {
              isPending = true;
            }
          });
          
          return { noteId: note.id, isInKnowledgeBase, isPending };
        });
      
      // Wait for all promises to resolve
      const results = await Promise.all(knowledgeBasePromises);
      
      // Update notes with KB status
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
    } catch (error) {
      console.error("Error checking knowledge base status:", error);
    }
  };
  
  return (
    <DashboardLayout>
      {/* Apply custom styles */}
      <style dangerouslySetInnerHTML={{ __html: transitionStyles }} />
      
      <div className="flex flex-col h-full max-w-full">
        {/* Header */}
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <div className="flex items-center">
                  {searchMode === "filter" ? (
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <AILogo />
                        </div>
                      )}
                  <Input 
                    ref={searchInputRef}
                    placeholder={searchMode === "filter" ? "Search documents..." : "Ask about your documents..."}
                    className="pl-10 h-9 rounded-md w-full pr-24"
                    value={searchMode === "filter" ? searchQuery : semanticSearchQuery}
                    onChange={(e) => {
                      if (searchMode === "filter") {
                        setSearchQuery(e.target.value);
                          } else {
                        setSemanticSearchQuery(e.target.value);
                      }
                    }}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchMode === "semantic") {
                      callKnowledgeChatFunction();
                    }
                  }}
                />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-5 px-2 text-xs rounded-md"
                      onClick={() => {
                        setSearchMode(prev => prev === "filter" ? "semantic" : "filter");
                        setTimeout(() => searchInputRef.current?.focus(), 0);
                      }}
                    >
                      {searchMode === "filter" ? "Filter Mode" : "Ask AI"}
                    </Button>
                  </div>
                      </div>
                        </div>
              
                    <Button 
                variant="outline" 
                className="h-9 gap-2 rounded-md"
                onClick={handleNewDocument}
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </Button>
              <Button 
                className="h-9 gap-2 rounded-md"
                onClick={() => setUploadDialogOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                <span>Upload</span>
                    </Button>
                  </div>
                </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t flex-1 min-h-0 h-[calc(100vh-9rem)]">
          {/* Left Column - Document List */}
          <div className="lg:col-span-1 border-r flex flex-col h-full overflow-hidden bg-gray-50/50">
            <div className="p-4 border-b flex-shrink-0">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="other">Other</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
      
            <div className="flex-grow overflow-y-auto h-[calc(100%-4rem)] min-h-0 scrollbar-thin p-1 document-list-container">
      {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="border bg-white rounded-lg p-3 smooth-appear" style={{ animationDelay: `${i * 0.1}s` }}>
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
                  <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <h3 className="font-medium mb-1">No documents found</h3>
                  <p className="text-sm text-gray-500">
                    {searchQuery ? "Try adjusting your search" : "Upload or create a new document"}
          </p>
        </div>
      ) : (
                <div className="space-y-2 p-2">
                  {filteredNotes.map(note => (
                    <DocumentItem
                      key={note.id}
                      note={note}
                      isSelected={selectedNote?.id === note.id}
                      onSelect={handleNoteSelection}
                      formatDate={safeFormatDate}
                    />
                  ))}
                </div>
              )}
                        </div>
                      </div>
                      
          {/* Right Column - Document Detail */}
          <div className="lg:col-span-2 flex flex-col min-h-0 p-0 overflow-hidden">
            {showAiResponseInContent ? (
              <div className="flex flex-col h-full ai-response-container">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AILogo />
                    <h2 className="text-lg font-medium">AI Search Results</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-50 text-blue-600 border-blue-100">
                      Query: {semanticSearchQuery}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 rounded-md"
                      onClick={() => setShowAiResponseInContent(false)}
                    >
                      <X className="h-4 w-4" />
                      <span>Close</span>
                    </Button>
                  </div>
                </div>
                
                <div className="flex-grow overflow-auto p-6">
                  {isLoadingKnowledgeChat ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-blue-600">Searching your documents...</p>
                    </div>
                  ) : knowledgeChatResponse ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="bg-white p-6 rounded-lg border shadow-sm">
                        {knowledgeChatResponse.answer.split('\n').map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                      
                      {knowledgeChatResponse.sources && knowledgeChatResponse.sources.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium mb-3">Sources:</h4>
                          <div className="space-y-2">
                            {knowledgeChatResponse.sources.map((source, i) => (
                              <div key={i} className="flex items-start gap-2 bg-gray-50 p-3 rounded-md border">
                                <FileIcon className="h-4 w-4 text-blue-500 mt-0.5" />
                                <div className="text-sm">{source}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-500">No results found</p>
                    </div>
                  )}
                </div>
              </div>
            ) : showDocumentEditor ? (
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <Input
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                      className="text-lg font-medium py-0 h-9 rounded-md"
                      placeholder="Document title"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="h-9 rounded-md"
                      onClick={() => setShowDocumentEditor(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="h-9 rounded-md"
                      onClick={saveDocument}
                      disabled={isSavingDocument}
                    >
                      {isSavingDocument ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex-grow overflow-auto p-0 relative">
                  <div
                    ref={editorRef}
                    className="document-editor"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                  />
                </div>
              </div>
            ) : selectedNote ? (
              <div 
                className={`flex flex-col h-full detail-view-container ${isTransitioning ? 'fade-out' : 'fade-in'}`}
                style={{ 
                  transitionDuration: isTransitioning ? '150ms' : '250ms',
                  willChange: 'opacity'
                }}
              >
                <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    {isEditingTitle ? (
                      <Input
                        ref={titleInputRef}
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyDown={handleTitleKeyDown}
                        onBlur={updateDocumentTitle}
                        className="text-lg font-medium py-0 h-9 rounded-md"
                      />
                    ) : (
                      <h2 
                        className="text-lg font-medium truncate cursor-text" 
                        onDoubleClick={handleStartTitleEdit}
                      >
                        {selectedNote.title}
                      </h2>
                    )}
                    <div className="flex items-center mt-1 gap-3">
                      <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                        <Calendar className="h-3.5 w-3.5" />
                        {safeFormatDate(selectedNote.createdAt, "MMMM d, yyyy")}
                      {selectedNote.origin === "gmail" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center ml-2">
                          <Image 
                            src="/gmail.png" 
                            alt="Gmail" 
                                    width={14} 
                                    height={10}
                            className="object-contain" 
                          />
                        </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">Imported from Gmail</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {selectedNote.inKnowledgeBase && (
                          <Badge 
                            className="flex items-center gap-0.5 text-xs ml-2 bg-blue-50 text-blue-600 border-blue-100"
                          >
                            <Check className="h-3 w-3" /> In Vault
                          </Badge>
                        )}
                        {selectedNote.pendingKnowledgeBase && (
                          <Badge 
                            className="flex items-center gap-0.5 text-xs ml-2 bg-amber-50 text-amber-600 border-amber-100"
                          >
                            <Loader2 className="h-3 w-3 animate-spin" /> Processing
                          </Badge>
                        )}
                  </div>
                      {selectedNote.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {selectedNote.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs bg-gray-100 border-0">
                              {tag}
                            </Badge>
                          ))}
                          {selectedNote.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{selectedNote.tags.length - 2}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-md text-gray-500"
                            onClick={handleStartTitleEdit}
                          >
                            <Edit className="h-4 w-4" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit title</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {selectedNote.fileUrl && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-md text-gray-500"
                                onClick={handleDownload}
                              >
                                <DownloadCloud className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-md text-gray-500"
                                onClick={handleOpenInNewTab}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open in new tab</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                    
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-md text-gray-500"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                          className="gap-2 cursor-pointer"
                          onClick={handleStartTitleEdit}
                            >
                          <Edit className="h-4 w-4" />
                          <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                          className="gap-2 cursor-pointer"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                  </div>
                </div>
                
                <div className="flex-grow overflow-auto p-6">
                  <div className="animate-in scale-in duration-300 h-full">
                    {renderFilePreview()}
                          </div>
                </div>
                
                {/* Add Similar Documents section */}
                {selectedNote && relatedNotes.length > 0 && (
                  <div className="px-6 py-3 border-t">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
                        Similar Documents
                      </h3>
                    <div className="flex flex-wrap gap-2">
                          {relatedNotes.map(note => (
                            <TooltipProvider key={note.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 text-xs rounded-md bg-gray-50 border-gray-200 flex items-center gap-1"
                              onClick={() => {
                                const fullNote = notes.find(n => n.id === note.id);
                                if (fullNote) {
                                    handleNoteSelection(fullNote);
                                }
                              }}
                            >
                                {note.type === 'pdf' ? (
                                  <FileIcon className="h-3.5 w-3.5 text-red-500" />
                                ) : note.type === 'image' ? (
                                  <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                                ) : note.type === 'invoice' ? (
                                  <FileText className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                                )}
                                <span className="truncate max-w-[150px]">{note.title}</span>
                                </Button>
                                </TooltipTrigger>
                            <TooltipContent side="top" className="p-3 max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{note.title}</p>
                                <p className="text-xs text-gray-500">{note.summary || "No description available"}</p>
                                <div className="flex justify-between items-center pt-1">
                                  <Badge className="bg-blue-50 text-blue-600 border-blue-100">
                                        {Math.round(note.score * 100)}% Match
                                      </Badge>
                        </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                    </div>
                  </div>
                )}
                
                {selectedNote.summary && (
                  <div className="px-6 py-4 border-t bg-gray-50">
                    <div className="text-sm text-gray-700">
                      <h4 className="font-medium mb-1 text-gray-900">Summary</h4>
                      <p>{selectedNote.summary}</p>
            </div>
        </div>
      )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center max-w-md fade-in">
                  <FileText className="h-12 w-12 mx-auto text-gray-200 mb-6" />
                  <h3 className="text-xl font-medium mb-3">Select a document</h3>
                  <p className="text-gray-500 mb-6">
                    Choose a document from the list to view its contents, or create a new document to get started.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                      variant="outline"
                      className="gap-2"
                    onClick={handleNewDocument}
                  >
                    <Plus className="h-4 w-4" />
                      <span>Create Document</span>
                    </Button>
                    <Button 
                      className="gap-2"
                      onClick={() => setUploadDialogOpen(true)}
                    >
                      <FileUp className="h-4 w-4" />
                      <span>Upload Document</span>
                  </Button>
                  </div>
                </div>
              </div>
            )}
            </div>
        </div>
      </div>
      
      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a document to your collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                <p className="text-xs text-gray-500">
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
              <Label htmlFor="summary">Description (optional)</Label>
              <Textarea
                id="summary"
                value={uploadSummary}
                onChange={(e) => setUploadSummary(e.target.value)}
                placeholder="Brief description of the document"
                className="resize-none"
                rows={2}
      />
    </div>
            
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="Separate tags with commas"
              />
            </div>
            
            {uploadProgress > 0 && (
              <div className="w-full">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center mt-1 text-gray-500">
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
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedNote?.title}"? This action cannot be undone.
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
              className="bg-red-500 text-white hover:bg-red-600 gap-2"
            >
              {deletingFile ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
} 