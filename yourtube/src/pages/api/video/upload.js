import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';
import connectDB from '../../../lib/mongodb';
import Video from '../../../server/Modals/video'; // ✅ Fixed path

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

    // Decode token
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

    // Save to MongoDB using your schema
    const video = new Video({
      // Required fields from your schema
      videotitle: fields.videotitle?.[0] || 'Untitled',
      title: fields.videotitle?.[0] || 'Untitled',
      videodescription: fields.videodescription?.[0] || '',
      description: fields.videodescription?.[0] || '',
      
      // Video file paths
      videofile: blob.url,
      videoLink: blob.url,
      filepath: blob.url,
      videofilename: blob.pathname,
      filename: blob.pathname,
      
      // Thumbnails (you can generate these later)
      videothumb: blob.url,
      thumbnail: blob.url,
      videothumbnail: blob.url,
      thumbnailUrl: blob.url,
      
      // File metadata
      filetype: videoFile.mimetype,
      filesize: videoFile.size.toString(),
      videotype: 'video',
      videoType: 'video',
      
      // Ownership - both fields required in your schema
      uploadedBy: userId,
      user: userId,
      
      // Channel info
      videochanel: fields.videochanel?.[0] || 'Unknown',
      channelName: fields.channelName?.[0] || 'Unknown',
      
      // Categorization
      category: fields.category?.[0] || 'General',
      visibility: fields.visibility?.[0] || 'public',
      tags: fields.tags ? JSON.parse(fields.tags[0]) : [],
      
      // Initialize engagement metrics
      views: 0,
      Like: 0,
      Dislike: 0,
      likes: 0,
      dislikes: 0,
      shareCount: 0,
      shares: {
        total: 0,
        platforms: {
          whatsapp: 0,
          facebook: 0,
          twitter: 0,
          telegram: 0,
          linkedin: 0,
          reddit: 0,
          instagram: 0,
          copy: 0,
          other: 0,
        },
      },
      averageWatchTime: 0,
      totalWatchTime: 0,
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
      message: error.message || 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}