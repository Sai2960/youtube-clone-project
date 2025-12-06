// server/migrations/fix-watchTimeLimit.js
// Run this ONCE to fix all users with invalid watchTimeLimit

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.DB_URL || process.env.MONGODB_URI;

async function fixWatchTimeLimit() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find all users with invalid watchTimeLimit
    const invalidUsers = await usersCollection.find({
      $or: [
        { watchTimeLimit: { $lt: 0, $ne: -1 } },  // Less than 0 but not -1
        { watchTimeLimit: null },                   // Null values
        { watchTimeLimit: { $exists: false } }      // Missing field
      ]
    }).toArray();

    console.log(`\n📊 Found ${invalidUsers.length} users with invalid watchTimeLimit`);

    if (invalidUsers.length === 0) {
      console.log('✅ No users need fixing!');
      process.exit(0);
    }

    // Show users before fixing
    console.log('\n🔍 Users to fix:');
    invalidUsers.forEach(user => {
      console.log(`   - ${user.email}: watchTimeLimit = ${user.watchTimeLimit}`);
    });

    // Ask for confirmation
    console.log('\n⚠️  This will update all these users to watchTimeLimit = 5 (default)');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update all invalid users
    const result = await usersCollection.updateMany(
      {
        $or: [
          { watchTimeLimit: { $lt: 0, $ne: -1 } },
          { watchTimeLimit: null },
          { watchTimeLimit: { $exists: false } }
        ]
      },
      {
        $set: { watchTimeLimit: 5 }  // Set to default value
      }
    );

    console.log('✅ Migration complete!');
    console.log(`   Modified ${result.modifiedCount} users`);

    // Verify the fix
    const stillInvalid = await usersCollection.find({
      $or: [
        { watchTimeLimit: { $lt: 0, $ne: -1 } },
        { watchTimeLimit: null },
        { watchTimeLimit: { $exists: false } }
      ]
    }).toArray();

    if (stillInvalid.length === 0) {
      console.log('✅ All users fixed successfully!');
    } else {
      console.error('❌ Some users still have invalid values:', stillInvalid.length);
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixWatchTimeLimit();

// To run this:
// cd server
// node migrations/fix-watchTimeLimit.js