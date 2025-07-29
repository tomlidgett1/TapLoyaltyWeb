'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, File, FileText, Image, Video, Music, Archive, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  emailId: string;
  threadId: string;
  emailSubject: string;
  sender: string;
  date: Date;
  downloadUrl?: string;
}

export default function AttachmentsPage() {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(
      collection(db, 'merchants', user.uid, 'emails'),
      async (snapshot) => {
        const allAttachments: Attachment[] = [];
        
        for (const emailDoc of snapshot.docs) {
          const emailData = emailDoc.data();
          if (emailData.attachments && Array.isArray(emailData.attachments)) {
            for (const attachment of emailData.attachments) {
              allAttachments.push({
                id: `${emailDoc.id}-${attachment.filename}`,
                filename: attachment.filename,
                contentType: attachment.contentType,
                size: attachment.size || 0,
                emailId: emailDoc.id,
                threadId: emailData.threadId || emailDoc.id,
                emailSubject: emailData.subject || 'No Subject',
                sender: emailData.sender || 'Unknown',
                date: emailData.timestamp?.toDate() || new Date(),
                downloadUrl: attachment.downloadUrl
              });
            }
          }
        }

        setAttachments(allAttachments);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching attachments:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (contentType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (contentType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (contentType.includes('zip') || contentType.includes('rar') || contentType.includes('tar')) return <Archive className="h-4 w-4" />;
    if (contentType.includes('pdf') || contentType.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (contentType: string) => {
    if (contentType.startsWith('image/')) return 'Image';
    if (contentType.startsWith('video/')) return 'Video';
    if (contentType.startsWith('audio/')) return 'Audio';
    if (contentType.includes('pdf')) return 'PDF';
    if (contentType.includes('document') || contentType.includes('word')) return 'Document';
    if (contentType.includes('sheet') || contentType.includes('excel')) return 'Spreadsheet';
    if (contentType.includes('presentation') || contentType.includes('powerpoint')) return 'Presentation';
    if (contentType.includes('zip') || contentType.includes('rar') || contentType.includes('tar')) return 'Archive';
    return 'File';
  };

  const filteredAttachments = attachments
    .filter(attachment => {
      const matchesSearch = attachment.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           attachment.emailSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           attachment.sender.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || getFileType(attachment.contentType).toLowerCase() === filterType.toLowerCase();
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename);
        case 'size':
          return b.size - a.size;
        case 'date':
        default:
          return b.date.getTime() - a.date.getTime();
      }
    });

  const handleDownload = async (attachment: Attachment) => {
    if (attachment.downloadUrl) {
      window.open(attachment.downloadUrl, '_blank');
    } else {
      // Fallback: try to download from email data
      try {
        const emailDoc = await getDoc(doc(db, 'merchants', user!.uid, 'emails', attachment.emailId));
        const emailData = emailDoc.data();
        const attachmentData = emailData?.attachments?.find((a: any) => a.filename === attachment.filename);
        
        if (attachmentData?.data) {
          // Convert base64 to blob and download
          const byteCharacters = atob(attachmentData.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: attachment.contentType });
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = attachment.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (error) {
        console.error('Error downloading attachment:', error);
        alert('Unable to download attachment');
      }
    }
  };

  const fileTypes = ['all', 'image', 'video', 'audio', 'pdf', 'document', 'spreadsheet', 'presentation', 'archive'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Email
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Attachments</h1>
              <p className="text-sm text-gray-500">
                {filteredAttachments.length} of {attachments.length} attachments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search attachments, subjects, or senders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fileTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attachments Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredAttachments.length === 0 ? (
          <div className="text-center py-12">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No attachments found</h3>
            <p className="text-gray-500">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No attachments have been found in your emails'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-gray-500">
                      {getFileIcon(attachment.contentType)}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {getFileType(attachment.contentType)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-900 truncate" title={attachment.filename}>
                    {attachment.filename}
                  </h3>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{formatFileSize(attachment.size)}</p>
                    <p className="truncate" title={attachment.emailSubject}>
                      Subject: {attachment.emailSubject}
                    </p>
                    <p className="truncate" title={attachment.sender}>
                      From: {attachment.sender}
                    </p>
                    <p>{format(attachment.date, 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 