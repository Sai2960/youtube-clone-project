import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';
import connectDB from '../../../lib/mongodb';
import Video from '../../../models/Video';

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
    // Verify authentication
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Decode token (simplified - add proper JWT verification)
    let userId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.userId || payload.id;
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Connect to database
    await connectDB();

    // Parse form data
    const form = formidable({ maxFileSize: 100 * 1024 * 1024 }); // 100MB limit
    const [fields, files] = await form.parse(req);

    const videoFile = files.file?.[0];
    if (!videoFile) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    console.log('📤 Uploading to Vercel Blob:', videoFile.originalFilename);

    // Read file buffer
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

    console.log('✅ Uploaded to Vercel Blob:', blob.url);

    // Save to MongoDB
    const video = new Video({
      title: fields.videotitle?.[0] || 'Untitled',
      videotitle: fields.videotitle?.[0] || 'Untitled',
      description: fields.videodescription?.[0] || '',
      videodescription: fields.videodescription?.[0] || '',
      videoLink: blob.url,
      filepath: blob.url,
      thumbnail: blob.url, // Generate thumbnail later
      videofilename: blob.pathname,
      uploadedBy: userId,
      videochanel: fields.videochanel?.[0] || 'Unknown',
      category: fields.category?.[0] || 'General',
    });

    await video.save();

    // Cleanup temp file
    fs.unlinkSync(videoFile.filepath);

    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      video,
      videoUrl: blob.url,
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Upload failed'
    });
  }
}