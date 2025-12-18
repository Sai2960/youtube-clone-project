// server/routes/call.js - COMPLETE FIXED VERSION
import express from 'express';
import {
  initiateCall,
  updateCallStatus,
  getCallHistory,
  getCallDetails,
  getCallStats
} from '../controllers/callController.js';
import { verifyToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Ensure recordings directory exists
const recordingsDir = path.join(__dirname, '../uploads/recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
  console.log('✅ Created recordings directory');
}

// ✅ Configure multer for recording uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, recordingsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `call-recording-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'video/webm',
    'video/mp4',
    'audio/webm',
    'audio/wav',
    'audio/mp3'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
});

// ==========================================
// CALL MANAGEMENT ROUTES
// ==========================================

// Initiate a new call
router.post('/initiate', verifyToken, initiateCall);

// Update call status (ongoing, ended, etc.)
router.put('/:callId/status', verifyToken, updateCallStatus);

// Get user's call history
router.get('/history', verifyToken, getCallHistory);

// Get call statistics
router.get('/stats', verifyToken, getCallStats);

// Get specific call details
router.get('/details/:roomId', verifyToken, getCallDetails);

// ==========================================
// RECORDING ROUTES
// ==========================================

// Upload recording endpoint with multer
router.post('/upload-recording', verifyToken, upload.single('recording'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No recording file uploaded' 
      });
    }

    const recordingUrl = `/uploads/recordings/${req.file.filename}`;

    console.log('✅ Recording uploaded:', recordingUrl);
    console.log('   File size:', (req.file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('   File type:', req.file.mimetype);

    res.json({
      success: true,
      recordingUrl,
      fileName: req.file.filename,
      fileSize: req.file.size,
      fileSizeMB: (req.file.size / 1024 / 1024).toFixed(2),
      mimeType: req.file.mimetype,
      message: 'Recording saved successfully'
    });
  } catch (error) {
    console.error('❌ Error uploading recording:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Download recording endpoint
router.get('/download-recording/:filename', verifyToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(recordingsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('❌ Error downloading file:', err);
        res.status(500).json({
          success: false,
          message: 'Error downloading recording'
        });
      }
    });
  } catch (error) {
    console.error('❌ Error in download endpoint:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get list of all recordings for a user
router.get('/recordings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    // Get all calls with recordings for this user
    const Call = (await import('../Modals/Call.js')).default;
    
    const calls = await Call.find({
      $or: [{ initiator: userId }, { receiver: userId }],
      hasRecording: true
    })
      .populate('initiator', 'channelname name image')
      .populate('receiver', 'channelname name image')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      recordings: calls,
      count: calls.length
    });
  } catch (error) {
    console.error('❌ Error fetching recordings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;