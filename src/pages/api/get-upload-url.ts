import { NextApiRequest, NextApiResponse } from 'next';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    storageBucket: 'tap-loyalty-fb6d0.firebasestorage.app'
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { merchantId, fileName, contentType } = req.body;
    
    if (!merchantId || !fileName || !contentType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const bucket = admin.storage().bucket();
    const filePath = `merchants/${merchantId}/logo/${Date.now()}-${fileName}`;
    const file = bucket.file(filePath);
    
    // Generate a signed URL for uploading
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });
    
    // Generate a signed URL for reading (to return after upload)
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    
    return res.status(200).json({ 
      uploadUrl,
      downloadUrl,
      filePath
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
} 