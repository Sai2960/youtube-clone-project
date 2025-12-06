// server/routes/admin.js - COMPLETE ADMIN ROUTES (ALL FEATURES MERGED)

import express from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../middleware/auth.js';
import { manualExpiryCheck, manualWatchTimeReset } from '../services/cronJobs.js';
import User from '../Modals/User.js';
import Subscription from '../Modals/subscription.js';

const router = express.Router();

// ===================================================================
// MIDDLEWARE: Admin check
// ===================================================================
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check if user is admin (you can add an isAdmin field to User model)
    // For testing, you can use email check:
    const adminEmails = [
      'admin@example.com',
      process.env.ADMIN_EMAIL
    ];
    
    if (adminEmails.includes(user.email)) {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Authorization failed' 
    });
  }
};

// ===================================================================
// SECTION 1: CRON JOB MANAGEMENT ROUTES
// ===================================================================

// 🔧 Manual Expiry Check
router.post('/cron/expire-subscriptions', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('🔧 Admin triggered: Manual expiry check');
    const result = await manualExpiryCheck();
    
    res.json({
      success: true,
      message: `Expired ${result.expired} subscriptions`,
      ...result
    });
  } catch (error) {
    console.error('Admin expiry check error:', error);
    res.status(500).json({
      success: false,
      message: 'Expiry check failed',
      error: error.message
    });
  }
});

// 🔧 Manual Watch Time Reset
router.post('/cron/reset-watch-time', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('🔧 Admin triggered: Manual watch time reset');
    const result = await manualWatchTimeReset();
    
    res.json({
      success: true,
      message: `Reset watch time for ${result.reset} users`,
      ...result
    });
  } catch (error) {
    console.error('Admin watch time reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Watch time reset failed',
      error: error.message
    });
  }
});

// ===================================================================
// SECTION 2: STATISTICS & MONITORING ROUTES
// ===================================================================

