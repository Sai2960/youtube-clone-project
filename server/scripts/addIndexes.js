// scripts/addIndexes.js - FIXED VERSION
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import videofiles from '../Modals/video.js';

const addIndexes = async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');
    console.log('   DB URL exists:', !!process.env.DB_URL);
    
    await mongoose.connect(process.env.DB_URL, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('📊 Checking and creating performance indexes...\n');
    
    // Get existing indexes
    const existingIndexes = await videofiles.collection.getIndexes();
    console.log('📋 Existing indexes:', Object.keys(existingIndexes).join(', '));
    console.log('');
    
    // Helper function to create index if it doesn't exist
    const createIndexIfNotExists = async (indexSpec, indexName, description) => {
      try {
        if (existingIndexes[indexName]) {
          console.log(`   ⏭️  Index "${indexName}" already exists - skipping`);
          return;
        }
        
        await videofiles.collection.createIndex(indexSpec);
        console.log(`   ✅ Created: ${description}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`   ℹ️  Index for ${description} already exists with different options - skipping`);
        } else {
          throw error;
        }
      }
    };
    
    // Create indexes (only if they don't exist)
    await createIndexIfNotExists(
      { createdAt: -1 }, 
      'createdAt_-1',
      'createdAt (descending) - for recent videos'
    );
    
    await createIndexIfNotExists(
      { views: -1 }, 
      'views_-1',
      'views (descending) - for popular videos'
    );
    
    await createIndexIfNotExists(
      { uploadedBy: 1 }, 
      'uploadedBy_1',
      'uploadedBy - for channel videos'
    );
    
    await createIndexIfNotExists(
      { uploadedBy: 1, createdAt: -1 }, 
      'uploadedBy_1_createdAt_-1',
      'uploadedBy + createdAt - for channel recent videos'
    );
    
    await createIndexIfNotExists(
      { views: -1, createdAt: -1 }, 
      'views_-1_createdAt_-1',
      'views + createdAt - for trending videos'
    );
    
    // Text search index - skip if exists
    if (!existingIndexes['videotitle_text_videodescription_text']) {
      try {
        await videofiles.collection.createIndex({ 
          videotitle: 'text', 
          videodescription: 'text'
        });
        console.log('   ✅ Created: text search index (title + description)');
      } catch (error) {
        if (error.code === 85) {
          console.log('   ℹ️  Text search index already exists - skipping');
        } else {
          throw error;
        }
      }
    } else {
      console.log('   ⏭️  Text search index already exists - skipping');
    }
    
    console.log('\n✅ Index setup complete!');
    console.log('📈 Your database queries are now optimized');
    
    // Show final index list
    const finalIndexes = await videofiles.collection.getIndexes();
    console.log('\n📊 Final indexes:');
    Object.keys(finalIndexes).forEach(indexName => {
      console.log(`   • ${indexName}`);
    });
    
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('   Full error:', error);
    }
    process.exit(1);
  }
};

addIndexes();