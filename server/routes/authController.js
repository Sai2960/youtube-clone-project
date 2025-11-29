import express from 'express';
import { login, updateprofile } from '../controllers/authController.js';

const router = express.Router();

// Authentication routes only
router.post('/login', login);
router.patch('/update/:id', updateprofile);

export default router;