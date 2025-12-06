// ============================================================================
// fix-history-indexes.js
// CRITICAL: Run this script to fix the index issues
// ============================================================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixIndexes = async () => {
  try {
    console.log('🔧 Starting index fix...\n');

    // Get MongoDB URI from environment variables
    const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!dbUri) {
      console.error('❌ Error: MONGODB_URI or MONGO_URI not found in .env file');
      console.log('\n💡 Please check your .env file contains:');
      console.log('   MONGODB_URI=mongodb+srv://your-connection-string\n');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB Atlas...');
    console.log(`   Using URI: ${dbUri.substring(0, 30)}...`);
    
    await mongoose.connect(dbUri);
    console.log('✅ Connected to database\n');

    const db = mongoose.connection.db;
    const historyCollection = db.collection('histories');

    // ============================================================================
    // STEP 1: Check existing indexes
    // ============================================================================
    console.log('📊 Step 1: Checking existing indexes...');
    const existingIndexes = await historyCollection.indexes();
    console.log('   Current indexes:');
    existingIndexes.forEach(index => {
      console.log(`   - ${index.name}:`, index.key);
    });
    console.log();

    // ============================================================================
    // STEP 2: Drop problematic old indexes
    // ============================================================================
    console.log('🗑️  Step 2: Dropping old indexes...');
    
    const indexesToDrop = [
      'viewer_1_videoid_1',
      'viewer_1_videoid_1_shortid_1',
      'viewer_videoid_shortid_unique'
    ];

    for (const indexName of indexesToDrop) {
      try {
        await historyCollection.dropIndex(indexName);
        console.log(`   ✓ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.code === 27 || error.codeName === 'IndexNotFound') {
          console.log(`   ℹ️  Index not found (already dropped): ${indexName}`);
        } else {
          console.log(`   ⚠️  Error dropping ${indexName}:`, error.message);
        }
      }
    }
    console.log();

    // ============================================================================
    // STEP 3: Create new compound indexes
    // ============================================================================
    console.log('✨ Step 3: Creating new indexes...');

    // Index 1: Unique constraint for video history
    try {
      await historyCollection.createIndex(
        { 
          viewer: 1, 
          videoid: 1, 
          contentType: 1 
        },
        { 
          name: 'viewer_video_unique',
          unique: true,
          partialFilterExpression: {
            videoid: { $type: 'objectId' },
            contentType: 'video'
          }
        }
      );
      console.log('   ✓ Created: viewer_video_unique');
    } catch (error) {
      console.log('   ⚠️  Error creating viewer_video_unique:', error.message);
    }

    // Index 2: Unique constraint for short history
    try {
      await historyCollection.createIndex(
        { 
          viewer: 1, 
          shortid: 1, 
          contentType: 1 
        },
        { 
          name: 'viewer_short_unique',
          unique: true,
          partialFilterExpression: {
            shortid: { $type: 'objectId' },
            contentType: 'short'
          }
        }
      );
      console.log('   ✓ Created: viewer_short_unique');
    } catch (error) {
      console.log('   ⚠️  Error creating viewer_short_unique:', error.message);
    }

    // Index 3: Query optimization - viewer + date
    try {
      await historyCollection.createIndex(
        { viewer: 1, createdAt: -1 },
        { name: 'viewer_date' }
      );
      console.log('   ✓ Created: viewer_date');
    } catch (error) {
      console.log('   ⚠️  Error creating viewer_date:', error.message);
    }

    // Index 4: Query optimization - viewer + contentType + date
    try {
      await historyCollection.createIndex(
        { viewer: 1, contentType: 1, createdAt: -1 },
        { name: 'viewer_contenttype_date' }
      );
      console.log('   ✓ Created: viewer_contenttype_date');
    } catch (error) {
      console.log('   ⚠️  Error creating viewer_contenttype_date:', error.message);
    }

    console.log();

    // ============================================================================
    // STEP 4: Verify new indexes
    // ============================================================================
    console.log('✅ Step 4: Verifying new indexes...');
    const newIndexes = await historyCollection.indexes();
    console.log('   Current indexes:');
    newIndexes.forEach(index => {
      console.log(`   - ${index.name}:`, index.key);
    });
    console.log();

    // ============================================================================
    // STEP 5: Clean up duplicate data
    // ============================================================================
    console.log('🧹 Step 5: Cleaning up duplicates...');

    // Find and remove duplicate video entries
    const videoDuplicates = await historyCollection.aggregate([
      {
        $match: {
          contentType: 'video',
          videoid: { $ne: null }
        }
      },
      {
        $group: {
          _id: { viewer: '$viewer', videoid: '$videoid' },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          dates: { $push: '$createdAt' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    console.log(`   Found ${videoDuplicates.length} duplicate video entries`);

    for (const dup of videoDuplicates) {
      const sortedIds = dup.ids
        .map((id, index) => ({ id, date: dup.dates[index] }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const toDelete = sortedIds.slice(1).map(item => item.id);
      
      if (toDelete.length > 0) {
        await historyCollection.deleteMany({ _id: { $in: toDelete } });
        console.log(`   ✓ Removed ${toDelete.length} duplicate video entries`);
      }
    }

    // Find and remove duplicate short entries
    const shortDuplicates = await historyCollection.aggregate([
      {
        $match: {
          contentType: 'short',
          shortid: { $ne: null }
        }
      },
      {
        $group: {
          _id: { viewer: '$viewer', shortid: '$shortid' },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          dates: { $push: '$createdAt' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    console.log(`   Found ${shortDuplicates.length} duplicate short entries`);

    for (const dup of shortDuplicates) {
      const sortedIds = dup.ids
        .map((id, index) => ({ id, date: dup.dates[index] }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const toDelete = sortedIds.slice(1).map(item => item.id);
      
      if (toDelete.length > 0) {
        await historyCollection.deleteMany({ _id: { $in: toDelete } });
        console.log(`   ✓ Removed ${toDelete.length} duplicate short entries`);
      }
    }

    console.log();

    // ============================================================================
    // STEP 6: Fix data consistency
    // ============================================================================
    console.log('🔧 Step 6: Fixing data consistency...');

    // Ensure videoid is null for shorts
    const fixedShorts = await historyCollection.updateMany(
      { 
        contentType: 'short',
        videoid: { $ne: null }
      },
      { 
        $set: { videoid: null }
      }
    );
    console.log(`   ✓ Fixed ${fixedShorts.modifiedCount} short entries`);

    // Ensure shortid is null for videos
    const fixedVideos = await historyCollection.updateMany(
      { 
        contentType: 'video',
        shortid: { $ne: null }
      },
      { 
        $set: { shortid: null }
      }
    );
    console.log(`   ✓ Fixed ${fixedVideos.modifiedCount} video entries`);

    // Remove orphaned entries
    const orphaned = await historyCollection.deleteMany({
      videoid: null,
      shortid: null
    });
    console.log(`   ✓ Removed ${orphaned.deletedCount} orphaned entries`);

    console.log();

    // ============================================================================
    // STEP 7: Final statistics
    // ============================================================================
    console.log('📊 Final Statistics:');
    const stats = {
      total: await historyCollection.countDocuments(),
      videos: await historyCollection.countDocuments({ contentType: 'video' }),
      shorts: await historyCollection.countDocuments({ contentType: 'short' })
    };
    
    console.log(`   Total entries: ${stats.total}`);
    console.log(`   Video entries: ${stats.videos}`);
    console.log(`   Short entries: ${stats.shorts}`);
    console.log();

    console.log('✅ Index fix complete! You can now use the history feature.\n');

    await mongoose.connection.close();
    console.log('👋 Disconnected from database');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the fix
fixIndexes();