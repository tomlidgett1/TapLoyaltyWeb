import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Fields, Files } from 'formidable';
import * as admin from 'firebase-admin';
import fs from 'fs';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      // Your service account details
    }),
    storageBucket: 'tap-loyalty-fb6d0.firebasestorage.app' // Updated to the correct bucket name
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();
    
    form.parse(req, async (err: Error | null, fields: Fields, files: Files) => {
      if (err) {
        return res.status(500).json({ error: 'Error parsing form' });
      }

      const file = files.file[0];
      const merchantId = fields.merchantId[0];
      
      const bucket = admin.storage().bucket();
      const filename = `merchants/${merchantId}/logo/${Date.now()}-${file.originalFilename}`;
      
      await bucket.upload(file.filepath, {
        destination: filename,
        metadata: {
          contentType: file.mimetype,
        },
      });
      
      const [url] = await bucket.file(filename).getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Far future expiration
      });
      
      return res.status(200).json({ url });
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Error uploading file' });
  }
} 