// 📊 Get Subscription Stats
router.get('/stats/subscriptions', verifyToken, isAdmin, async (req, res) => {
  try {
    const stats = await Subscription.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
          },
          expired: {
            $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] }
          },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({
      currentPlan: { $ne: 'FREE' }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        premiumUsers,
        freeUsers: totalUsers - premiumUsers,
        planBreakdown: stats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

// 📋 Get Expiring Soon
router.get('/expiring-soon', verifyToken, isAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const expiringSoon = await Subscription.find({
      status: 'ACTIVE',
      isActive: true,
      planType: { $ne: 'free' },
      endDate: {
        $gte: new Date(),
        $lte: futureDate
      }
    })
    .populate('userId', 'name email currentPlan')
    .sort({ endDate: 1 });

    res.json({
      success: true,
      count: expiringSoon.length,
      daysAhead: days,
      subscriptions: expiringSoon.map(sub => ({
        user: sub.userId,
        plan: sub.planType,
        endDate: sub.endDate,
        daysRemaining: Math.ceil((sub.endDate - new Date()) / (1000 * 60 * 60 * 24))
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring subscriptions',
      error: error.message
    });
  }
});

// ===================================================================
// SECTION 3: TESTING & SIMULATION ROUTES
// ===================================================================

// 🧪 Test: Simulate User Watching (for testing watch limit)
router.post('/test/simulate-watch', verifyToken, isAdmin, async (req, res) => {
  try {
    const { userId, minutes } = req.body;
    
    if (!userId || !minutes) {
      return res.status(400).json({
        success: false,
        message: 'userId and minutes are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldLimit = user.watchTimeLimit;
    
    if (user.watchTimeLimit !== -1) {
      user.watchTimeLimit = Math.max(0, user.watchTimeLimit - minutes);
      await user.save();
    }

    res.json({
      success: true,
      message: `Simulated ${minutes} minutes of watch time`,
      user: {
        id: user._id,
        email: user.email,
        plan: user.currentPlan,
        oldLimit,
        newLimit: user.watchTimeLimit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Simulation failed',
      error: error.message
    });
  }
});

// 🧪 Test: Expire Specific Subscription
router.post('/test/expire-subscription/:subscriptionId', verifyToken, isAdmin, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.status = 'EXPIRED';
    subscription.isActive = false;
    subscription.endDate = new Date();
    await subscription.save();

    const user = await User.findById(subscription.userId);
    if (user) {
      user.currentPlan = 'FREE';
      user.watchTimeLimit = 5;
      user.subscriptionExpiry = null;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Subscription expired successfully',
      subscription: {
        id: subscription._id,
        planType: subscription.planType,
        status: subscription.status
      },
      user: user ? {
        id: user._id,
        email: user.email,
        currentPlan: user.currentPlan
      } : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to expire subscription',
      error: error.message
    });
  }
});

// ===================================================================
// SECTION 4: DATABASE MAINTENANCE - INDEX MANAGEMENT
// ===================================================================

// 🔧 Fix History Collection Indexes
router.get('/fix-history-indexes', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('🔧 Starting index fix via API...\n');
    
    const db = mongoose.connection.db;
    
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const historyCollection = db.collection('histories');
    const results = [];

    // ============================================================================
    // STEP 1: Check existing indexes
    // ============================================================================
    results.push('📊 Step 1: Checking existing indexes...');
    const existingIndexes = await historyCollection.indexes();
    results.push('Current indexes:');
    existingIndexes.forEach(index => {
      results.push(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // ============================================================================
    // STEP 2: Drop old problematic indexes
    // ============================================================================
    results.push('\n🗑️  Step 2: Dropping old indexes...');
    
    const indexesToDrop = [
      'viewer_1_videoid_1',
      'viewer_1_videoid_1_shortid_1',
      'viewer_videoid_shortid_unique'
    ];

    for (const indexName of indexesToDrop) {
      try {
        await historyCollection.dropIndex(indexName);
        results.push(`✓ Dropped: ${indexName}`);
      } catch (error) {
        if (error.code === 27 || error.codeName === 'IndexNotFound') {
          results.push(`ℹ️  Not found (OK): ${indexName}`);
        } else {
          results.push(`⚠️  Error dropping ${indexName}: ${error.message}`);
        }
      }
    }

    // ============================================================================
    // STEP 3: Create new indexes with partial filters
    // ============================================================================
    results.push('\n✨ Step 3: Creating new indexes...');

    // Video history unique index
    try {
      await historyCollection.createIndex(
        { viewer: 1, videoid: 1, contentType: 1 },
        { 
          name: 'viewer_video_unique',
          unique: true,
          partialFilterExpression: {
            videoid: { $type: 'objectId' },
            contentType: 'video'
          }
        }
      );
      results.push('✓ Created: viewer_video_unique');
    } catch (error) {
      results.push(`⚠️  ${error.message}`);
    }

    // Short history unique index
    try {
      await historyCollection.createIndex(
        { viewer: 1, shortid: 1, contentType: 1 },
        { 
          name: 'viewer_short_unique',
          unique: true,
          partialFilterExpression: {
            shortid: { $type: 'objectId' },
            contentType: 'short'
          }
        }
      );
      results.push('✓ Created: viewer_short_unique');
    } catch (error) {
      results.push(`⚠️  ${error.message}`);
    }

    // Query optimization indexes
    try {
      await historyCollection.createIndex(
        { viewer: 1, createdAt: -1 },
        { name: 'viewer_date' }
      );
      results.push('✓ Created: viewer_date');
    } catch (error) {
      results.push(`⚠️  ${error.message}`);
    }

    try {
      await historyCollection.createIndex(
        { viewer: 1, contentType: 1, createdAt: -1 },
        { name: 'viewer_contenttype_date' }
      );
      results.push('✓ Created: viewer_contenttype_date');
    } catch (error) {
      results.push(`⚠️  ${error.message}`);
    }

    // ============================================================================
    // STEP 4: Clean up duplicates
    // ============================================================================
    results.push('\n🧹 Step 4: Cleaning up duplicates...');

    // Video duplicates
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

    results.push(`Found ${videoDuplicates.length} duplicate video entries`);
    let videoRemoved = 0;

    for (const dup of videoDuplicates) {
      const sortedIds = dup.ids
        .map((id, index) => ({ id, date: dup.dates[index] }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const toDelete = sortedIds.slice(1).map(item => item.id);
      
      if (toDelete.length > 0) {
        await historyCollection.deleteMany({ _id: { $in: toDelete } });
        videoRemoved += toDelete.length;
      }
    }
    results.push(`✓ Removed ${videoRemoved} duplicate video entries`);

    // Short duplicates
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

    results.push(`Found ${shortDuplicates.length} duplicate short entries`);
    let shortRemoved = 0;

    for (const dup of shortDuplicates) {
      const sortedIds = dup.ids
        .map((id, index) => ({ id, date: dup.dates[index] }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const toDelete = sortedIds.slice(1).map(item => item.id);
      
      if (toDelete.length > 0) {
        await historyCollection.deleteMany({ _id: { $in: toDelete } });
        shortRemoved += toDelete.length;
      }
    }
    results.push(`✓ Removed ${shortRemoved} duplicate short entries`);

    // ============================================================================
    // STEP 5: Fix data consistency
    // ============================================================================
    results.push('\n🔧 Step 5: Fixing data consistency...');

    const fixedShorts = await historyCollection.updateMany(
      { contentType: 'short', videoid: { $ne: null } },
      { $set: { videoid: null } }
    );
    results.push(`✓ Fixed ${fixedShorts.modifiedCount} short entries`);

    const fixedVideos = await historyCollection.updateMany(
      { contentType: 'video', shortid: { $ne: null } },
      { $set: { shortid: null } }
    );
    results.push(`✓ Fixed ${fixedVideos.modifiedCount} video entries`);

    const orphaned = await historyCollection.deleteMany({
      videoid: null,
      shortid: null
    });
    results.push(`✓ Removed ${orphaned.deletedCount} orphaned entries`);

    // ============================================================================
    // STEP 6: Final stats
    // ============================================================================
    results.push('\n📊 Final Statistics:');
    const stats = {
      total: await historyCollection.countDocuments(),
      videos: await historyCollection.countDocuments({ contentType: 'video' }),
      shorts: await historyCollection.countDocuments({ contentType: 'short' })
    };
    
    results.push(`Total: ${stats.total} | Videos: ${stats.videos} | Shorts: ${stats.shorts}`);
    results.push('\n✅ Index fix complete!');

    console.log(results.join('\n'));

    return res.status(200).json({
      success: true,
      message: 'Indexes fixed successfully',
      results: results,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fix indexes',
      error: error.message
    });
  }
});

// ===================================================================
// SECTION 5: DATABASE MAINTENANCE - CONTENT TYPE FIXING
// ===================================================================

// 🔧 Fix Missing/Incorrect ContentType Fields
router.get('/fix-content-types', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('🔧 Fixing missing contentType fields...\n');
    
    const db = mongoose.connection.db;
    const historyCollection = db.collection('histories');
    const results = [];

    // ============================================================================
    // Find entries without contentType
    // ============================================================================
    results.push('📊 Analyzing history entries...');
    
    const allEntries = await historyCollection.find({}).toArray();
    results.push(`Total entries: ${allEntries.length}`);
    
    const missingContentType = allEntries.filter(e => !e.contentType);
    results.push(`Missing contentType: ${missingContentType.length}`);
    
    const withVideo = allEntries.filter(e => e.videoid);
    results.push(`Has videoid: ${withVideo.length}`);
    
    const withShort = allEntries.filter(e => e.shortid);
    results.push(`Has shortid: ${withShort.length}`);

    // ============================================================================
    // Fix entries with videoid but no/wrong contentType
    // ============================================================================
    results.push('\n🔧 Fixing video entries...');
    
    const fixedVideos = await historyCollection.updateMany(
      { 
        videoid: { $ne: null, $exists: true },
        $or: [
          { contentType: { $exists: false } },
          { contentType: null },
          { contentType: { $ne: 'video' } }
        ]
      },
      { 
        $set: { 
          contentType: 'video',
          shortid: null 
        } 
      }
    );
    results.push(`✓ Fixed ${fixedVideos.modifiedCount} video entries`);

    // ============================================================================
    // Fix entries with shortid but no/wrong contentType
    // ============================================================================
    results.push('\n🔧 Fixing short entries...');
    
    const fixedShorts = await historyCollection.updateMany(
      { 
        shortid: { $ne: null, $exists: true },
        $or: [
          { contentType: { $exists: false } },
          { contentType: null },
          { contentType: { $ne: 'short' } }
        ]
      },
      { 
        $set: { 
          contentType: 'short',
          videoid: null 
        } 
      }
    );
    results.push(`✓ Fixed ${fixedShorts.modifiedCount} short entries`);

    // ============================================================================
    // Remove entries with both null (orphaned)
    // ============================================================================
    results.push('\n🗑️  Removing orphaned entries...');
    
    const orphaned = await historyCollection.deleteMany({
      $or: [
        { videoid: null, shortid: null },
        { videoid: { $exists: false }, shortid: { $exists: false } }
      ]
    });
    results.push(`✓ Removed ${orphaned.deletedCount} orphaned entries`);

    // ============================================================================
    // Final verification
    // ============================================================================
    results.push('\n📊 Final Statistics:');
    
    const finalStats = {
      total: await historyCollection.countDocuments(),
      videos: await historyCollection.countDocuments({ 
        contentType: 'video',
        videoid: { $ne: null }
      }),
      shorts: await historyCollection.countDocuments({ 
        contentType: 'short',
        shortid: { $ne: null }
      }),
      stillMissing: await historyCollection.countDocuments({
        $or: [
          { contentType: { $exists: false } },
          { contentType: null }
        ]
      })
    };
    
    results.push(`Total entries: ${finalStats.total}`);
    results.push(`Video entries: ${finalStats.videos}`);
    results.push(`Short entries: ${finalStats.shorts}`);
    results.push(`Still missing contentType: ${finalStats.stillMissing}`);

    // ============================================================================
    // Show sample entries for verification
    // ============================================================================
    results.push('\n🔍 Sample Entries:');
    
    const sampleVideo = await historyCollection.findOne({ 
      contentType: 'video',
      videoid: { $ne: null }
    });
    
    const sampleShort = await historyCollection.findOne({ 
      contentType: 'short',
      shortid: { $ne: null }
    });

    if (sampleVideo) {
      results.push('Sample Video Entry:');
      results.push(`  - ID: ${sampleVideo._id}`);
      results.push(`  - contentType: ${sampleVideo.contentType}`);
      results.push(`  - videoid: ${sampleVideo.videoid || 'null'}`);
      results.push(`  - shortid: ${sampleVideo.shortid || 'null'}`);
    }

    if (sampleShort) {
      results.push('Sample Short Entry:');
      results.push(`  - ID: ${sampleShort._id}`);
      results.push(`  - contentType: ${sampleShort.contentType}`);
      results.push(`  - videoid: ${sampleShort.videoid || 'null'}`);
      results.push(`  - shortid: ${sampleShort.shortid || 'null'}`);
    }

    if (finalStats.stillMissing > 0) {
      results.push('\n⚠️  WARNING: Some entries still missing contentType!');
      
      const problematic = await historyCollection.find({
        $or: [
          { contentType: { $exists: false } },
          { contentType: null }
        ]
      }).limit(5).toArray();
      
      results.push('Problematic entries:');
      problematic.forEach(entry => {
        results.push(`  - ID: ${entry._id}, videoid: ${entry.videoid || 'null'}, shortid: ${entry.shortid || 'null'}`);
      });
    } else {
      results.push('\n✅ All entries have valid contentType!');
    }

    console.log(results.join('\n'));

    return res.status(200).json({
      success: true,
      message: 'ContentType fields fixed',
      results: results,
      stats: finalStats
    });

  } catch (error) {
    console.error('❌ Error fixing contentType:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fix contentType',
      error: error.message
    });
  }
});

export default router;