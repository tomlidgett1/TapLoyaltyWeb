// This is a simplified version of the email page with the attachments view feature
// The actual implementation will merge this with the full email page

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Paperclip, 
  ArrowLeft, 
  Search, 
  X, 
  Download, 
  Mail, 
  FileX 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Simplified email page component
export default function EmailPageWithAttachments() {
  // State for attachments view
  const [showAttachmentsView, setShowAttachmentsView] = useState(false);
  const [allAttachments, setAllAttachments] = useState<any[]>([]);
  
  // Function to collect all attachments from emails
  const collectAllAttachments = () => {
    // This would be implemented to collect attachments from all emails
    return [];
  };

  // Toggle attachments view
  const toggleAttachmentsView = () => {
    if (!showAttachmentsView) {
      // When enabling attachments view, collect all attachments
      const collected = collectAllAttachments();
      setAllAttachments(collected);
    }
    setShowAttachmentsView(!showAttachmentsView);
  };
  
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F5F5F5]">
      {/* Top Bar with Attachments Button */}
      <div className="mx-3 mt-3 mb-3 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Other toolbar buttons would go here */}
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          
          {/* Attachments Button */}
          <Button 
            variant={showAttachmentsView ? "default" : "ghost"}
            size="sm" 
            onClick={toggleAttachmentsView} 
            className={showAttachmentsView 
              ? "bg-blue-500 hover:bg-blue-600 text-white" 
              : "text-gray-700 hover:bg-gray-200"
            }
          >
            <Paperclip className="h-4 w-4 mr-1" />
            {showAttachmentsView ? "Back to Emails" : "View All Attachments"}
          </Button>
        </div>
        
        {/* Right side of toolbar would go here */}
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 min-h-0 px-3 pb-3 main-panels-container">
        {showAttachmentsView ? (
          /* Attachments View - Full Width */
          <div className="flex-1">
            <AttachmentsView 
              attachments={allAttachments} 
              onBack={toggleAttachmentsView}
              onSelectEmail={(emailId, threadId) => {
                // Exit attachments view
                setShowAttachmentsView(false);
                
                // Would find and select the email in the real implementation
                console.log(`Select email: ${emailId}, thread: ${threadId}`);
              }}
            />
          </div>
        ) : (
          /* Normal Email View with Left and Right Panels */
          <div className="flex w-full">
            {/* Left Panel - Email List Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full mr-1 w-1/3">
              {/* Email list would go here */}
              <div className="p-4">Email list panel</div>
            </div>
            
            {/* Right Panel - Email Viewer Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 flex-1 flex flex-col min-w-0">
              {/* Email viewer would go here */}
              <div className="p-4">Email viewer panel</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Attachments View Component - Shows all attachments in a grid
const AttachmentsView = ({ 
  attachments, 
  onBack,
  onSelectEmail
}: { 
  attachments: any[]; 
  onBack: () => void;
  onSelectEmail: (emailId: string, threadId?: string) => void;
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort and filter attachments
  const sortedAndFilteredAttachments = useMemo(() => {
    let filtered = [...attachments];
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(att => 
        (att.filename && att.filename.toLowerCase().includes(lowerSearchTerm)) ||
        (att.emailSubject && att.emailSubject.toLowerCase().includes(lowerSearchTerm)) ||
        (att.emailSender && att.emailSender.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.filename || '').localeCompare(b.filename || '');
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          const typeA = a.filename ? a.filename.split('.').pop() || '' : '';
          const typeB = b.filename ? b.filename.split('.').pop() || '' : '';
          comparison = typeA.localeCompare(typeB);
          break;
        case 'date':
        default:
          // Convert to dates for comparison
          const dateA = a.emailDate instanceof Date ? a.emailDate : new Date(a.emailDate);
          const dateB = b.emailDate instanceof Date ? b.emailDate : new Date(b.emailDate);
          comparison = dateA.getTime() - dateB.getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [attachments, sortBy, sortOrder, searchTerm]);
  
  const handleSort = (newSortBy: 'date' | 'name' | 'size' | 'type') => {
    if (sortBy === newSortBy) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column and default to descending for date, ascending for others
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'date' ? 'desc' : 'asc');
    }
  };
  
  const handleAttachmentClick = (attachment: any) => {
    if (attachment.s3url) {
      window.open(attachment.s3url, '_blank');
    } else {
      console.warn('No s3url found for attachment:', attachment);
    }
  };
  
  const handleEmailClick = (attachment: any) => {
    if (attachment.emailId) {
      onSelectEmail(attachment.emailId, attachment.threadId);
    }
  };
  
  // Group attachments by date
  const groupedByDate = useMemo(() => {
    const groups: {[key: string]: any[]} = {};
    
    sortedAndFilteredAttachments.forEach(attachment => {
      const date = attachment.emailDate instanceof Date 
        ? attachment.emailDate 
        : new Date(attachment.emailDate);
      
      const dateKey = date.toLocaleDateString('en-AU', { 
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(attachment);
    });
    
    return groups;
  }, [sortedAndFilteredAttachments]);
  
  // Helper function to get file icon
  const getFileIcon = (mimeType: string, filename: string) => {
    return <Paperclip className="h-4 w-4 text-gray-500" />;
  };
  
  // Helper function to format file size
  const formatFileSize = (sizeInBytes: number): string => {
    if (!sizeInBytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = sizeInBytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
  
  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Header with back button and title */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-medium">All Attachments</h2>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search attachments..."
            className="pl-10 pr-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Sort controls */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
        <span className="text-sm text-gray-500">Sort by:</span>
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs h-7 ${sortBy === 'date' ? 'bg-gray-200' : ''}`}
          onClick={() => handleSort('date')}
        >
          Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs h-7 ${sortBy === 'name' ? 'bg-gray-200' : ''}`}
          onClick={() => handleSort('name')}
        >
          Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs h-7 ${sortBy === 'size' ? 'bg-gray-200' : ''}`}
          onClick={() => handleSort('size')}
        >
          Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs h-7 ${sortBy === 'type' ? 'bg-gray-200' : ''}`}
          onClick={() => handleSort('type')}
        >
          Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
      </div>
      
      {/* Attachments grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedAndFilteredAttachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileX className="h-12 w-12 mb-2" />
            <p>No attachments found</p>
          </div>
        ) : (
          sortBy === 'date' ? (
            // Group by date when sorting by date
            Object.entries(groupedByDate).map(([dateGroup, attachments]) => (
              <div key={dateGroup} className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">{dateGroup}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {attachments.map((attachment, index) => (
                    <div 
                      key={`${attachment.attachmentId || ''}-${index}`}
                      className="border border-gray-200 rounded-md p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {getFileIcon(attachment.mimeType || '', attachment.filename || '')}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={attachment.filename}>
                            {attachment.filename || 'Unknown file'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.size || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
                        <p className="truncate" title={attachment.emailSubject}>
                          <span className="font-medium">Subject:</span> {attachment.emailSubject}
                        </p>
                        <p className="truncate" title={attachment.emailSender}>
                          <span className="font-medium">From:</span> {attachment.emailSender}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => handleEmailClick(attachment)}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          View Email
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => handleAttachmentClick(attachment)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Open
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Simple grid for other sort types
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedAndFilteredAttachments.map((attachment, index) => (
                <div 
                  key={`${attachment.attachmentId || ''}-${index}`}
                  className="border border-gray-200 rounded-md p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {getFileIcon(attachment.mimeType || '', attachment.filename || '')}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={attachment.filename}>
                        {attachment.filename || 'Unknown file'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.size || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
                    <p className="truncate" title={attachment.emailSubject}>
                      <span className="font-medium">Subject:</span> {attachment.emailSubject}
                    </p>
                    <p className="truncate" title={attachment.emailSender}>
                      <span className="font-medium">From:</span> {attachment.emailSender}
                    </p>
                    <p className="truncate">
                      <span className="font-medium">Date:</span> {
                        new Date(attachment.emailDate).toLocaleDateString('en-AU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      }
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => handleEmailClick(attachment)}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      View Email
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => handleAttachmentClick(attachment)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}; 