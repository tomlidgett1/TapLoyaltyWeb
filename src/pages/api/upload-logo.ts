import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import * as admin from 'firebase-admin';
import fs from 'fs';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    // Parse the form data
    const form = new formidable.IncomingForm();
    
    // Parse the request
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Get the file and merchant ID
    const file = files.file as formidable.File;
    const merchantId = fields.merchantId as string;
    
    if (!file || !merchantId) {
      return res.status(400).json({ error: 'Missing file or merchantId' });
    }

    // Get the file path and read the file
    const filePath = file.filepath;
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `merchants/${merchantId}/logo/${Date.now()}-${file.originalFilename}`;
    const fileUpload = bucket.file(fileName);
    
    // Upload the file
    await fileUpload.save(fileBuffer, {
      metadata: {
        contentType: file.mimetype || 'application/octet-stream',
      },
    });
    
    // Get the download URL
    const [downloadUrl] = await fileUpload.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Far future
    });
    
    // Clean up the temporary file
    fs.unlinkSync(filePath);
    
    // Return the download URL
    return res.status(200).json({ url: downloadUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Error uploading file' });
  }
} 