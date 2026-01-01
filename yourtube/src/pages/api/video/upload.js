import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Decode token to get user ID
    let userId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.userId || payload.id;
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Parse the uploaded file
    const form = formidable({ 
      maxFileSize: 100 * 1024 * 1024, // 100MB max
      keepExtensions: true
    });
    
    const [fields, files] = await form.parse(req);
    const videoFile = files.file?.[0];
    
    if (!videoFile) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    console.log('📤 Uploading to Vercel Blob:', videoFile.originalFilename);

    // Read the file
    const fileBuffer = fs.readFileSync(videoFile.filepath);

    // Upload to Vercel Blob
    const blob = await put(
      `videos/${Date.now()}-${videoFile.originalFilename}`,
      fileBuffer,
      {
        access: 'public',
        contentType: videoFile.mimetype,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    );

    console.log('✅ Uploaded:', blob.url);

    // Delete temp file
    fs.unlinkSync(videoFile.filepath);

    // Send success response
    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      videoUrl: blob.url,
      videoId: blob.pathname,
      metadata: {
        title: fields.videotitle?.[0] || 'Untitled',
        description: fields.videodescription?.[0] || '',
        channel: fields.videochanel?.[0] || 'Unknown',
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message
    });
  }
}