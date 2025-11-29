import express from 'express';
import { submitReport, getAllReports, updateReportStatus } from '../controllers/reportController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Submit a report (requires authentication)
router.post('/submit', verifyToken, submitReport);

// Get all reports (admin only)
router.get('/all', verifyToken, getAllReports);

// Update report status (admin only)
router.patch('/:id/status', verifyToken, updateReportStatus);

export default router;