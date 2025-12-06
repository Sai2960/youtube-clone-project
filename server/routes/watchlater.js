import express from 'express';
import { handlewatchlater, getallwatchlater } from '../controllers/watchlater.js';

const router = express.Router();

// GET /watch/:userId - Get all watch later videos for a user
router.get('/:userId', getallwatchlater);

// POST /watch/:videoId - Toggle watch later on a video
router.post('/:videoId', handlewatchlater);

export default router;