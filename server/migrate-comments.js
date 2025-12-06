// server/migrate-comments.js
import mongoose from 'mongoose';
import Comment from './Modals/comment.js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

// Check for MongoDB URI in various common env variable names
const MONGODB_URI = 
  process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  process.env.MONGODB_URL ||
  process.env.MONGO_URL;

if (!MONGODB_URI) {
  console.error('❌ Error: MongoDB URI not found in environment variables');
  console.error('💡 Please set one of: MONGODB_URI, MONGO_URI, DATABASE_URL');
  process.exit(1);
}

console.log('📦 Environment variables found:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));

async function migrateComments() {
  try {
    console.log('\n🔄 ===== COMMENT MIGRATION SCRIPT =====\n');
    console.log('🔗 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const allComments = await Comment.find({});
    console.log(`📊 Found ${allComments.length} comments to migrate\n`);

    if (allComments.length === 0) {
      console.log('ℹ️  No comments found in database');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const comment of allComments) {
      try {
        const updates = {};
        let needsUpdate = false;

        console.log(`\n📝 Processing comment ${comment._id}:`);
        console.log(`   Current likes type: ${typeof comment.likes} = ${JSON.stringify(comment.likes)}`);
        console.log(`   Has text field: ${!!comment.text}`);

        // Fix likes field - CRITICAL FIX
        if (typeof comment.likes === 'number' || !Array.isArray(comment.likes)) {
          const oldLikesCount = typeof comment.likes === 'number' ? comment.likes : 0;
          updates.likes = [];
          updates.likesCount = oldLikesCount;
          needsUpdate = true;
          console.log(`   ✏️  Converting likes: ${comment.likes} → []`);
        }

        // Initialize missing arrays
        if (!Array.isArray(comment.likedBy)) { updates.likedBy = []; needsUpdate = true; }
        if (!Array.isArray(comment.votes)) { updates.votes = []; needsUpdate = true; }
        if (!Array.isArray(comment.replies)) { updates.replies = []; needsUpdate = true; }
        if (!Array.isArray(comment.translations)) { updates.translations = []; needsUpdate = true; }
        if (!Array.isArray(comment.reports)) { updates.reports = []; needsUpdate = true; }

        // Add text field if missing
        if (!comment.text && comment.commentbody) {
          updates.text = comment.commentbody;
          needsUpdate = true;
          console.log(`   ✏️  Adding text field: "${comment.commentbody}"`);
        }

        // Add userId if missing
        if (!comment.userId && comment.userid) {
          updates.userId = comment.userid;
          needsUpdate = true;
        }

        // Ensure counts
        if (typeof comment.likesCount !== 'number') updates.likesCount = 0;
        if (typeof comment.dislikes !== 'number') updates.dislikes = 0;
        if (typeof comment.repliesCount !== 'number') updates.repliesCount = 0;
        if (typeof comment.reportCount !== 'number') updates.reportCount = 0;

        // Ensure booleans
        if (typeof comment.isHidden !== 'boolean') updates.isHidden = false;
        if (typeof comment.isReported !== 'boolean') updates.isReported = false;
        if (typeof comment.isPinned !== 'boolean') updates.isPinned = false;
        if (typeof comment.isEdited !== 'boolean') updates.isEdited = false;

        // Translation fields
        if (!comment.originalText) updates.originalText = comment.text || comment.commentbody || '';
        if (!comment.originalLanguage) updates.originalLanguage = 'en';

        // Location
        if (!comment.location) {
          updates.location = { city: 'Unknown', country: 'Unknown', countryCode: 'XX' };
          needsUpdate = true;
        }

        // Apply updates
        if (needsUpdate) {
          console.log(`   💾 Updates to apply:`, Object.keys(updates));
          await Comment.updateOne({ _id: comment._id }, { $set: updates });
          migratedCount++;
          console.log(`   ✅ Successfully migrated`);
        } else {
          console.log(`   ℹ️  No changes needed`);
        }

      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error:`, error.message);
      }
    }

    console.log('\n📊 ===== MIGRATION SUMMARY =====');
    console.log(`Total comments: ${allComments.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Unchanged: ${allComments.length - migratedCount - errorCount}`);
    
    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Check your MongoDB connection string');
      console.error('   Look in your index.js for the mongoose.connect() line');
      console.error('   Or add MONGODB_URI to your .env file');
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

migrateComments();