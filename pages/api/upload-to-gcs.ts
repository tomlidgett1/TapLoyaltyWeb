import { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from '@google-cloud/storage';
import formidable from 'formidable';
import fs from 'fs';

// Disable body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const storage = new Storage({
  projectId: 'tap-loyalty-fb6d0', // Replace with your actual project ID
  // keyFilename: 'path/to/service-account-key.json', // Add your service account key
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const bucket = Array.isArray(fields.bucket) ? fields.bucket[0] : fields.bucket;
    const path = Array.isArray(fields.path) ? fields.path[0] : fields.path;

    if (!file || !bucket || !path) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the GCS bucket
    const gcsBucket = storage.bucket(bucket);
    
    // Create a file reference in GCS
    const gcsFile = gcsBucket.file(path);

    // Read the uploaded file
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to GCS
    await gcsFile.save(fileBuffer, {
      metadata: {
        contentType: file.mimetype || 'application/octet-stream',
      },
    });

    // Generate a signed URL for accessing the file (optional)
    const [url] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Clean up the temporary file
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      success: true,
      url: url,
      gsPath: `gs://${bucket}/${path}`,
      message: 'File uploaded successfully',
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 