// server/routes/translation.js - COMPLETE ROUTES
import express from 'express';
import { 
  translateComment, 
  detectCommentLanguage, 
  batchTranslateComments 
} from '../controllers/translation.js';

const router = express.Router();

// Main translation endpoint
router.post('/comment/:id', translateComment);

// Language detection endpoint
router.post('/detect', detectCommentLanguage);

// Batch translation endpoint
router.post('/batch', batchTranslateComments);

export default router;