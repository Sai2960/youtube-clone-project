// server/routes/shortTranslation.js - SHORT TRANSLATION ROUTES
import express from 'express';
import { translateShort, batchTranslateShorts } from '../controllers/shortTranslationController.js';

const router = express.Router();

console.log('🌐 ===== SHORT TRANSLATION ROUTES =====');
console.log('   Loading translation endpoints...');

// ==========================================
// SINGLE SHORT TRANSLATION
// ==========================================
// POST /api/shorts/translate/:id
// Body: { targetLanguage: 'es' }
router.post('/:id', async (req, res, next) => {
  console.log(`\n📥 Translation request received`);
  console.log(`   Short ID: ${req.params.id}`);
  console.log(`   Target Language: ${req.body.targetLanguage}`);
  
  try {
    await translateShort(req, res);
  } catch (error) {
    console.error('❌ Translation route error:', error);
    next(error);
  }
});

// ==========================================
// BATCH TRANSLATION
// ==========================================
// POST /api/shorts/translate/batch
// Body: { shortIds: ['id1', 'id2'], targetLanguage: 'fr' }
router.post('/batch', async (req, res, next) => {
  console.log(`\n📦 Batch translation request received`);
  console.log(`   Shorts count: ${req.body.shortIds?.length || 0}`);
  console.log(`   Target Language: ${req.body.targetLanguage}`);
  
  try {
    await batchTranslateShorts(req, res);
  } catch (error) {
    console.error('❌ Batch translation route error:', error);
    next(error);
  }
});

console.log('✅ Short translation routes loaded successfully');
console.log('   📍 POST /api/shorts/translate/:id (Single translation)');
console.log('   📍 POST /api/shorts/translate/batch (Batch translation)');
console.log('=====================================\n');

export default router;