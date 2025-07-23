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
import { Search, Plus, FileUp, X, DownloadCloud, ExternalLink, MoreHorizontal, Edit, Trash2, Check, FileText, File as FileIcon, Image as ImageIcon, Calendar, Filter, User, ArrowDown, Loader2, PlusCircle, Pencil, Info, Users, Database, Network, GitBranch, Share2, GitMerge, Share, Workflow, Split, RectangleHorizontal, PanelRight, LayoutGrid, LayoutList, ChevronsRight, List as ListIcon, FileCode, Mic, MicOff, Settings, ChevronLeft } from "lucide-react"
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
import ReactMarkdown from "react-markdown"

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
  knowledgeBaseStatus?: "added" | "processing" | "deleted" | "removing" | null; // Track detailed status
  origin?: string;
  content?: string;
  sharedWithAgentId?: string;
  sharedWithAgentAt?: Timestamp;
  inCsVault?: boolean; // Add this property
  pendingCsVault?: boolean; // Add this property
  csVaultRemoving?: boolean; // Add this property
  pinned?: boolean; // Whether the note is pinned to the top
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
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    will-change: background-color, border-color, transform, box-shadow;
    border-width: 1px;
    margin-bottom: 6px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .document-container:hover {
    background-color: rgba(246, 246, 246, 0.9);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  }
  
  .document-container.selected {
    background-color: rgba(239, 246, 255, 0.8);
    border-color: rgba(191, 219, 254, 1);
    box-shadow: 0 2px 4px rgba(191, 219, 254, 0.3);
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
  
  /* Pulse animation for processing documents */
  @keyframes pulseGlow {
    0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.1); }
    70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
    100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  }
  
  .processing-pulse {
    animation: pulseGlow 1.5s infinite cubic-bezier(0.66, 0, 0, 1);
  }
  
  /* Enhanced Markdown Styles */
  .markdown-content {
    color: #333;
    line-height: 1.6;
  }
  
  .markdown-content h1 {
    font-size: 1.8rem;
    font-weight: 600;
    margin-top: 0.5rem; /* Reduced from 1.5rem */
    margin-bottom: 1rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid rgba(230, 230, 230, 0.8);
  }
  
  .markdown-content h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.4rem;
    margin-bottom: 0.8rem;
  }
  
  .markdown-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.2rem;
    margin-bottom: 0.6rem;
  }
  
  .markdown-content h4 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .markdown-content p {
    margin-bottom: 1rem;
  }
  
  .markdown-content ul, .markdown-content ol {
    margin-top: 0.5rem;
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }
  
  .markdown-content li {
    margin-bottom: 0.25rem;
  }
  
  .markdown-content blockquote {
    border-left: 3px solid #e2e8f0;
    padding-left: 1rem;
    color: #64748b;
    font-style: italic;
    margin: 1rem 0;
  }
  
  .markdown-content code {
    font-family: monospace;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-size: 0.9em;
  }
  
  .markdown-content pre {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 1rem 0;
  }
  
  .markdown-content pre code {
    background-color: transparent;
    padding: 0;
    font-size: 0.9rem;
    color: #333;
  }
  
  .markdown-content a {
    color: #3b82f6;
    text-decoration: none;
  }
  
  .markdown-content a:hover {
    text-decoration: underline;
  }
  
  .markdown-content img {
    max-width: 100%;
    border-radius: 0.375rem;
    margin: 1rem 0;
  }
  
  .markdown-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }
  
  .markdown-content table th,
  .markdown-content table td {
    border: 1px solid #e2e8f0;
    padding: 0.5rem;
    text-align: left;
  }
  
  .markdown-content table th {
    background-color: #f8fafc;
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
  
  /* Add styles for lists in the editor */
  .document-editor ul {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }
  
  .document-editor ul li {
    margin-bottom: 0.25rem;
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
  
  /* Custom dialog height */
  .custom-height-dialog {
    max-height: 98vh;
    overflow-y: auto;
  }
  
  /* Custom tooltip styles */
  .custom-tooltip {
    background-color: white;
    color: #333;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  /* Right-side drawer animation for Vault Info */
  .vault-info-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 500px;
    max-width: 90vw;
    background-color: white;
    box-shadow: -4px 0 15px rgba(0, 0, 0, 0.1);
    z-index: 50;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    overflow-y: auto;
  }
  
  .vault-info-drawer.open {
    transform: translateX(0);
  }
  
  .vault-info-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 49;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease-in-out;
  }
  
  .vault-info-backdrop.open {
    opacity: 1;
    pointer-events: all;
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

// Safe date formatting function moved outside the component for stable reference
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

// Simplify the DocumentItem component props
const DocumentItem = memo(({ 
  note, 
  isSelected, 
  onSelect, 
  formatDateFunction,
  isDeleting,
  onTogglePin
}: { 
  note: Note; 
  isSelected: boolean; 
  onSelect: (note: Note) => void;
  formatDateFunction: (date: Date | null, format: string) => string;
  isDeleting: boolean;
  onTogglePin: (noteId: string) => void;
}) => {
  return (
    <div 
      className={cn(
        "p-3 cursor-pointer border bg-white rounded-md document-container transition-colors group",
        isSelected ? "selected border-blue-300 shadow-sm" : "border-gray-200",
        note.type === 'invoice' ? "border-l-4 border-l-green-400" :
        note.type === 'pdf' ? "border-l-4 border-l-red-400" :
        note.type === 'image' ? "border-l-4 border-l-blue-400" :
        note.type === 'note' ? "border-l-4 border-l-yellow-400" : "",
        note.pendingKnowledgeBase ? "processing-pulse" : ""
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
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm truncate">{note.title}</h3>
            
            {/* Pin/unpin button */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 rounded-md -mr-1 ${note.pinned ? 'text-amber-500' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(note.id);
              }}
              title={note.pinned ? "Unpin" : "Pin to top"}
            >
              <svg 
                width="16"
                height="16"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 17v5" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
              </svg>
            </Button>
          </div>
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
              {formatDateFunction(note.createdAt, "MMM d, yyyy")}
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
            {/* Add deleting badge with highest priority */}
            {isDeleting && (
              <Badge 
                className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-red-50 text-red-600 border-red-100 rounded-full"
              >
                <Loader2 className="h-2 w-2 animate-spin" /> Deleting
              </Badge>
            )}
            {/* Status badges with priority order */}
            {!isDeleting && note.pendingKnowledgeBase && (
              <Badge 
                className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-100 rounded-full"
              >
                <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse mr-0.5"></span> Adding to Vault
              </Badge>
            )}
            {!isDeleting && !note.pendingKnowledgeBase && note.knowledgeBaseStatus === "removing" && (
              <Badge 
                className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-red-50 text-red-600 border-red-100 rounded-full"
              >
                <Loader2 className="h-2 w-2 animate-spin" /> Removing
              </Badge>
            )}
            {!isDeleting && !note.pendingKnowledgeBase && note.inKnowledgeBase && note.knowledgeBaseStatus !== "removing" && (
              <Badge 
                className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-100 rounded-full"
              >
                <Check className="h-2 w-2" /> Vault
              </Badge>
            )}
            {!isDeleting && note.inCsVault && (
              <Badge 
                className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-purple-50 text-purple-600 border-purple-100 rounded-full"
              >
                <Users className="h-2 w-2" /> CS Agent
              </Badge>
            )}
            {!isDeleting && note.csVaultRemoving && (
              <Badge 
                className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-red-50 text-red-600 border-red-100 rounded-full"
              >
                <Loader2 className="h-2 w-2 animate-spin" /> CS Removing
              </Badge>
            )}
            {!isDeleting && note.pendingCsVault && !note.inCsVault && (
              <Badge 
                className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-100 rounded-full"
              >
                <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse mr-0.5"></span> Adding to CS Agent
              </Badge>
            )}
            {note.pinned && (
              <Badge 
                className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-100 rounded-full"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="10" 
                  height="10" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="mr-0.5"
                >
                  <line x1="12" y1="17" x2="12" y2="22"></line>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                </svg>
                Pinned
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
  const initialLoadComplete = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  // Add new state for document type filter
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  
  // Add Knowledge Vault management states
  const [isAddingToVault, setIsAddingToVault] = useState(false);
  const [isRemovingFromVault, setIsRemovingFromVault] = useState(false);
  
  // Add Gmail sync state
  const [gmailSyncEnabled, setGmailSyncEnabled] = useState(false);
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSummary, setUploadSummary] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const [searchMode, setSearchMode] = useState<"filter" | "semantic">("filter");
  const [semanticSearchQuery, setSemanticSearchQuery] = useState("");
  const [isLoadingKnowledgeChat, setIsLoadingKnowledgeChat] = useState(false);
  const [knowledgeChatResponse, setKnowledgeChatResponse] = useState<KnowledgeChatResponse | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
   
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  const [documentContent, setDocumentContent] = useState(""); 
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showAiResponseInContent, setShowAiResponseInContent] = useState(false);

  // Add new state for showing summary
  const [showSummary, setShowSummary] = useState(false);
  const [showInlineSummary, setShowInlineSummary] = useState(false);

  // Add state for showing vault info
  const [showVaultInfo, setShowVaultInfo] = useState(false);

  // Add state for sending to CS Vault - add this with the other state declarations
  const [isSendingToCSVault, setIsSendingToCSVault] = useState(false);

  // Add state variable for tracking CS Vault removal status
  const [isRemovingFromCSVault, setIsRemovingFromCSVault] = useState(false);

  // Add a new state variable to track editing mode (add this near other state declarations around line ~586)
  const [isEditing, setIsEditing] = useState(false);

  // Add voice recording state - add near other state declarations around line ~586
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Add these near other state declarations
  const [debugMode, setDebugMode] = useState(false);
  const [debugTranscription, setDebugTranscription] = useState<any>(null);

  // Add these near other state declarations
  const [transcriptionResult, setTranscriptionResult] = useState<{
    title: string;
    content: string;
  } | null>(null);

  // Add these near other state declarations
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);

  // Add this near other state declarations
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Add these near other state declarations
  const [recordingDebugLog, setRecordingDebugLog] = useState<string[]>([]);
  const [audioFormat, setAudioFormat] = useState<"mp3" | "wav" | "webm">("mp3");
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioDataRef = useRef<Float32Array[]>([]);

  // Add drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Add some new state variables for PDF viewer controls
  const [pdfZoomLevel, setPdfZoomLevel] = useState(100);
  const [pdfRotation, setPdfRotation] = useState(0);

  // Add these near other state declarations
  const [deletingNotes, setDeletingNotes] = useState<string[]>([]);

  // Function to control PDF zoom
  const handlePdfZoom = (zoomIn: boolean) => {
    setPdfZoomLevel(prevZoom => {
      const newZoom = zoomIn ? prevZoom + 10 : prevZoom - 10;
      return Math.max(50, Math.min(200, newZoom)); // Limit zoom from 50% to 200%
    });
  };

  // Function to rotate PDF
  const handlePdfRotate = () => {
    setPdfRotation(prevRotation => (prevRotation + 90) % 360);
  };

  // Reset PDF view settings when switching documents
  useEffect(() => {
    setPdfZoomLevel(100);
    setPdfRotation(0);
  }, [selectedNote?.id]);

  // Fetch notes from Firestore - depends only on user
  useEffect(() => {
    if (!user || !user.uid) {
      setNotes([]);
      setLoading(false);
      initialLoadComplete.current = false;
      return;
    }
    
    if (!initialLoadComplete.current) {
        setLoading(true);
    }

      const notesRef = collection(db, `merchants/${user.uid}/files`);
        const notesQuery = query(notesRef, orderBy("createdAt", "desc"));
        
      const unsubscribe = onSnapshot(notesQuery, (querySnapshot) => {
      const notesData: Note[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        let noteType = data.type || "other";
        const fileName = data.fileName || "";
        const fileTypeFromData = data.fileType || fileName.split('.').pop()?.toLowerCase() || '';
        if (!data.type) {
          if (fileTypeFromData === 'pdf') noteType = fileName.toLowerCase().includes('invoice') ? "invoice" : "pdf";
          else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileTypeFromData)) noteType = "image";
          else if (['doc', 'docx', 'txt', 'md'].includes(fileTypeFromData)) noteType = "note";
        }
        return {
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
          knowledgeBaseStatus: data.knowledgeBaseStatus,
          origin: data.origin || "",
          content: data.content || "",
          sharedWithAgentId: data.sharedWithAgentId || "",
          sharedWithAgentAt: data.sharedWithAgentAt || serverTimestamp(),
          inCsVault: data.inCsVault === true, // Add this property
          pendingCsVault: data.pendingCsVault === true, // Add this line
          csVaultRemoving: data.csVaultRemoving === true // Add this line
        } as Note;
      });
        setNotes(notesData);
      checkKnowledgeBaseStatus(notesData);

      if (!initialLoadComplete.current) {
        setLoading(false);
        initialLoadComplete.current = true;
      }
        }, (error) => {
          console.error("Error listening to notes collection:", error);
      toast({ title: "Error", description: "Failed to load documents.", variant: "destructive" });
      if (!initialLoadComplete.current) {
          setLoading(false);
        initialLoadComplete.current = true;
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Manage selectedNote based on notes list changes
  useEffect(() => {
    if (selectedNote) {
      const isSelectedNoteStillPresent = notes.some(note => note.id === selectedNote.id);
      if (!isSelectedNoteStillPresent) {
        setSelectedNote(notes.length > 0 ? notes[0] : null);
      }
    } else {
      if (notes.length > 0) {
        setSelectedNote(notes[0]);
      }
    }
  }, [notes, selectedNote, setSelectedNote]);

  const filteredNotes = useMemo(() => {
    // First filter the notes based on search, type, and tab
    const filtered = notes.filter(note => {
      const matchesSearch = searchQuery === "" || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Apply type filter if set
      const matchesTypeFilter = !typeFilter || 
        (typeFilter === "notes" && note.type === "note") || 
        (typeFilter === "invoices" && note.type === "invoice") ||
        (typeFilter === "images" && note.type === "image") ||
        (typeFilter === "pdfs" && note.type === "pdf") ||
        (typeFilter === "other" && note.type === "other") ||
        (typeFilter === "gmail" && note.origin === "gmail");
      
      const matchesTab = 
        activeTab === "all" || 
        (activeTab === "vault" && (note.inKnowledgeBase || note.pendingKnowledgeBase)) ||
        (activeTab === "cs" && (note.inCsVault || note.pendingCsVault));
      
      return matchesSearch && matchesTab && matchesTypeFilter;
    });
    
    // Then sort the filtered notes with pinned notes at the top
    return [...filtered].sort((a, b) => {
      // First sort by pinned status (pinned notes come first)
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      // Then sort by creation date (newest first) as before
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [notes, searchQuery, activeTab, typeFilter]);

  // Function to handle document selection with vault processing indicator
  const handleNoteSelection = (note: Note) => {
    if (selectedNote?.id === note.id) {
      if (selectedNote !== note) setSelectedNote(note);
      return;
    }
    
    // Hide summary when changing documents
    setShowSummary(false);
    
    if (showAiResponseInContent) setShowAiResponseInContent(false);
    setIsTransitioning(true);
    setSelectedNote(note);
    
    requestAnimationFrame(() => {
      setTimeout(() => setIsTransitioning(false), 100);
    });
  };

  const checkKnowledgeBaseStatus = async (notesData: Note[]) => {
    if (!user?.uid) return;
    try {
      const results = await Promise.all(notesData
        .filter(note => note.fileName || note.originalFileName)
        .map(async (note) => {
          // Preserve deleted status - don't reprocess these
          if (note.knowledgeBaseStatus === "deleted") {
            return { 
              noteId: note.id, 
              isInKnowledgeBase: false, 
              isPending: false,
              knowledgeBaseStatus: "deleted" as const
            };
          }
          
          if (note.inKnowledgeBase) return { 
            noteId: note.id, 
            isInKnowledgeBase: true, 
            isPending: false,
            knowledgeBaseStatus: "added" as const
          };
          
          const kbRef = collection(db, `merchants/${user.uid}/knowledgebase`);
          const kbQuery = query(kbRef, orderBy("createTime", "desc")); 
          const kbSnapshot = await getDocs(kbQuery);
          let isInKnowledgeBase = false;
          let isPending = note.pendingKnowledgeBase || false;
          let status: Note['knowledgeBaseStatus'] = null;
          
          for (const docSnap of kbSnapshot.docs) {
            const kbData = docSnap.data();
            const isMatch = (note.fileId && kbData.fileId === note.fileId) ||
              ((note.fileName && (kbData.source?.includes(note.fileName) || kbData.fileName === note.fileName)) ||
              (note.originalFileName && (kbData.source?.includes(note.originalFileName) || kbData.fileName === note.originalFileName)));
                
            if (isMatch) {
              // If this was previously deleted but is now being reprocessed, make sure we clear the deleted status
              if (String(note.knowledgeBaseStatus) === "deleted" && note.pendingKnowledgeBase) {
                const noteRef = doc(db, `merchants/${user.uid}/files`, note.id);
                updateDoc(noteRef, { 
                  knowledgeBaseStatus: "processing"
                }).catch(error => {
                  console.error("Error updating document status from deleted to processing:", error);
                });
                
                // If this is the currently selected note, update it immediately in the UI
                if (selectedNote && selectedNote.id === note.id) {
                  setSelectedNote(prev => {
                    if (!prev) return null;
                    return {
                      ...prev, 
                      knowledgeBaseStatus: "processing"
                    };
                  });
                }
              }
              
              // If status is success, update the document
              if (kbData.status === "success") {
                isInKnowledgeBase = true;
                isPending = false;
                status = "added";
                
                // If the document's Firestore status doesn't match the actual status, update it
                if ((note.pendingKnowledgeBase || false) || !(note.inKnowledgeBase || false)) {
                  const noteRef = doc(db, `merchants/${user.uid}/files`, note.id);
                  updateDoc(noteRef, { 
                    pendingKnowledgeBase: false,
                    inKnowledgeBase: true,
                    knowledgeBaseStatus: "added"
                  }).catch(error => {
                    console.error("Error updating document status:", error);
                  });
                }
                
                break; 
              }
              if (kbData.status === "pending" || kbData.status === "processing") {
                isPending = true;
                status = "processing";
              }
              if (kbData.status === "deleted") {
                isInKnowledgeBase = false;
              isPending = false;
                status = "deleted";
                
                // Update the document in Firestore if needed
                if ((note.pendingKnowledgeBase || false) || (note.inKnowledgeBase || false)) {
                  const noteRef = doc(db, `merchants/${user.uid}/files`, note.id);
                  updateDoc(noteRef, { 
                    pendingKnowledgeBase: false,
                    inKnowledgeBase: false,
                    knowledgeBaseStatus: "deleted"
                  }).catch(error => {
                    console.error("Error updating document deletion status:", error);
                  });
                }
              }
            }
          }
          return { 
            noteId: note.id, 
            isInKnowledgeBase, 
            isPending,
            knowledgeBaseStatus: status
          };
        }));
        
      setNotes(prevNotes => {
        let changed = false;
        const updatedNotes = prevNotes.map(currentNote => {
          const result = results.find(r => r.noteId === currentNote.id);
          if (result && (
            // Don't override the deleted status
            currentNote.knowledgeBaseStatus !== "deleted" && (
              currentNote.inKnowledgeBase !== result.isInKnowledgeBase || 
              currentNote.pendingKnowledgeBase !== result.isPending ||
              currentNote.knowledgeBaseStatus !== result.knowledgeBaseStatus
            )
          )) {
            changed = true;
            return { ...currentNote, 
              inKnowledgeBase: result.isInKnowledgeBase,
              pendingKnowledgeBase: result.isPending,
              knowledgeBaseStatus: result.knowledgeBaseStatus
            };
          }
          return currentNote;
        });
        return changed ? updatedNotes : prevNotes;
      });
    } catch (error) {
      console.error("Error checking knowledge base status:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setUploadTitle(file.name.split('.').slice(0, -1).join('.'));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !user?.uid) {
      toast({ title: "Error", description: !uploadFile ? "No file selected." : "Authentication Error.", variant: "destructive" });
      return;
    }
      setUploading(true);
      setUploadProgress(0);
      
    try {
      // Determine the file type
      const fileExtension = uploadFile.name.split('.').pop()?.toLowerCase() || '';
      let noteType: Note['type'] = "other";
      if (fileExtension === 'pdf') {
        noteType = uploadFile.name.toLowerCase().includes('invoice') ? "invoice" : "pdf";
      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        noteType = "image";
      } else if (['doc', 'docx', 'txt', 'md'].includes(fileExtension)) {
        noteType = "note";
      }
      
      // Set content type
      const contentType = uploadFile.type || 'application/octet-stream';
      
      // Generate fileId 
      const fileId = uuidv4();
      
      // Upload to Firebase Storage using the fileId
      const storageRef = ref(getStorage(), `merchants/${user.uid}/files/${fileId}`);
      const uploadTask = uploadBytesResumable(storageRef, uploadFile, { contentType });
      
      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Handle progress
            setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          },
          (error) => {
            // Handle error
            toast({ title: "Upload Error", description: error.message, variant: "destructive" });
            reject(error);
          },
          async () => {
            try {
              // Get download URL after successful upload
              const downloadURL = await getDownloadURL(storageRef);
              
              // Create document in Firestore
              const notesRef = collection(db, `merchants/${user.uid}/files`);
              
              // Check if auto-add to CS Vault was requested
              const autoAddToCSVault = typeof window !== 'undefined' ? localStorage.getItem('auto_add_to_cs_vault') === 'true' : false;
              
              // Prepare document data
              const noteData = {
                title: uploadTitle || uploadFile.name,
                summary: uploadSummary,
                rawText: "", 
                tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
                areaId: "uploads",
                areaTitle: "Uploaded Documents",
                categoryId: "documents",
                categoryTitle: "Documents",
                createdAt: serverTimestamp(),
                type: noteType,
                fileUrl: downloadURL,
                fileType: fileExtension,
                fileName: fileId, // Set fileName to be the same as fileId
                originalFileName: uploadFile.name, // Keep the original file name here
                // Store the UUID as the fileId to match the Storage path
                fileId: fileId,
                contentType,
                content: "",
                // If auto-add to CS Vault was requested, mark it for processing
                pendingCsVault: autoAddToCSVault,
                sharedWithAgentId: autoAddToCSVault ? 'cs-vault' : '',
                pinned: false // Initialize as not pinned
              };
              
              // Save document to Firestore with a custom ID matching the Storage fileId
              await setDoc(doc(db, `merchants/${user.uid}/files`, fileId), noteData);
              
              // Reset form and show success message
              resetUploadForm();
              setUploadDialogOpen(false);
              
              if (autoAddToCSVault) {
                toast({ 
                  title: "Document uploaded", 
                  description: "Document is being added to CS Agent" 
                });
                
                // Clean up the flag
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('auto_add_to_cs_vault');
                }
                
                // Automatically send to CS Vault
                setTimeout(async () => {
                  try {
                    // Set the active tab to CS to show the user where the document is going
                    setActiveTab("cs");
                    
                    // Call the CS vault function 
                    const functions = getFunctions();
                    const sendToCSVaultFunction = httpsCallable(functions, 'csvault');
                    
                    // Send document details to the function
                    await sendToCSVaultFunction({
                      merchantId: user.uid,
                      documentId: fileId,
                      fileId: fileId,
                      title: uploadTitle || uploadFile.name,
                      type: noteType
                    });
                  } catch (error) {
                    console.error('Error sending to CS Vault:', error);
                    toast({
                      title: "Error",
                      description: "Document uploaded but failed to add to CS Agent",
                      variant: "destructive"
                    });
                  }
                }, 500);
              } else {
                toast({ title: "Document uploaded" });
              }
              
              resolve();
            } catch (e) {
              toast({ title: "Firestore Error", variant: "destructive" });
              reject(e);
            }
          }
        );
      });
    } catch (e) {
      toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
      setUploading(false);
      // Ensure flag is cleared
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auto_add_to_cs_vault');
      }
    }
  };
  
  const resetUploadForm = () => {
    setUploadFile(null); setUploadTitle(""); setUploadSummary(""); setUploadTags("");
    setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = "";
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auto_add_to_cs_vault');
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedNote || !user?.uid) return;
    setDeletingFile(true);
    // Add the note to the deletingNotes array
    setDeletingNotes(prev => [...prev, selectedNote.id]);
    
    try {
      // First remove the document from Knowledge Base and CS Vault if needed
      const functions = getFunctions();
      
      // Remove from Knowledge Base if it exists there
      if (selectedNote.inKnowledgeBase) {
        try {
          const removeFromKnowledgeBaseFunction = httpsCallable(functions, 'removeDocumentFromKnowledgeBase');
          await removeFromKnowledgeBaseFunction({
            merchantId: user.uid,
            fileId: selectedNote.id
          });
          console.log("Document removed from Knowledge Base before deletion");
        } catch (err) {
          console.error("Error removing document from Knowledge Base:", err);
        }
      }
      
      // Remove from CS Vault if it exists there
      if (selectedNote.inCsVault) {
        try {
          const removeFromCSVaultFunction = httpsCallable(functions, 'removeDocumentFromCustomerServiceVault');
          await removeFromCSVaultFunction({
            merchantId: user.uid,
            fileId: selectedNote.id,
            documentId: selectedNote.id
          });
          console.log("Document removed from CS Vault before deletion");
        } catch (err) {
          console.error("Error removing document from CS Vault:", err);
        }
      }
      
      // Now delete the actual document
      await deleteDoc(doc(db, `merchants/${user.uid}/files`, selectedNote.id));
      toast({ title: "Document deleted" });
      setDeleteDialogOpen(false);
      // selectedNote will be updated by useEffect due to notes change
    } catch (e) { 
      console.error("Error deleting document:", e);
      toast({ title: "Delete failed", variant: "destructive" }); 
    }
    finally { 
      // Remove the note from the deletingNotes array
      setDeletingNotes(prev => prev.filter(id => id !== selectedNote?.id));
      setDeletingFile(false); 
    }
  };

  const updateDocumentTitle = async () => {
    if (!selectedNote || !editedTitle.trim() || !user?.uid) return;
    setIsEditingTitle(false);
    try {
      const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
      await updateDoc(noteRef, { title: editedTitle });
      // Optimistic update for selectedNote, main list updates via snapshot
      setSelectedNote(prev => prev ? { ...prev, title: editedTitle } : null);
      toast({ title: "Title updated" });
    } catch (e) { toast({ title: "Update failed", variant: "destructive" }); }
  };
  
  const handleDownload = () => {
    if (!selectedNote?.fileUrl) return;
    const link = document.createElement('a');
    link.href = selectedNote.fileUrl;
    link.download = selectedNote.fileName || selectedNote.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleOpenInNewTab = () => {
    if (!selectedNote?.fileUrl) return;
    window.open(selectedNote.fileUrl, '_blank');
  };

  const handleStartTitleEdit = () => {
    if (!selectedNote) return;
    setEditedTitle(selectedNote.title);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0); // Focus after render
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') updateDocumentTitle();
    else if (e.key === 'Escape') setIsEditingTitle(false);
  };
  
  const renderFilePreview = () => {
    if (!selectedNote) return <div className="p-8 text-center">No document selected.</div>;
    
    const { fileUrl, type, fileType, title, content, rawText, summary } = selectedNote;
    
    // Render document content
    const renderDocumentContent = () => {
      // For notes with content but no file URL (like created notes)
      if (type === 'note' && (content || rawText) && !fileUrl) {
        return (
          <div className="w-full bg-white rounded-md shadow-sm p-4 md:p-6 relative border border-gray-200">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content || `<p>${rawText}</p>` }} />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-4 right-4 gap-1.5 rounded-md"
              onClick={editExistingNote}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
          </div>
        );
      }
      
      if (!fileUrl) return (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md h-full bg-gray-50">
          <FileIcon className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-center text-gray-500">Preview not available (no file URL).</p>
        </div>
      );

      const isPdf = type === 'pdf' || type === 'invoice' || fileUrl.toLowerCase().endsWith('.pdf');
      const isImage = type === 'image' || ['jpg', 'jpeg', 'png', 'gif'].some(ext => fileType?.toLowerCase() === ext || fileUrl.toLowerCase().endsWith(`.${ext}`));

      if (isPdf) {
        // Use Google Docs viewer to render PDFs without default viewer UI
        // This displays the raw PDF without browser plugins
        const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        
        return (
          <div className="flex flex-col h-full">
            {/* PDF Toolbar */}
            <div className="flex items-center justify-between px-2 md:px-4 py-2 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
              <div className="flex items-center space-x-1.5">
                <div className="hidden md:flex -space-x-1">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                </div>
                <div className="ml-0 md:ml-4 text-sm font-medium text-gray-600 truncate max-w-[150px] md:max-w-xs">
                  {title || 'Document'}
                </div>
              </div>
              <div className="flex items-center space-x-1 md:space-x-2">
                {/* Zoom Controls */}
                <div className="flex items-center bg-gray-100 rounded-md h-8 px-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => handlePdfZoom(false)}
                    disabled={pdfZoomLevel <= 50}
                    title="Zoom out"
                  >
                    <span className="text-gray-500 text-lg leading-none">−</span>
                  </Button>
                  <span className="text-xs font-medium text-gray-600 mx-1.5">{pdfZoomLevel}%</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => handlePdfZoom(true)}
                    disabled={pdfZoomLevel >= 200}
                    title="Zoom in"
                  >
                    <span className="text-gray-500 text-lg leading-none">+</span>
                  </Button>
                </div>
                
                {/* Rotate Button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={handlePdfRotate}
                  title="Rotate"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="text-gray-500"
                  >
                    <path d="M23 4v6h-6"></path>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                </Button>
                
                {/* Action Buttons */}
                <div className="flex space-x-1">
                  {/* Download Button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={handleDownload}
                    title="Download"
                  >
                    <DownloadCloud className="h-4 w-4 text-gray-500" />
                  </Button>
                  
                  {/* Open in New Tab Button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={handleOpenInNewTab}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* PDF Content - Using a Google Docs viewer approach */}
            <div className="flex-grow w-full h-full overflow-hidden">
              <div 
                className="w-full h-full"
                style={{ 
                  transform: `scale(${pdfZoomLevel / 100}) rotate(${pdfRotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-in-out',
                }}
              >
                <iframe
                  src={googleDocsUrl}
                  className="w-full h-full"
                  style={{ 
                    border: "none",
                    background: "white",
                    display: "block"
                  }}
                  frameBorder="0"
                  allowTransparency
                />
              </div>
            </div>
          </div>
        );
      }
      
      if (isImage) {
        return (
          <div className="h-full bg-[#FAFAFA] flex items-center justify-center p-4 rounded-md">
            <div className="max-w-full max-h-full overflow-hidden bg-white shadow-lg rounded-md">
              <img src={fileUrl} alt={title} className="max-w-full max-h-full object-contain" />
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md h-full bg-gray-50">
          <FileIcon className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-center text-gray-500 mb-4">Preview not available for this file type.</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDownload} className="gap-2 rounded-md"><DownloadCloud size={16}/>Download</Button>
            <Button variant="outline" onClick={handleOpenInNewTab} className="gap-2 rounded-md"><ExternalLink size={16}/>Open</Button>
          </div>
        </div>
      );
    };
    
    // Return content with summary section if enabled
    return (
      <div className="flex flex-col h-full">
        {showInlineSummary && summary && (
          <div className="mb-4 bg-white rounded-md border shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-medium text-blue-700">Document Summary</h3>
              </div>
              <Button 
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={toggleSummaryDisplay}
              >
                <X className="h-3.5 w-3.5 text-blue-500" />
              </Button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                {selectedNote.type === 'pdf' || (selectedNote.fileUrl && selectedNote.fileName?.toLowerCase().endsWith('.pdf')) ? (
                  <FileIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                ) : selectedNote.type === 'image' || (selectedNote.fileUrl && ['jpg', 'jpeg', 'png', 'gif'].some(ext => selectedNote.fileName?.toLowerCase().endsWith(ext))) ? (
                  <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : selectedNote.type === 'invoice' ? (
                  <FileText className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : selectedNote.type === 'note' ? (
                  <FileText className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                ) : (
                  <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                )}
                <span className="font-medium text-sm">{selectedNote.title}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge variant="outline" className="text-xs rounded-md">
                  {selectedNote.type}
                </Badge>
                <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs rounded-md">
                  {safeFormatDate(selectedNote.createdAt, "MMM d, yyyy")}
                </Badge>
                {selectedNote.origin === "gmail" && (
                  <Badge className="bg-red-50 text-red-600 border-red-100 text-xs rounded-md">
                    Gmail
                  </Badge>
                )}
                {selectedNote.inKnowledgeBase && (
                  <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-xs rounded-md">
                    Vault
                  </Badge>
                )}
                {selectedNote.inCsVault && (
                  <Badge 
                    className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-purple-50 text-purple-600 border-purple-100 rounded-full"
                  >
                    <Users className="h-2 w-2" /> CS Agent
                  </Badge>
                )}
              </div>
              
              {selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {selectedNote.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] rounded-md">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded-md border border-gray.100">
                {summary}
              </div>
            </div>
          </div>
        )}
        <div className={`flex-grow ${showInlineSummary ? 'h-[calc(100%-12rem)]' : 'h-full'}`}>
          {renderDocumentContent()}
        </div>
      </div>
    );
  };

  const callKnowledgeChatFunction = async () => {
    if (!semanticSearchQuery.trim() || !user?.uid) return;
    setSelectedNote(null); setShowDocumentEditor(false); 
    setShowAiResponseInContent(true); setIsLoadingKnowledgeChat(true);
    try {
      const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/knowledgeBase', 
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ merchantId: user.uid, prompt: semanticSearchQuery }) });
      if (!response.ok) throw new Error(await response.text() || response.statusText);
      const data = await response.json(); // Assume JSON response now
      if (data?.answer) setKnowledgeChatResponse({ answer: data.answer, sources: data.sources || [], metadata: data.metadata || { contextCount:0, query: semanticSearchQuery }});
      else if (data?.summary) setKnowledgeChatResponse({ answer: data.summary, sources: [], metadata: { contextCount:0, query: semanticSearchQuery }});
      else throw new Error("Unexpected AI response format");
      toast({ title: "Search Complete" });
    } catch (e: any) { 
      setKnowledgeChatResponse({ answer: `Error: ${e.message}`, sources:[], metadata: {contextCount:0, query: semanticSearchQuery}});
      toast({ title: "Search Failed", description: e.message, variant: "destructive" });
    }
    finally { setIsLoadingKnowledgeChat(false); }
  };

  const fetchRelatedNotes = async (noteId: string) => {
    if (!user?.uid) return;
    setLoadingRelated(true);
    try {
      const getRelatedNotesFunction = httpsCallable(getFunctions(), 'getRelatedNotes');
      const result = await getRelatedNotesFunction({ merchantId: user.uid, noteId, limit: 3, minScore: 0.7 });
      setRelatedNotes((result.data as { related: RelatedNote[] })?.related || []);
    } catch (e) { console.error('Error fetching related notes:', e); setRelatedNotes([]); }
    finally { setLoadingRelated(false); }
  };

  useEffect(() => {
    if (selectedNote && !isTransitioning) fetchRelatedNotes(selectedNote.id);
    else if (!selectedNote) setRelatedNotes([]);
  }, [selectedNote, isTransitioning, user]); // Added user

  const handleNewDocument = () => {
    setSelectedNote(null); 
    setShowAiResponseInContent(false);
    setDocumentTitle("Untitled Document"); 
    setDocumentContent("");
    setIsEditing(false); // Explicitly mark that we're not editing an existing document
    if (editorRef.current) editorRef.current.innerHTML = ""; // Clear editor content
    setShowDocumentEditor(true);
  };

  // Add text formatting functions
  const formatText = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const toggleBold = () => formatText('bold');
  const toggleUnderline = () => formatText('underline');
  const toggleBulletList = () => {
    if (editorRef.current) {
      // Focus the editor
      editorRef.current.focus();
      
      try {
        // Try the standard command first
        document.execCommand('insertUnorderedList', false);
      } catch (e) {
        console.error("Error inserting list:", e);
        
        // Fallback for browsers where the command might not work
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString();
          
          // Create a list element
          const listItem = document.createElement('li');
          listItem.textContent = selectedText || "List item";
          
          const unorderedList = document.createElement('ul');
          unorderedList.appendChild(listItem);
          
          // Replace the selection with our custom list
          range.deleteContents();
          range.insertNode(unorderedList);
          
          // Position cursor at the end of the inserted list item
          range.setStartAfter(listItem);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  };
  const changeTextSize = (size: string) => formatText('fontSize', size);

  const saveDocument = async () => {
    if (!user?.uid) { toast({ title: "Auth Error", variant:"destructive"}); return; }
    setIsSavingDocument(true);
    try {
      const content = editorRef.current?.innerHTML || "";
      const text = editorRef.current?.textContent || "";
      
      // Create initial document with basic data
      const noteData = {
        title: documentTitle, 
        summary: text.slice(0,150)+(text.length > 150 ? '...':''), 
        rawText: text,
        content: content, // Make sure content is saved
        tags: [], 
        areaId: "documents", 
        areaTitle: "Documents", 
        categoryId: "notes", 
        categoryTitle: "Notes",
        createdAt: serverTimestamp(), 
        type: "note" as Note['type'],
        origin: "editor", // Add origin to identify that this was created in the editor
        fileType: "txt", // Set fileType as text
        contentType: "text/html",
        pinned: false // Initialize as not pinned
      };
      
      // Save to Firestore and get the new document reference
      const docRef = await addDoc(collection(db, `merchants/${user.uid}/files`), noteData);
      
      // Update the document to set fileName and fileId to match the document ID
      await updateDoc(docRef, {
        fileName: docRef.id,
        fileId: docRef.id
      });
      
      // Create a temporary document object to set as selected
      const newNote: Note = {
        id: docRef.id,
        ...noteData,
        fileName: docRef.id, // Add fileName to match document ID
        fileId: docRef.id,   // Add fileId to match document ID
        createdAt: new Date(), // Use current date as temporary value until Firestore updates
        tags: []
      };
      
      // Close the editor
      setShowDocumentEditor(false);
      
      // Set the newly created document as selected
      setSelectedNote(newNote);
      
      // Reset editing mode
      setIsEditing(false);
      
      toast({ title: "Document Saved" });
    } catch (e) { 
      console.error("Error saving document:", e);
      toast({ title: "Save Error", variant: "destructive" }); 
    } finally { 
      setIsSavingDocument(false); 
    }
  };

  // Add a function to start editing an existing note
  const editExistingNote = () => {
    if (!selectedNote) return;
    
    setDocumentTitle(selectedNote.title);
    setDocumentContent(selectedNote.content || selectedNote.rawText || "");
    setIsEditing(true); // Explicitly mark that we're editing an existing document
    setShowDocumentEditor(true);
  };

  // Add function to update an existing note
  const updateExistingDocument = async () => {
    if (!user?.uid || !selectedNote) { 
      toast({ title: "Error", description: "Missing note or authentication", variant:"destructive"}); 
      return; 
    }
    
    setIsSavingDocument(true);
    try {
      const content = editorRef.current?.innerHTML || "";
      const text = editorRef.current?.textContent || "";
      
      const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
      await updateDoc(noteRef, { 
        title: documentTitle,
        content: content,
        rawText: text,
        summary: text.slice(0,150)+(text.length > 150 ? '...':'')
      });
      
      // Optimistic update for selectedNote
                setSelectedNote(prev => prev ? {
                  ...prev,
        title: documentTitle,
        content: content,
        rawText: text,
        summary: text.slice(0,150)+(text.length > 150 ? '...':'')
                } : null);
      
      toast({ title: "Document Updated" });
      setShowDocumentEditor(false);
      
      // Reset editing mode
      setIsEditing(false);
    } catch (e) { 
      console.error("Error updating document:", e);
      toast({ title: "Update Failed", variant: "destructive" }); 
    } finally {
      setIsSavingDocument(false); 
    }
  };

  // Add helper function for toggling summary display
  const toggleSummaryDisplay = () => {
    setShowInlineSummary(!showInlineSummary);
  };

  // Gmail sync function
  const toggleGmailSync = async () => {
    if (!user?.uid) return;
    
    try {
      setIsSyncingGmail(true);
      
      // Get reference to agent document in the agents collection
      const agentDocRef = doc(db, `agents/${user.uid}`);
      
      // Toggle the gmailfilesync field in the agent document (lowercase)
      await updateDoc(agentDocRef, {
        gmailfilesync: !gmailSyncEnabled
      });
      
      // Update local state
      setGmailSyncEnabled(!gmailSyncEnabled);
        
        toast({
        title: !gmailSyncEnabled ? "Gmail sync enabled" : "Gmail sync disabled",
        description: !gmailSyncEnabled 
          ? "Your Gmail documents will now automatically sync" 
          : "Your Gmail documents will no longer sync",
      });
    } catch (error) {
      console.error('Error toggling Gmail sync:', error);
      toast({
        title: "Sync Error",
        description: "Failed to toggle Gmail sync. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncingGmail(false);
    }
  };
  
  // Add a useEffect to show vault processing animation for newly added documents
  useEffect(() => {
    const checkNewDocumentVaultStatus = () => {
      // Find documents that are newly added but not yet marked as pending for KB
      // Skip documents that have been deleted from the vault
      const newlyAddedDocs = notes.filter(note => 
        !note.inKnowledgeBase && 
        !note.pendingKnowledgeBase && 
        note.knowledgeBaseStatus !== "deleted" && // Skip deleted docs
        note.knowledgeBaseStatus !== "removing" && // Skip removing docs
        // Consider a document "new" if added in the last minute
        note.createdAt && ((new Date().getTime() - note.createdAt.getTime()) < 60000) &&
        // Only auto-process documents from specific sources, NOT from the editor
        note.origin !== "editor" // Skip documents created in the editor - require manual vault addition
      );
      
      if (newlyAddedDocs.length > 0) {
        // Mark these documents as pending for knowledge base
        setNotes(prevNotes => 
          prevNotes.map(note => 
            newlyAddedDocs.some(newDoc => newDoc.id === note.id)
              ? { ...note, pendingKnowledgeBase: true }
              : note
          )
        );
        
        // If one of these is the selected note, update it too
        if (selectedNote && newlyAddedDocs.some(newDoc => newDoc.id === selectedNote.id)) {
          setSelectedNote(prev => prev ? { ...prev, pendingKnowledgeBase: true } : null);
        }
      }
    };
    
    // Run the check when notes change
    checkNewDocumentVaultStatus();
  }, [notes, selectedNote]);

  // Restore Gmail sync status check
  useEffect(() => {
    const checkGmailSyncStatus = async () => {
      if (!user?.uid) return;
      
      try {
        // Get agent document from the agents collection
        const agentDocRef = doc(db, `agents/${user.uid}`);
        const agentDoc = await getDoc(agentDocRef);
        
        if (agentDoc.exists()) {
          // Check the lowercase gmailfilesync field
          const syncEnabled = agentDoc.data().gmailfilesync === true;
          setGmailSyncEnabled(syncEnabled);
        } else {
          setGmailSyncEnabled(false);
        }
      } catch (error) {
        console.error('Error checking Gmail sync status:', error);
        setGmailSyncEnabled(false);
      }
    };
    
    checkGmailSyncStatus();
  }, [user]);

  // Add functions to manage Knowledge Vault

  const addToKnowledgeVault = async () => {
    if (!selectedNote || !user?.uid) {
      toast({ 
        title: "Error", 
        description: "Cannot add document to vault", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsAddingToVault(true);
    try {
      // Update the note to mark it as pendingKnowledgeBase
      const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
      await updateDoc(noteRef, { 
        pendingKnowledgeBase: true,
        // Clear any previous deletion status
        knowledgeBaseStatus: "processing"
      });
      
      // Optimistic update
                setSelectedNote(prev => prev ? {
                  ...prev,
        pendingKnowledgeBase: true,
        // Clear any previous deletion status in the UI
        knowledgeBaseStatus: "processing"
                } : null);
      
      // Call the knowledge base processing function
      const functions = getFunctions();
      const processDocumentFunction = httpsCallable(functions, 'addToKnowledgeBase');
      
      // Send BOTH documentId AND fileId to ensure proper file reference
      await processDocumentFunction({
        merchantId: user.uid,
        documentId: selectedNote.id,
        fileId: selectedNote.id // Use document ID as the fileId to match our new structure
      });
      
      toast({
        title: "Processing document", 
        description: "Document is being added to knowledge vault" 
      });
    } catch (error) {
      console.error('Error adding to knowledge vault:', error);
      toast({
        title: "Error",
        description: "Failed to add document to knowledge vault",
        variant: "destructive"
      });
      
      // Revert optimistic update on error
    if (selectedNote) {
        const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
        await updateDoc(noteRef, { pendingKnowledgeBase: false });
        setSelectedNote(prev => prev ? { ...prev, pendingKnowledgeBase: false } : null);
      }
    } finally {
      setIsAddingToVault(false);
    }
  };
  
  const removeFromKnowledgeVault = async () => {
    if (!selectedNote || !user?.uid || !selectedNote.inKnowledgeBase) {
      toast({
        title: "Error", 
        description: "Cannot remove document from vault", 
        variant: "destructive"
      });
      return;
    }
    
    setIsRemovingFromVault(true);
    try {
      // Update the note to mark it as being removed
      const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
      await updateDoc(noteRef, { 
        knowledgeBaseStatus: "removing", // Set status to removing
        pendingKnowledgeBase: false // Clear the pending flag
      });
      
      // Optimistic update for UI
      setSelectedNote(prev => prev ? { 
        ...prev, 
        knowledgeBaseStatus: "removing", // Show removing status
        pendingKnowledgeBase: false 
      } : null);
      
      // Call the knowledge base removal function
      const functions = getFunctions();
      const removeDocumentFunction = httpsCallable(functions, 'removeDocumentFromKnowledgeBase');
      
      await removeDocumentFunction({
        merchantId: user.uid,
        fileId: selectedNote.id // Use document ID as fileId
      });
      
      // Only update status to deleted after API confirms
      await updateDoc(noteRef, { 
        inKnowledgeBase: false,
        knowledgeBaseStatus: null // Change from "deleted" to null to avoid showing removal badge
      });
      
      // Update the UI with deleted status
      setSelectedNote(prev => prev ? { 
        ...prev, 
        inKnowledgeBase: false,
        knowledgeBaseStatus: null // Change from "deleted" to null
      } : null);
      
      toast({
        title: "Document removed", 
        description: "Document has been removed from knowledge vault" 
      });
    } catch (error) {
      console.error('Error removing from knowledge vault:', error);
      toast({
        title: "Error",
        description: "Failed to remove document from knowledge vault",
        variant: "destructive"
      });
      
      // Revert optimistic update on error
      if (selectedNote) {
        const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
        await updateDoc(noteRef, { 
          inKnowledgeBase: true,
          pendingKnowledgeBase: false,
          knowledgeBaseStatus: "added" // Reset to added state
        });
        setSelectedNote(prev => prev ? { 
          ...prev, 
          inKnowledgeBase: true,
          pendingKnowledgeBase: false,
          knowledgeBaseStatus: "added"
        } : null);
      }
    } finally {
      setIsRemovingFromVault(false);
    }
  };

  // Add a listener for knowledge base updates for pending documents
  useEffect(() => {
    if (!user?.uid) return;
    
    // Only monitor the knowledge base if we have pending documents
    const pendingDocuments = notes.filter(note => note.pendingKnowledgeBase);
    if (pendingDocuments.length === 0) return;
    
    const kbRef = collection(db, `merchants/${user.uid}/knowledgebase`);
    const kbQuery = query(kbRef, orderBy("createTime", "desc"));
    
    const unsubscribe = onSnapshot(kbQuery, (snapshot) => {
      const changedDocs = snapshot.docChanges();
      
      // Look for added or modified documents
      changedDocs.forEach(change => {
        if (change.type === "added" || change.type === "modified") {
          const kbData = change.doc.data();
          
          // Find any matching pending documents
          pendingDocuments.forEach(note => {
            const isMatch = (note.fileId && kbData.fileId === note.fileId) ||
              ((note.fileName && (kbData.source?.includes(note.fileName) || kbData.fileName === note.fileName)) ||
              (note.originalFileName && (kbData.source?.includes(note.originalFileName) || kbData.fileName === note.originalFileName)));
              
            if (isMatch && note.pendingKnowledgeBase) {
              // If status is success, update the document
              if (kbData.status === "success") {
                const noteRef = doc(db, `merchants/${user.uid}/files`, note.id);
                updateDoc(noteRef, { 
                  pendingKnowledgeBase: false,
                  inKnowledgeBase: true,
                  knowledgeBaseStatus: "added"
                }).catch(error => {
                  console.error("Error updating document status from listener:", error);
                });
                
                // If this is the currently selected note, update it immediately in the UI
                if (selectedNote && selectedNote.id === note.id) {
                  setSelectedNote(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      pendingKnowledgeBase: false,
                      inKnowledgeBase: true,
                      knowledgeBaseStatus: "added"
                    };
                  });
                  
      toast({
                    title: "Document processed",
                    description: "Document has been added to the knowledge vault"
                  });
                }
              }
            }
          });
        }
      });
    });
    
    return () => unsubscribe();
  }, [notes, selectedNote, user]);

  // Add a real-time listener for the selected document's knowledge base status
  useEffect(() => {
    if (!selectedNote || !user?.uid) return;
    
    // Only set up the listener if the document is currently processing
    if (!selectedNote.pendingKnowledgeBase) return;
    
    const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
    
    // Listen for changes to the document
    const unsubscribe = onSnapshot(noteRef, (docSnapshot) => {
      if (!docSnapshot.exists()) return;
      
      const data = docSnapshot.data();
      // If the document status has changed from 'processing' to something else
      if (selectedNote.pendingKnowledgeBase && !data.pendingKnowledgeBase) {
        // Update the UI
        setSelectedNote(prev => {
          if (!prev) return null;
          return {
            ...prev,
            pendingKnowledgeBase: false,
            inKnowledgeBase: data.inKnowledgeBase || false,
            knowledgeBaseStatus: data.knowledgeBaseStatus || null
          };
        });
        
        // Show a toast message
        if (data.inKnowledgeBase) {
          toast({
            title: "Document processed",
            description: "Document has been added to the knowledge vault",
          });
        }
      }
    });
    
    return () => unsubscribe();
  }, [selectedNote, user]);

  // Add sendToCSVault function - add this near the addToKnowledgeVault function
  const sendToCSVault = async () => {
    if (!selectedNote || !user?.uid) {
      toast({ 
        title: "Error", 
        description: "Cannot send document to CS Vault", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsSendingToCSVault(true);
    try {
      // Update the note to mark it as being sent to CS Vault and in processing state
      const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
      await updateDoc(noteRef, { 
        sharedWithAgentId: 'cs-vault',
        sharedWithAgentAt: serverTimestamp(),
        inCsVault: false, // Initially false until processing completes
        pendingCsVault: true // Set to processing state
      });
      
      // Optimistic update with processing state
      setSelectedNote(prev => {
        if (!prev) return null;
        return {
          ...prev,
          sharedWithAgentId: 'cs-vault',
          sharedWithAgentAt: Timestamp.fromDate(new Date()),
          inCsVault: false,
          pendingCsVault: true
        };
      });
      
      // Call the csvault function
      const functions = getFunctions();
      const sendToCSVaultFunction = httpsCallable(functions, 'csvault');
      
      // Send document details to the function
      await sendToCSVaultFunction({
        merchantId: user.uid,
        documentId: selectedNote.id,
        fileId: selectedNote.id,
        title: selectedNote.title,
        type: selectedNote.type
      });
      
      toast({
        title: "Document sent", 
        description: "Document is being processed for Customer Service Agent" 
      });
    } catch (error) {
      console.error('Error sending to CS Vault:', error);
      toast({
        title: "Error",
        description: "Failed to send document to Customer Service Agent",
        variant: "destructive"
      });
      
      // Revert optimistic update on error
      if (selectedNote) {
        const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
        await updateDoc(noteRef, { 
          sharedWithAgentId: '',
          sharedWithAgentAt: null,
          pendingCsVault: false
        });
        setSelectedNote(prev => {
          if (!prev) return null;
          return { 
            ...prev, 
            sharedWithAgentId: '',
            sharedWithAgentAt: undefined,
            pendingCsVault: false
          };
        });
      }
    } finally {
      setIsSendingToCSVault(false);
    }
  };

  // Modify the removeFromCSVault function to better handle the removing state
  const removeFromCSVault = async () => {
    if (!selectedNote || !user?.uid) {
      toast({ 
        title: "Error", 
        description: "Cannot remove document from Customer Service Agent", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsRemovingFromCSVault(true);
    try {
      // Update the note to mark it as being removed from CS Vault
      const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
      await updateDoc(noteRef, { 
        inCsVault: false,
        sharedWithAgentId: '',
        pendingCsVault: false // Explicitly set pendingCsVault to false
      });
      
      // Optimistic update
      setSelectedNote(prev => {
        if (!prev) return null;
        return {
          ...prev,
          inCsVault: false,
          sharedWithAgentId: '',
          pendingCsVault: false // Include pendingCsVault in the optimistic update
        };
      });
      
      // Call the Customer Service Agent removal function with the correct name
      const functions = getFunctions();
      const removeFromCSVaultFunction = httpsCallable(functions, 'removeDocumentFromCustomerServiceVault');
      
      // Send document details to the function
      await removeFromCSVaultFunction({
        merchantId: user.uid,
        documentId: selectedNote.id,
        fileId: selectedNote.id
      });
      
      toast({
        title: "Document removed", 
        description: "Document has been removed from Customer Service Agent" 
      });
    } catch (error) {
      console.error('Error removing from Customer Service Agent:', error);
      toast({
        title: "Error",
        description: "Failed to remove document from Customer Service Agent",
        variant: "destructive"
      });
      
      // Revert optimistic update on error
      if (selectedNote) {
        const noteRef = doc(db, `merchants/${user.uid}/files`, selectedNote.id);
        await updateDoc(noteRef, { 
          inCsVault: true,
          sharedWithAgentId: 'cs-vault',
          pendingCsVault: false // Always ensure pendingCsVault is correctly set
        });
        setSelectedNote(prev => {
          if (!prev) return null;
          return { 
            ...prev, 
            inCsVault: true,
            sharedWithAgentId: 'cs-vault',
            pendingCsVault: false // Include in the revert
          };
        });
      }
    } finally {
      setIsRemovingFromCSVault(false);
    }
  };

  // Fix the useEffect function for CS Vault processing
  useEffect(() => {
    if (!user?.uid) return;
    
    // Get the documents that are pending CS Vault processing
    const pendingDocs = notes.filter(note => note.pendingCsVault);
    if (pendingDocs.length === 0) return;
    
    // Create a listener for each pending document
    const unsubscribers: (() => void)[] = [];
    
    pendingDocs.forEach(note => {
      const noteRef = doc(db, `merchants/${user.uid}/files`, note.id);
      
      // Set up a one-time listener to check for status updates
      const unsubscribe = onSnapshot(noteRef, (docSnapshot) => {
        if (!docSnapshot.exists()) return;
        
        const data = docSnapshot.data();
        // Check if processing is complete
        if ((data.inCsVault === true && data.pendingCsVault === false) || 
            (data.inCsVault === true && !data.pendingCsVault)) {
          // Make sure we explicitly set pendingCsVault to false - needs to be separate
          // from the listener since we can't use async inside onSnapshot directly
          const updatePendingStatus = async () => {
            try {
              const docRef = doc(db, `merchants/${user.uid}/files`, note.id);
              await updateDoc(docRef, { 
                pendingCsVault: false
              });
            } catch (error) {
              console.error("Error updating CS vault pending status:", error);
            }
          };
          
          // Call the async function
          updatePendingStatus();
          
          // If this is the selected note, update it immediately
          if (selectedNote && selectedNote.id === note.id) {
            setSelectedNote(prev => {
              if (!prev) return null;
              return {
                ...prev,
                inCsVault: true,
                pendingCsVault: false
              };
            });
            
            toast({
              title: "Document processed",
              description: "Document is now available to Customer Service Agent"
            });
          }
          
          // Stop listening to this document
          unsubscribe();
        }
      });
      
      unsubscribers.push(unsubscribe);
      
      // Clean up the listener after 2 minutes (failsafe)
      const timeoutId = setTimeout(() => {
        unsubscribe();
      }, 120000);
      
      // Add the timeout clear function to our unsubscribers
      unsubscribers.push(() => clearTimeout(timeoutId));
    });
    
    // Return cleanup function to unsubscribe all listeners
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [notes, user, selectedNote]);

  // Add a function to handle canceling the document editor
  const handleCancelDocumentEdit = () => {
    setShowDocumentEditor(false);
    setIsEditing(false);
  };

  // When the editor component is mounted, add an event listener
  useEffect(() => {
    if (showDocumentEditor && editorRef.current) {
      // Focus the editor when it's shown
      editorRef.current.focus();
      
      // Set up paste handling to preserve formatting
      const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') || '';
        document.execCommand('insertText', false, text);
      };
      
      editorRef.current.addEventListener('paste', handlePaste);
      
      // Clean up the event listener
      return () => {
        if (editorRef.current) {
          editorRef.current.removeEventListener('paste', handlePaste);
        }
      };
    }
  }, [showDocumentEditor]);

  // Define note templates with different headers and bullet points
  const noteTemplates = {
    meeting: {
      name: "Meeting Notes",
      content: `<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Meeting Notes</h1>
<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem;">Meeting Details</h2>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Attendees:</strong> </p>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Agenda</h2>
<ul>
  <li>Topic 1</li>
  <li>Topic 2</li>
  <li>Topic 3</li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Discussion Points</h2>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Action Items</h2>
<ul>
  <li>Action 1 - Assigned to: </li>
  <li>Action 2 - Assigned to: </li>
  <li>Action 3 - Assigned to: </li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Next Steps</h2>
<p></p>`
    },
    project: {
      name: "Project Plan",
      content: `<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Project Plan</h1>
<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem;">Project Overview</h2>
<p></p>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Objectives</h2>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Timeline</h2>
<p><strong>Start Date:</strong> </p>
<p><strong>End Date:</strong> </p>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Milestones</h2>
<ul>
  <li>Milestone 1 - Due: </li>
  <li>Milestone 2 - Due: </li>
  <li>Milestone 3 - Due: </li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Resources Required</h2>
<ul>
  <li></li>
  <li></li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Risks & Mitigation</h2>
<ul>
  <li>Risk 1 - Mitigation: </li>
  <li>Risk 2 - Mitigation: </li>
</ul>`
    },
    weekly: {
      name: "Weekly Report",
      content: `<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Weekly Report</h1>
<p><strong>Week:</strong> ${new Date().toLocaleDateString()} - ${new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>

  <h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Accomplishments</h2>
  <ul>
    <li></li>
    <li></li>
    <li></li>
  </ul>

  <h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Challenges</h2>
  <ul>
    <li></li>
    <li></li>
  </ul>

  <h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Next Week's Plan</h2>
  <ul>
    <li></li>
    <li></li>
    <li></li>
  </ul>

  <h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Notes</h2>
  <p></p>`
    },
    simple: {
      name: "Simple Note",
      content: `<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Note Title</h1>
  <p></p>

  <h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Key Points</h2>
  <ul>
    <li></li>
    <li></li>
    <li></li>
  </ul>

  <h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Additional Notes</h2>
  <p></p>`
    },
    csPolicy: {
      name: "Customer Service Policy",
      content: `<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Customer Service Policy</h1>
<p><strong>Last Updated:</strong> ${new Date().toLocaleDateString()}</p>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Policy Overview</h2>
<p>This policy outlines our customer service standards and procedures to ensure consistent, high-quality service.</p>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Service Standards</h2>
<ul>
  <li>Respond to all customer inquiries within [timeframe]</li>
  <li>Address customer concerns with empathy and professionalism</li>
  <li>Follow up with customers after issue resolution</li>
  <li>Maintain customer confidentiality at all times</li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Response Timeframes</h2>
<ul>
  <li><strong>Email inquiries:</strong> Within [X] business hours</li>
  <li><strong>Phone calls:</strong> Within [X] minutes</li>
  <li><strong>Social media messages:</strong> Within [X] hours</li>
  <li><strong>Urgent issues:</strong> Within [X] hours</li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Escalation Procedures</h2>
<ol>
  <li>Initial customer contact with front-line service staff</li>
  <li>If unresolved, escalate to senior customer service representative</li>
  <li>If still unresolved, escalate to customer service manager</li>
  <li>Final escalation to department director if necessary</li>
</ol>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Refund & Return Policy</h2>
<ul>
  <li>Products can be returned within [X] days of purchase</li>
  <li>Refunds processed within [X] business days</li>
  <li>Damaged items eligible for immediate replacement</li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Special Case Handling</h2>
<ul>
  <li><strong>VIP customers:</strong> </li>
  <li><strong>Difficult customers:</strong> </li>
  <li><strong>Technical issues:</strong> </li>
</ul>

<h2 style="font-size: 1.2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">Customer Feedback Process</h2>
<p>Describe how customer feedback is collected, analysed and implemented.</p>`
    }
  };

  // Add a function to insert a template
  const insertTemplate = (templateKey: keyof typeof noteTemplates) => {
    if (editorRef.current && templateKey in noteTemplates) {
      // Get the template content
      const templateContent = noteTemplates[templateKey].content;
      
      // Insert the template into the editor
      editorRef.current.innerHTML = templateContent;
      
      // Update the document title if it's still the default
      if (documentTitle === "Untitled Document") {
        setDocumentTitle(noteTemplates[templateKey].name);
      }
      
      // Focus the editor after inserting template
      editorRef.current.focus();
    }
  };

  // Add voice recording functions - add near other utility functions
  const startRecording = async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1, // Mono
          sampleRate: 16000 // Low sample rate
        } 
      });
      audioStreamRef.current = stream;
      
      // Set up audio context with manual processing to control file size
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000 // Force low sample rate
      });
      
      // Create source node from microphone stream
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create script processor for raw audio data access
      const bufferSize = 4096;
      audioProcessorRef.current = audioContextRef.current.createScriptProcessor(
        bufferSize, 1, 1
      );
      
      // Process audio data
      audioProcessorRef.current.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // Store a copy of the audio data
        const data = new Float32Array(input.length);
        data.set(input);
        audioDataRef.current.push(data);
        
        // Log the data size every ~5 seconds
        if (audioDataRef.current.length % 20 === 0) {
          const totalSamples = audioDataRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
          addDebugLog(`Recording... ${totalSamples} samples collected`);
        }
      };
      
      // Connect nodes: source -> processor -> destination
      source.connect(audioProcessorRef.current);
      audioProcessorRef.current.connect(audioContextRef.current.destination);
      
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Set up a timer to track and display recording duration
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(currentDuration => {
          // Auto-stop recording after 60 seconds
          if (currentDuration >= 59) {
            addDebugLog("Maximum recording time reached (60s). Stopping...");
            stopRecording();
            toast({
              title: "Recording limit reached",
              description: "Maximum recording time is 60 seconds"
            });
          }
          return currentDuration + 1;
        });
      }, 1000);
      
      toast({
        title: "Recording started",
        description: `Speak clearly into your microphone (Max: 60s, Format: ${audioFormat})`
      });
      
      addDebugLog("Recording started successfully");
    } catch (err) {
      console.error('Error accessing microphone:', err);
      addDebugLog(`Error: ${err}`);
      setRecordingError('Could not access your microphone');
      toast({ 
        title: "Microphone error", 
        description: "Could not access your microphone", 
        variant: "destructive" 
      });
    }
  };
  
  const stopRecording = async () => {
    if (!audioContextRef.current || !audioProcessorRef.current || !audioStreamRef.current || !user?.uid) {
      addDebugLog("Stop recording failed: missing audio context or stream");
      return;
    }
    
    addDebugLog("Stopping recording...");
    setIsRecording(false);
    
    // Clear the recording timer
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    try {
      setIsTranscribing(true);
      
      // Disconnect and clean up audio nodes
      audioProcessorRef.current.disconnect();
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      
      // Close audio context
      if (audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
      }
      
      const totalSamples = audioDataRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      addDebugLog(`Recording stopped. Total samples: ${totalSamples} (${(totalSamples / 16000).toFixed(1)}s at 16kHz)`);
      
      // Reset any previous transcription
      setTranscriptionResult(null);
      
      // Convert audio to low quality mp3/wav
      addDebugLog("Processing audio...");
      const audioBlob = await encodeAudioToLowQualityMP3(audioDataRef.current);
      
      // Add size check and warning for large files
      const fileSizeMB = audioBlob.size / (1024 * 1024);
      addDebugLog(`Audio processed. File size: ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB > 5) {
        addDebugLog("WARNING: Large file size may cause issues with transcription");
        toast({
          title: "Large recording",
          description: `Recording is ${fileSizeMB.toFixed(1)}MB - processing may take longer`
        });
      }
      
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          addDebugLog("Converting audio to base64...");
          const base64Audio = reader.result!.toString().split(',')[1];
          addDebugLog(`Base64 conversion complete. Length: ${base64Audio.length} chars`);
          
          // Call the Cloud Function
          addDebugLog("Calling transcribeAudio function...");
          const functions = getFunctions();
          const transcribeAudioFn = httpsCallable(functions, 'transcribeAudio1', { 
            timeout: 120000 // 2-minute timeout
          });
          
          // Call in chunks if needed
          let result;
          if (base64Audio.length > 500000) {
            addDebugLog("Base64 data too large, would try chunking here");
            // In a real implementation, we would chunk the data here
            toast({
              title: "Recording too large",
              description: "Try a shorter recording or lower quality",
              variant: "destructive"
            });
            setIsTranscribing(false);
            return;
          } else {
            addDebugLog(`Sending data to function (${(base64Audio.length / 1024).toFixed(1)}KB)...`);
            result = await transcribeAudioFn({ 
              base64Audio,
              userId: user.uid,
              filename: `recording.${audioFormat}`
            });
          }
          
          addDebugLog("Received response from function");
          
          // Store the raw response for debugging
          setDebugTranscription(result.data);
          
          const transcription = result.data as { 
            success: boolean; 
            note: { 
              title: string; 
              content: string; 
              timestamp: any; 
              userId?: string;
              id?: string;
            } 
          };
          
          if (transcription.success && transcription.note) {
            addDebugLog(`Transcription successful: "${transcription.note.content.substring(0, 50)}..."`);
            
            // Store transcription result to display in UI
            setTranscriptionResult({
              title: transcription.note.title,
              content: transcription.note.content
            });
            
            // If we are editing an existing note
            if (isEditing && editorRef.current) {
              // Append the transcription to the existing content
              editorRef.current.innerHTML += `<p>${transcription.note.content}</p>`;
            } 
            // If we're creating a new document
            else if (showDocumentEditor && editorRef.current) {
              if (documentTitle === "Untitled Document") {
                setDocumentTitle(transcription.note.title);
              }
              
              // Add the transcription to editor
              editorRef.current.innerHTML += `<p>${transcription.note.content}</p>`;
            }
            
            toast({
              title: "Transcription complete",
              description: "Voice note added to document"
            });
          } else {
            addDebugLog("Transcription response indicates failure");
            toast({ 
              title: "Transcription failed", 
              description: "Error processing audio. Try a shorter recording.",
              variant: "destructive" 
            });
          }
        } catch (err) {
          console.error('Error calling transcription function:', err);
          addDebugLog(`Error in transcription: ${err}`);
          toast({ 
            title: "Transcription failed", 
            description: "Error processing audio. Try a shorter recording.",
            variant: "destructive" 
          });
        } finally {
          setIsTranscribing(false);
        }
      };
      
      reader.onerror = (error) => {
        console.error('Error reading audio file:', error);
        addDebugLog(`Error reading audio file: ${error}`);
        toast({ 
          title: "Processing failed", 
          description: "Could not process your recording",
          variant: "destructive" 
        });
        setIsTranscribing(false);
      };
      
      addDebugLog("Starting file reader...");
      reader.readAsDataURL(audioBlob);
      
    } catch (err) {
      console.error('Error processing audio:', err);
      addDebugLog(`Error in stopRecording: ${err}`);
      toast({ 
        title: "Processing failed", 
        description: "Could not process your recording", 
        variant: "destructive" 
      });
      setIsTranscribing(false);
    }
  };

  // Add a function to insert the transcription content again if needed
  const insertTranscription = () => {
    if (!transcriptionResult || !editorRef.current) return;
    
    editorRef.current.innerHTML += `<p>${transcriptionResult.content}</p>`;
    
    toast({
      title: "Transcription inserted",
      description: "Content added to document"
    });
  };

  // Add this helper function to log debug info
  const addDebugLog = (message: string) => {
    console.log(`Recording Debug: ${message}`);
    setRecordingDebugLog(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, -1)}: ${message}`]);
  };

  // Add function to encode audio to lower quality
  const encodeAudioToLowQualityMP3 = async (audioData: Float32Array[]): Promise<Blob> => {
    addDebugLog(`Starting audio encoding to ${audioFormat}`);
    
    // Convert to WAV first
    const sampleRate = 16000; // Low sample rate
    const numChannels = 1; // Mono
    const bitsPerSample = 16;
    
    // Calculate buffer size and create buffer
    const totalSamples = audioData.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);
    
    // Write WAV header
    // "RIFF" chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // byte rate
    view.setUint16(32, numChannels * bitsPerSample / 8, true); // block align
    view.setUint16(34, bitsPerSample, true);
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, totalSamples * 2, true);
    
    // Write audio data
    let offset = 44;
    for (const chunk of audioData) {
      for (let i = 0; i < chunk.length; i++) {
        const sample = Math.max(-1, Math.min(1, chunk[i])); // Clamp to -1, 1
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF; // Convert to 16-bit
        view.setInt16(offset, value, true);
        offset += 2;
      }
    }
    
    function writeString(view: DataView, offset: number, string: string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
    
    // Downsample the WAV if needed to further reduce size
    // This is a simplified approach since we don't have FFmpeg
    const wavBlob = new Blob([buffer], { type: 'audio/wav' });
    addDebugLog(`Created WAV blob: ${(wavBlob.size / 1024).toFixed(2)}KB`);
    
    // For now, always use WAV since we don't have FFmpeg
    // In a production app, you'd load the FFmpeg libraries properly
    addDebugLog(`Using WAV format for all recordings (FFmpeg not available)`);
    return wavBlob;
  };

  // Add handler for uploading dropped files
  const handleDroppedFiles = (files: FileList) => {
    if (files && files.length > 0) {
      const file = files[0];
      setUploadFile(file);
      setUploadTitle(file.name.split('.').slice(0, -1).join('.'));
      setUploadDialogOpen(true);
      
      // Set a flag to automatically add to CS Vault if in CS tab
      if (typeof window !== 'undefined') {
        if (activeTab === "cs") {
          localStorage.setItem('auto_add_to_cs_vault', 'true');
        } else {
          localStorage.removeItem('auto_add_to_cs_vault');
        }
      }
    }
  };

  // Add handlers for drag and drop events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    const files = e.dataTransfer.files;
    handleDroppedFiles(files);
  };

  // Add function to toggle pin status
  const togglePinNote = async (noteId: string) => {
    if (!user?.uid) return;
    
    try {
      // Find the note
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      
      // Get the document reference
      const noteRef = doc(db, `merchants/${user.uid}/files`, noteId);
      
      // Update pinned status
      const newPinnedStatus = !note.pinned;
      await updateDoc(noteRef, { 
        pinned: newPinnedStatus 
      });
      
      // Provide immediate feedback
      toast({ 
        title: newPinnedStatus ? "Note pinned" : "Note unpinned",
        description: newPinnedStatus ? "Note has been pinned to the top" : "Note has been unpinned"
      });
      
      // Optimistic update of the notes array to ensure the list updates immediately
      setNotes(prevNotes => prevNotes.map(n => 
        n.id === noteId ? {...n, pinned: newPinnedStatus} : n
      ));
      
      // Optimistic update for selected note if it's the one being pinned/unpinned
      if (selectedNote?.id === noteId) {
        setSelectedNote(prev => prev ? { ...prev, pinned: newPinnedStatus } : null);
      }
    } catch (error) {
      console.error("Error toggling pin status:", error);
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  // --- JSX Structure --- 
  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{ __html: transitionStyles }} />
      <div className="flex flex-col h-full max-w-full">
        {/* Header Section - ensure all rounded-md */}
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* Removed title "Documents" */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-md flex items-center justify-center relative -mt-0.5"
                      onClick={() => setShowVaultInfo(true)}
                    >
                      <Info className="h-4 w-4 text-gray-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="custom-tooltip" side="bottom">
                    <span className="text-gray-800">How this works</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center justify-between w-full">
              {/* Search bar moved to far left */}
              <div className="relative w-full md:w-96 max-w-full">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  {searchMode === 'filter' ? 
                    <Search className="h-4 w-4 text-muted-foreground" /> : 
                    <div className="flex items-center justify-center h-4 w-4">
                      {isLoadingKnowledgeChat ? 
                        <div className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/> : 
                        <AILogo />
                      }
                    </div>
                  }
                </div>
                <Input 
                  ref={searchInputRef}
                  placeholder={searchMode === 'filter' ? "Search..." : "Ask AI about your documents..."} 
                  className={cn(
                    "pl-10 h-9 rounded-md w-full pr-24 transition-all duration-300",
                    searchMode === 'semantic' && "border-blue-200 shadow-sm"
                  )} 
                  value={searchMode === 'filter' ? searchQuery : semanticSearchQuery} 
                  onChange={e => searchMode === 'filter' ? setSearchQuery(e.target.value) : setSemanticSearchQuery(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (searchMode === 'semantic') {
                        e.preventDefault();
                        callKnowledgeChatFunction();
                      }
                    }
                  }}
                />
                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
                  {searchMode === 'semantic' && semanticSearchQuery.trim() !== '' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs rounded-md" 
                      onClick={() => setSemanticSearchQuery('')}
                      disabled={isLoadingKnowledgeChat}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "h-7 px-3 text-xs rounded-md transition-colors",
                      searchMode === 'semantic' ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-600"
                    )} 
                    onClick={() => {
                      setSearchMode(p => {
                        const newMode = p === 'filter' ? 'semantic' : 'filter';
                        // Clear appropriate search field when switching modes
                        if (newMode === 'filter') setSemanticSearchQuery('');
                        else setSearchQuery('');
                        return newMode;
                      });
                      setTimeout(() => searchInputRef.current?.focus(), 0);
                    }}
                  >
                    {searchMode === 'filter' ? "Ask AI" : "Filter"}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Gmail Sync Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className={cn(
                          "h-9 w-9 rounded-md flex items-center justify-center relative transition-all duration-200",
                          gmailSyncEnabled 
                            ? "text-blue-500 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300" 
                            : "text-gray-500 border-gray-200 bg-white hover:bg-gray-100"
                        )}
                        onClick={toggleGmailSync}
                        disabled={isSyncingGmail}
                      >
                        {isSyncingGmail ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Image 
                              src="/gmail.png" 
                              alt="Gmail Sync" 
                              width={20} 
                              height={16}
                              className={cn(
                                "object-contain transition-opacity",
                                !gmailSyncEnabled && "opacity-70"
                              )} 
                            />
                            {gmailSyncEnabled && (
                              <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-30"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-white"></span>
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="custom-tooltip p-2">
                      {gmailSyncEnabled 
                        ? (
                          <div className="flex flex-col gap-1">
                            <p className="font-medium flex items-center gap-1 text-gray-800">
                              <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                              <span>Gmail sync active</span>
                            </p>
                          </div>
                        ) 
                        : <span className="text-gray-800">Connect Gmail</span>
                      }
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Button variant="outline" className="h-9 gap-2 rounded-md" onClick={handleNewDocument}><Plus size={16}/>New</Button>
                <Button className="h-9 gap-2 rounded-md" onClick={() => setUploadDialogOpen(true)}><FileUp size={16}/>Upload</Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t flex-1 min-h-0 h-[calc(100vh-9rem)]">
          {/* Left Column: Document List */}
          <div className="lg:col-span-1 border-r flex flex-col h-full overflow-hidden bg-gray-50/50">
            <div className="p-3 border-b flex-shrink-0 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Add GitHub-style pill navigation with sliding animation */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      activeTab === "all"
                        ? "text-gray-800 bg-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200/70"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    <span>All</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("vault")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      activeTab === "vault"
                        ? "text-gray-800 bg-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200/70"
                    )}
                  >
                    <Database className="h-4 w-4 text-blue-500" />
                    <span>Vault</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("cs")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      activeTab === "cs"
                        ? "text-gray-800 bg-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200/70"
                    )}
                  >
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>CS Agent</span>
                  </button>
                </div>
                
                {/* Add pinned indicator */}
                {filteredNotes.some(note => note.pinned) && (
                  <div className="flex items-center text-xs text-gray-500 gap-1 mr-2">
                    <svg 
                      width="12" 
                      height="12"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="text-amber-500"
                    >
                      <path d="M12 17v5" />
                      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
                    </svg>
                    <span>Pinned on top</span>
                  </div>
                )}
                
                {/* Add CS Agent Settings Link when CS tab is active */}
                {activeTab === "cs" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 rounded-md flex items-center gap-1.5 text-purple-600 border-purple-200 bg-purple-50"
                          onClick={() => window.location.href = "/settings/agents"}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          <span className="text-xs">Settings</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        CS Agent settings
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Only show type filter when not on CS tab */}
                {activeTab !== "cs" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-white border-gray-200 text-gray-700 h-[34px]"
                    >
                      <Filter className="h-4 w-4" />
                      <span>
                        {typeFilter ? 
                          typeFilter === "notes" ? "Notes" : 
                          typeFilter === "invoices" ? "Invoices" : 
                          typeFilter === "images" ? "Images" : 
                          typeFilter === "pdfs" ? "PDFs" : 
                          typeFilter === "other" ? "Other" :
                          typeFilter === "gmail" ? "Gmail" : "Filter" 
                          : "Filter"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-md">
                    <DropdownMenuItem onClick={() => setTypeFilter(null)} className="cursor-pointer">
                      All types
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setTypeFilter("notes")} className="cursor-pointer flex items-center gap-2">
                      <FileText className="h-4 w-4 text-yellow-500" />
                      <span>Notes</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("invoices")} className="cursor-pointer flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span>Invoices</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("pdfs")} className="cursor-pointer flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-red-500" />
                      <span>PDFs</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("images")} className="cursor-pointer flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-blue-500" />
                      <span>Images</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("other")} className="cursor-pointer flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-gray-500" />
                      <span>Other</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("gmail")} className="cursor-pointer flex items-center gap-2">
                      <div className="h-4 w-4 flex items-center justify-center">
                        <Image 
                          src="/gmail.png" 
                          alt="Gmail" 
                          width={14} 
                          height={10}
                          className="object-contain" 
                        />
                      </div>
                      <span>Gmail</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </div>
            </div>
            <div 
              className={cn(
                "flex-grow overflow-y-auto h-[calc(100%-4rem)] min-h-0 scrollbar-thin p-1 document-list-container",
                isDraggingOver && "bg-purple-50 border-2 border-dashed border-purple-300"
              )}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {loading ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="border bg-white rounded-md p-3"><Skeleton className="h-5 w-1/2 mb-2"/><Skeleton className="h-4 w-full mb-1"/><Skeleton className="h-4 w-3/4"/></div>)}</div>
              ) : activeTab === "cs" && filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="bg-purple-100 text-purple-600 p-3 rounded-md w-16 h-16 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">No CS Agent Documents</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-xs">
                    Add documents to the CS Agent to help your customer service team access important information.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button 
                      className="gap-2 rounded-md bg-purple-600 hover:bg-purple-700 px-4"
                      onClick={() => setUploadDialogOpen(true)}
                    >
                      <FileUp size={16} />
                      Upload Document
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Or drag & drop files here
                    </p>
                  </div>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="p-8 text-center"><FileText className="h-10 w-10 mx-auto text-gray-300 mb-3"/><h3 className="font-medium">No documents</h3><p className="text-sm text-gray-500">Upload or create one.</p></div>
              ) : (
                <div className="space-y-2 p-2">
                  {filteredNotes.map(note => <DocumentItem 
                    key={note.id} 
                    note={note} 
                    isSelected={selectedNote?.id === note.id} 
                    onSelect={handleNoteSelection} 
                    formatDateFunction={safeFormatDate}
                    isDeleting={deletingNotes.includes(note.id)}
                    onTogglePin={togglePinNote}
                  />)}
                </div>
              )}
              
              {/* Add overlay for drag and drop */}
              {isDraggingOver && (
                <div className="absolute inset-0 bg-purple-50/80 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                  <div className="bg-white p-6 rounded-md shadow-md border border-purple-200 text-center">
                    <FileUp size={28} className="mx-auto mb-2 text-purple-500" />
                    <p className="font-medium text-purple-700">Drop to upload</p>
                  </div>
                </div>
              )}
            </div>
        </div>
                      
          {/* Right Column: Detail View */}
          <div className="lg:col-span-2 flex flex-col min-h-0 p-0 overflow-hidden">
            {showAiResponseInContent ? (
              <div className="flex flex-col h-full ai-response-container">
                <div className="px-6 py-4 border-b flex items-center justify-between"><div className="flex items-center gap-2"><AILogo/><h2 className="text-lg font-medium">AI Results</h2></div><Button variant="outline" size="sm" className="h-8 rounded-md" onClick={()=>setShowAiResponseInContent(false)}><X size={16}/>Close</Button></div>
                <div className="flex-grow overflow-auto p-6">
                  {isLoadingKnowledgeChat ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                        <p className="text-sm text-gray-500">Analysing your documents...</p>
        </div>
                          </div>
                  ) : knowledgeChatResponse ? (
                    <div className="markdown-content">
                      <ReactMarkdown>{knowledgeChatResponse.answer}</ReactMarkdown>
                      {knowledgeChatResponse.sources.length > 0 && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-100">
                          <h4 className="font-medium mb-2">Sources:</h4>
                          <ul className="list-disc pl-5">
                            {knowledgeChatResponse.sources.map((source, index) => (
                              <li key={index} className="text-sm text-gray-700 mb-1">{source}</li>
                            ))}
                          </ul>
                </div>
              )}
                        </div>
                            ) : (
                    <p>No AI result.</p>
                  )}
                          </div>
                        </div>
            ) : showDocumentEditor ? (
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b flex items-center justify-between gap-4">
                  <Input value={documentTitle} onChange={e=>setDocumentTitle(e.target.value)} className="text-lg font-medium h-9 rounded-md max-w-md" placeholder="Title"/>
                  <div className="flex gap-2">
                    <Button variant="outline" className="h-9 rounded-md" onClick={handleCancelDocumentEdit}>Cancel</Button>
                    <Button className="h-9 rounded-md" onClick={isEditing ? updateExistingDocument : saveDocument} disabled={isSavingDocument}>{isSavingDocument ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Saving</> : "Save"}</Button>
                  </div>
                </div>
                
                {/* Add formatting toolbar */}
                <div className="px-6 py-2 border-b flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 rounded-md flex items-center justify-center"
                            onClick={toggleBold}
                          >
                            <span className="font-bold">B</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Bold</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 rounded-md flex items-center justify-center"
                            onClick={toggleUnderline}
                          >
                            <span className="underline">U</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Underline</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 rounded-md flex items-center justify-center"
                            onClick={toggleBulletList}
                          >
                            <ListIcon className="h-4 w-4 text-gray-700" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Bullet List</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <div className="mx-1 h-4 w-px bg-gray-200"></div>
                    
                    <DropdownMenu>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 rounded-md flex items-center justify-center text-sm"
                              >
                                <span className="font-medium">A</span>
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Text Size</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => changeTextSize("1")}>
                          <span className="text-xs">Small</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeTextSize("3")}>
                          <span className="text-md">Normal</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeTextSize("5")}>
                          <span className="text-lg">Large</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeTextSize("7")}>
                          <span className="text-xl">Larger</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <div className="mx-1 h-4 w-px bg-gray-200"></div>
                    
                    {/* Add Template Button */}
                    <DropdownMenu>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2 rounded-md flex items-center gap-1 text-gray-700"
                              >
                                <FileCode className="h-4 w-4" />
                                <span className="text-sm">Templates</span>
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Insert Template</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuItem onClick={() => insertTemplate("meeting")}>
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Meeting Notes</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertTemplate("project")}>
                          <GitBranch className="h-4 w-4 mr-2" />
                          <span>Project Plan</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertTemplate("weekly")}>
                          <FileText className="h-4 w-4 mr-2" />
                          <span>Weekly Report</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertTemplate("simple")}>
                          <FileIcon className="h-4 w-4 mr-2" />
                          <span>Simple Note</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertTemplate("csPolicy")}>
                          <Users className="h-4 w-4 mr-2" />
                          <span>Customer Service Policy</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Add Voice Recording Button */}
                    <div className="mx-1 h-4 w-px bg-gray-200"></div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant={isRecording ? "destructive" : "ghost"}
                            size="sm" 
                            className={`h-8 px-2 rounded-md flex items-center gap-1 ${
                              isRecording ? "bg-red-500 text-white" : "text-gray-700"
                            }`}
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isTranscribing}
                          >
                            {isRecording ? (
                              <>
                                <MicOff className="h-4 w-4" />
                                <span className="text-sm flex items-center">
                                  Stop <span className="ml-1 text-xs bg-red-600 px-1.5 py-0.5 rounded-sm">{recordingDuration}s</span>
                                </span>
                              </>
                            ) : isTranscribing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Transcribing...</span>
                              </>
                            ) : (
                              <>
                                <Mic className="h-4 w-4" />
                                <span className="text-sm">Voice</span>
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {isRecording ? "Stop Recording" : "Record Voice Note (max 60s)"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <div className="flex-grow overflow-auto">
                  {/* Add Debug Toggle Button */}
                  <div className="px-4 py-2 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDebugMode(!debugMode)}
                      className="h-7 text-xs rounded-md flex items-center gap-1"
                    >
                      {debugMode ? "Hide Debug" : "Show Debug"}
                    </Button>
                  </div>
                  
                  {/* Debug Panel */}
                  {debugMode && (
                    <div className="mb-4 mx-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium">Recording Debug Panel:</h3>
                        <div className="flex gap-2">
                          <label className="text-xs flex items-center gap-1">
                            <input 
                              type="radio" 
                              checked={audioFormat === "mp3"} 
                              onChange={() => setAudioFormat("mp3")} 
                            /> MP3
                          </label>
                          <label className="text-xs flex items-center gap-1">
                            <input 
                              type="radio" 
                              checked={audioFormat === "wav"} 
                              onChange={() => setAudioFormat("wav")} 
                            /> WAV
                          </label>
                          <label className="text-xs flex items-center gap-1">
                            <input 
                              type="radio" 
                              checked={audioFormat === "webm"} 
                              onChange={() => setAudioFormat("webm")} 
                            /> WebM
                          </label>
                        </div>
                      </div>
                      
                      {debugTranscription && (
                        <div className="mb-3">
                          <h4 className="text-xs font-medium mb-1">Transcription Response:</h4>
                          <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-auto max-h-40 scrollbar-thin">
                            {JSON.stringify(debugTranscription, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-xs font-medium mb-1">Recording Log:</h4>
                        <div className="text-xs bg-gray-100 p-3 rounded-md overflow-auto max-h-40 scrollbar-thin font-mono">
                          {recordingDebugLog.length > 0 ? (
                            recordingDebugLog.map((log, i) => (
                              <div key={i} className="leading-tight">{log}</div>
                            ))
                          ) : (
                            <div className="text-gray-400">No recording activity yet</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Transcription Result Panel */}
                  {transcriptionResult && (
                    <div className="mb-4 mx-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-blue-700">Voice Transcription Result:</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTranscriptionResult(null)}
                          className="h-7 w-7 p-0 rounded-full text-blue-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Title:</p>
                        <p className="text-sm font-medium bg-white p-2 rounded-md border border-blue-100">
                          {transcriptionResult.title}
                        </p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Content:</p>
                        <div className="text-sm bg-white p-2 rounded-md border border-blue-100 whitespace-pre-wrap">
                          {transcriptionResult.content}
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs rounded-md flex items-center gap-1 text-blue-600 border-blue-200"
                          onClick={insertTranscription}
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Insert Again
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div 
                    ref={editorRef} 
                    className="document-editor" 
                    contentEditable={true} 
                    suppressContentEditableWarning={true} 
                    dangerouslySetInnerHTML={{__html:documentContent}}
                  />
                </div>
                </div>
            ) : selectedNote ? (
              <div className={`flex flex-col h-full detail-view-container ${isTransitioning ? 'fade-out' : 'fade-in'}`} style={{transitionDuration:isTransitioning?'150ms':'250ms', willChange:'opacity'}}>
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {isEditingTitle ? <Input ref={titleInputRef} value={editedTitle} onChange={e=>setEditedTitle(e.target.value)} onKeyDown={handleTitleKeyDown} onBlur={updateDocumentTitle} className="text-lg font-medium h-9 rounded-md"/> : <h2 className="text-lg font-medium truncate cursor-text" onDoubleClick={handleStartTitleEdit}>{selectedNote.title}</h2>}
                    <div className="flex items-center mt-1 gap-3 text-sm text-gray-500">
                      <Calendar size={14}/>{safeFormatDate(selectedNote.createdAt, "MMMM d, yyyy")} 
                      {selectedNote.origin==='gmail' && <TooltipProvider><Tooltip><TooltipTrigger><Image src="/gmail.png" alt="Gmail" width={14} height={10}/></TooltipTrigger><TooltipContent>Gmail</TooltipContent></Tooltip></TooltipProvider>} 
                      {/* Only show final status badges in main header - no processing or removed badges */}
                      {selectedNote.inKnowledgeBase && (
                        <Badge 
                          className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-100 rounded-full"
                        >
                          <Check className="h-2 w-2" /> Vault
                            </Badge>
                      )}
                      {selectedNote.inCsVault && (
                        <Badge 
                          className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-purple-50 text-purple-600 border-purple-100 rounded-full"
                        >
                          <Users className="h-2 w-2" /> CS Agent
                        </Badge>
                      )}
                </div>
                    {selectedNote.tags.length > 0 && <div className="flex gap-1 mt-1">{selectedNote.tags.slice(0,2).map(t=><Badge key={t} variant="secondary" className="rounded-full">{t}</Badge>)}{selectedNote.tags.length > 2 && <Badge variant="outline" className="rounded-full">+{selectedNote.tags.length-2}</Badge>}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedNote?.summary && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                              size="icon"
                              className="h-9 w-9 rounded-md text-gray-500"
                              onClick={toggleSummaryDisplay}
                            >
                              <FileText className="h-4 w-4" />
                    </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Summary</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                  <Button 
                                variant="outline" 
                    size="icon" 
                                className="h-9 w-9 rounded-md text-gray-500"
                              >
                                {selectedNote?.inKnowledgeBase ? (
                                  <Database className="h-4 w-4" />
                                ) : selectedNote?.pendingKnowledgeBase ? (
                                  <div className="relative">
                                    <Database className="h-4 w-4" />
                                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full animate-pulse"></span>
                                  </div>
                                ) : (
                                  <Database className="h-4 w-4" />
                                )}
                      </Button>
                    </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              {/* Show Add to Vault only if not already in vault or processing */}
                              {!selectedNote?.inKnowledgeBase && !selectedNote?.pendingKnowledgeBase && (
                                <DropdownMenuItem 
                                  className="gap-2 cursor-pointer text-blue-600"
                                  onClick={addToKnowledgeVault}
                                  disabled={isAddingToVault}
                                >
                                  {isAddingToVault ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <PlusCircle className="h-4 w-4" />
                                  )}
                                  <span>
                                    {isAddingToVault ? "Adding..." : "Add to Vault"}
                                  </span>
                      </DropdownMenuItem>
                              )}
                              
                              {/* Show Remove from Vault only if already in vault */}
                              {selectedNote?.inKnowledgeBase && (
                                <DropdownMenuItem 
                                  className="gap-2 cursor-pointer text-red-500"
                                  onClick={removeFromKnowledgeVault}
                                  disabled={isRemovingFromVault}
                                >
                                  {isRemovingFromVault ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                  <span>
                                    {isRemovingFromVault ? "Removing..." : "Remove from Vault"}
                        </span>
                                </DropdownMenuItem>
                              )}
                              
                              {selectedNote?.pendingKnowledgeBase && (
                                <DropdownMenuItem 
                                  className="gap-2 cursor-pointer text-amber-500"
                                  disabled={true}
                                >
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Adding to Vault...</span>
                                </DropdownMenuItem>
                              )}
                              
                              {/* Add the CS Vault button here */}
                              {!selectedNote?.inCsVault ? (
                                <DropdownMenuItem 
                                  className="gap-2 cursor-pointer text-purple-600"
                                  onClick={sendToCSVault}
                                  disabled={isSendingToCSVault}
                                >
                                  <Users className="h-4 w-4" />
                                  <span>
                                    {isSendingToCSVault ? "Sending..." : "Add to CS Agent"}
                                  </span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  className="gap-2 cursor-pointer text-red-500"
                                  onClick={removeFromCSVault}
                                  disabled={isRemovingFromCSVault}
                                >
                                  {isRemovingFromCSVault ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                  <span>
                                    {isRemovingFromCSVault ? "Removing..." : "Remove from CS Agent"}
                                  </span>
                                </DropdownMenuItem>
                              )}
                              
                        </DropdownMenuContent>
                    </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>Knowledge Base Options</TooltipContent>
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
                        {selectedNote?.type === 'note' && (
                            <DropdownMenuItem 
                            className="gap-2 cursor-pointer"
                            onClick={editExistingNote}
                            >
                            <Pencil className="h-4 w-4" />
                            <span>Edit Content</span>
                            </DropdownMenuItem>
                        )}
                            <DropdownMenuItem 
                          className="gap-2 cursor-pointer"
                          onClick={toggleSummaryDisplay}
                            >
                          <FileText className="h-4 w-4" />
                          <span>View Summary</span>
                            </DropdownMenuItem>
                            {/* Add pin/unpin option */}
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer"
                              onClick={() => {
                                if (selectedNote) togglePinNote(selectedNote.id);
                              }}
                            >
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className="h-4 w-4"
                              >
                                <path d="M12 17v5" />
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
                              </svg>
                              <span>{selectedNote?.pinned ? "Unpin" : "Pin to Top"}</span>
                            </DropdownMenuItem>
                            {/* Knowledge Base and CS Agent options moved to dedicated Knowledge Base dropdown */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                          className="gap-2 cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteDialogOpen(true)}
                            >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                  </div>
                </div>
                <div className="flex-grow overflow-auto p-6 bg-gray-50/50 rounded-md">
                  {renderFilePreview()}
                </div>
                {relatedNotes.length > 0 && (
                  <div className="px-6 py-2 border-t">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex h-6 items-center text-gray-500">
                                <Share2 className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                            </TooltipTrigger>
                            <TooltipContent className="custom-tooltip">
                              <span className="text-gray-800">Similar Documents</span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex flex-wrap gap-1.5">
                          {relatedNotes.map(rn => (
                            <TooltipProvider key={rn.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    key={rn.id} 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 px-2 rounded-md flex items-center gap-1"
                              onClick={() => {
                                      const fullNote = notes.find(n => n.id === rn.id);
                                      if (fullNote) handleNoteSelection(fullNote);
                                    }}
                                  >
                                    {rn.type === 'pdf' ? (
                                      <FileIcon className="h-3 w-3 text-red-500 flex-shrink-0" />
                                    ) : rn.type === 'image' ? (
                                      <ImageIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                    ) : rn.type === 'invoice' ? (
                                      <FileText className="h-3 w-3 text-green-500 flex-shrink-0" />
                                    ) : rn.type === 'note' ? (
                                      <FileText className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                                    ) : (
                                      <FileIcon className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                    )}
                                    <span className="truncate max-w-[120px]">{rn.title}</span>
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="custom-tooltip p-2 text-xs max-w-xs">
                                  <div className="flex flex-col">
                                    <p className="font-medium text-gray-800">{rn.title}</p>
                                    <p className="text-gray-600 mt-1 text-xs">{rn.summary || "No description"}</p>
                                    <div className="mt-1.5">
                                      <Badge className="text-[10px] px-1.5 py-0 h-3.5 bg-blue-50 text-blue-500 border-blue-100 rounded-full">
                                        {Math.round(rn.score * 100)}% match
                                      </Badge>
                        </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                    </div>
                      {relatedNotes.length > 3 && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs">
                          View all
                  </Button>
                      )}
                      </div>
                        </div>
                      )}
                    </div>
                  ) : (
              <div className="h-full flex items-center justify-center p-8"><div className="text-center"><FileText className="h-12 w-12 mx-auto text-gray-300 mb-4"/><h3 className="text-xl font-medium mb-2">Select or Create a Document</h3><p className="text-gray-500 mb-4">Choose from the list or start a new one.</p><div className="flex gap-3 justify-center"><Button variant="outline" className="rounded-md" onClick={handleNewDocument}><Plus size={16}/>Create</Button><Button className="rounded-md" onClick={()=>setUploadDialogOpen(true)}><FileUp size={16}/>Upload</Button></div></div></div>
                  )}
                </div>
        </div>
      </div>
      
      {/* Upload Dialog - ensure all rounded-md */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        if (!open && typeof window !== 'undefined') localStorage.removeItem('auto_add_to_cs_vault');
        setUploadDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md max-w-[95vw] rounded-md">
          <DialogHeader>
            <DialogTitle>
              {(typeof window !== 'undefined' && localStorage.getItem('auto_add_to_cs_vault') === 'true')
                ? "Upload Document to CS Agent" 
                : "Upload Document"}
            </DialogTitle>
            <DialogDescription>
              {(typeof window !== 'undefined' && localStorage.getItem('auto_add_to_cs_vault') === 'true')
                ? "This document will be automatically added to your CS Agent."
                : "Add a new file to your collection."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label htmlFor="file-upload">File</Label>
              {uploadFile ? (
                <div className="flex items-center mt-1.5 mb-1">
                  <div className="flex-1 bg-gray-50 border rounded-l-md p-2 truncate">
                    <span className="text-sm font-medium">{uploadFile.name}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="rounded-l-none rounded-r-md h-9 px-3 border-l-0"
                    onClick={() => {
                      setUploadFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Input 
                  id="file-upload" 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="rounded-md" 
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              )}
              {uploadFile && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-600 font-medium">File selected</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB • {uploadFile.type || "Unknown type"}
                  </span>
                </div>
              )}
            </div>
            <div><Label htmlFor="file-title">Title</Label><Input id="file-title" value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="Document title" className="rounded-md"/></div>
            <div><Label htmlFor="file-summary">Description (Optional)</Label><Textarea id="file-summary" value={uploadSummary} onChange={e=>setUploadSummary(e.target.value)} placeholder="Brief summary..." rows={2} className="rounded-md resize-none"/></div>
            <div><Label htmlFor="file-tags">Tags (Optional, comma-separated)</Label><Input id="file-tags" value={uploadTags} onChange={e=>setUploadTags(e.target.value)} placeholder="e.g., work, important" className="rounded-md"/></div>
            {uploading && (
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all" 
                    style={{width: `${uploadProgress}%`}}
                  />
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {Math.round(uploadProgress)}% complete
                </div>
              </div>
            )}
            
            {(typeof window !== 'undefined' && localStorage.getItem('auto_add_to_cs_vault') === 'true') && (
              <div className="flex items-center p-3 bg-purple-50 rounded-md border border-purple-100">
                <Users className="h-4 w-4 text-purple-500 mr-2 flex-shrink-0" />
                <p className="text-sm text-purple-700">
                  This document will be automatically added to your CS Agent after upload.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              className="rounded-md" 
              onClick={()=>{resetUploadForm();setUploadDialogOpen(false);}} 
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              className={cn(
                "rounded-md", 
                (typeof window !== 'undefined' && localStorage.getItem('auto_add_to_cs_vault') === 'true') ? 
                  "bg-purple-600 hover:bg-purple-700" : "",
                !uploadFile ? "opacity-50 cursor-not-allowed" : ""
              )} 
              onClick={handleUpload} 
              disabled={!uploadFile || uploading}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Uploading...</>
              ) : (
                <><FileUp size={16} className="mr-2"/>Upload</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog - ensure all rounded-md */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader><AlertDialogTitle>Delete Document</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{selectedNote?.title}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-md" disabled={deletingFile}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-500 hover:bg-red-600 rounded-md" onClick={handleDeleteFile} disabled={deletingFile}>{deletingFile ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Deleting...</> : <><Trash2 size={16} className="mr-2"/>Delete</>}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Vault Info Drawer - replacing the dialog above */}
      <div 
        className={`vault-info-backdrop ${showVaultInfo ? 'open' : ''}`} 
        onClick={() => setShowVaultInfo(false)}
      />
      <div className={`vault-info-drawer ${showVaultInfo ? 'open' : ''}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 text-blue-600 h-8 w-8 rounded-md flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-medium">Document Vault</h2>
                <p className="text-sm text-gray-500">Understanding the Knowledge Management System</p>
              </div>
            </div>
                <Button 
                  variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-md"
              onClick={() => setShowVaultInfo(false)}
            >
              <X className="h-4 w-4" />
                </Button>
              </div>
          
          <div className="space-y-5 mt-4">
            <div>
              <h3 className="text-sm font-medium mb-1">What is the Document Vault?</h3>
              <p className="text-sm text-gray-600">
                The Document Vault is a centralised knowledge database that stores and indexes all your documents, making them searchable and accessible for AI interactions.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1">How it Works</h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal pl-5">
                <li>
                  <span className="font-medium">Document Upload:</span> When you upload or create documents, they are stored in your vault.
                </li>
                <li>
                  <span className="font-medium">Automatic Processing:</span> Documents are processed, indexed, and made searchable.
                </li>
                <li>
                  <span className="font-medium">AI Integration:</span> The knowledge from your documents becomes available to AI assistants.
                </li>
                <li>
                  <span className="font-medium">Semantic Search:</span> Ask questions about your documents using natural language.
                </li>
              </ol>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
              <h3 className="text-sm font-medium mb-1 text-blue-700">Benefits</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                <li>Centralised document storage with smart organisation</li>
                <li>Ask questions about your documents using natural language</li>
                <li>Share knowledge with customer service agents</li>
                <li>
                  <div className="flex items-center gap-1.5">
                    <span>Automatic Gmail integration for emails and attachments</span>
                    <Image 
                      src="/gmail.png" 
                      alt="Gmail" 
                      width={14} 
                      height={10}
                      className="object-contain" 
                    />
                    </div>
                </li>
                <li>Intelligent connections between related documents</li>
              </ul>
                </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1">Document Status Indicators</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-100 rounded-full">
                    <Check className="h-2 w-2" /> Vault
                  </Badge>
                  <span className="text-sm text-gray-600">Document is processed and available in the knowledge base</span>
            </div>
                <div className="flex items-center gap-2">
                  <Badge className="flex items-center gap-0.5 text-[10px] h-4 px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-100 rounded-full">
                    <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse mr-0.5"></span> Adding to Vault
                  </Badge>
                  <span className="text-sm text-gray-600">Document is being added to the knowledge base</span>
          </div>
                {/* Remove the CS Agent badge block below this */}
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <Button className="rounded-md" onClick={() => setShowVaultInfo(false)}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 