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
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Configure multer for recording uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/recordings'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `call-recording-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept video/audio files for recordings
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

// ✅ ALL ROUTES REQUIRE AUTHENTICATION
router.post('/initiate', verifyToken, initiateCall);
router.put('/:callId/status', verifyToken, updateCallStatus);
router.get('/history', verifyToken, getCallHistory);
router.get('/stats', verifyToken, getCallStats);
router.get('/details/:roomId', verifyToken, getCallDetails);

// ✅ Upload recording endpoint with multer
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

// ✅ Download recording endpoint
router.get('/download-recording/:filename', verifyToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/recordings', filename);

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

export default router;