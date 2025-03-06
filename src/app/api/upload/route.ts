import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    
    if (!file || !path) {
      return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
    }
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Firebase Storage
    const fileRef = ref(storage, path);
    const uploadResult = await uploadBytes(fileRef, buffer, { contentType: file.type });
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    return NextResponse.json({ url: downloadUrl, path });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 