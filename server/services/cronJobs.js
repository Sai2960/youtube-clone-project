// server/services/cronJobs.js - COMPLETE UNIFIED CRON SERVICE
import cron from 'node-cron';
import User from '../Modals/User.js';
import Subscription from '../Modals/subscription.js';

const PLAN_WATCH_LIMITS = {
  FREE: 5,
  BRONZE: 7,
  SILVER: 10,
  GOLD: -1,
  PREMIUM: -1,
  MONTHLY: -1,
  YEARLY: -1
};

// ===================================================================
// 1. SUBSCRIPTION EXPIRY CHECK - Every Hour
// ===================================================================
const subscriptionExpiryJob = cron.schedule('0 * * * *', async () => {
  try {
    console.log('\n🕐 [CRON] Checking expired subscriptions...');
    const startTime = Date.now();
    
    const now = new Date();
    
    // Find expired subscriptions
    const expiredSubs = await Subscription.find({
      endDate: { $lt: now },
      status: 'ACTIVE',
      isActive: true,
      planType: { $ne: 'free' }
    });

    console.log(`   Found ${expiredSubs.length} expired subscriptions`);

    let successCount = 0;
    let errorCount = 0;

    for (const sub of expiredSubs) {
      try {
        // Mark subscription as expired
        sub.status = 'EXPIRED';
        sub.isActive = false;
        await sub.save();

        // Downgrade user to FREE
        const user = await User.findById(sub.userId);
        if (user) {
          user.currentPlan = 'FREE';
          user.watchTimeLimit = PLAN_WATCH_LIMITS.FREE;
          user.subscriptionExpiry = null;
          await user.save();

          console.log(`   ✅ Expired: ${user.email} (${sub.planType} → FREE)`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error expiring subscription ${sub._id}:`, error.message);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [CRON] Expiry check complete - ${successCount} expired, ${errorCount} errors (${duration}ms)\n`);

  } catch (error) {
    console.error('❌ [CRON] Subscription expiry job failed:', error);
  }
}, {
  scheduled: false // Don't start immediately
});

// ===================================================================
// 2. DAILY WATCH TIME RESET - Every Day at Midnight
// ===================================================================
const watchTimeResetJob = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('\n🌙 [CRON] Daily watch time reset starting...');
    const startTime = Date.now();

    const users = await User.find({});
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const planLimit = PLAN_WATCH_LIMITS[user.currentPlan] || 5;

        // Only reset if user consumed watch time
        if (planLimit !== -1 && user.watchTimeLimit < planLimit) {
          user.watchTimeLimit = planLimit;
          await user.save();
          updatedCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error resetting user ${user._id}:`, error.message);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [CRON] Watch time reset complete - ${updatedCount}/${users.length} users updated (${duration}ms)\n`);

  } catch (error) {
    console.error('❌ [CRON] Watch time reset job failed:', error);
  }
}, {
  scheduled: false
});

// ===================================================================
// 3. EXPIRY REMINDER - Daily at 9 AM (Optional)
// ===================================================================
const expiryReminderJob = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('\n📧 [CRON] Checking for subscriptions expiring soon...');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSoon = await Subscription.find({
      status: 'ACTIVE',
      isActive: true,
      planType: { $ne: 'free' },
      endDate: {
        $gte: new Date(),
        $lte: threeDaysFromNow
      }
    }).populate('userId', 'email name');

    console.log(`   Found ${expiringSoon.length} subscriptions expiring in 3 days`);

    // TODO: Send reminder emails
    // for (const sub of expiringSoon) {
    //   await sendExpiryReminderEmail(sub.userId.email, sub);
    // }

    console.log('✅ [CRON] Expiry reminder check complete\n');

  } catch (error) {
    console.error('❌ [CRON] Expiry reminder job failed:', error);
  }
}, {
  scheduled: false
});

// ===================================================================
// START ALL CRON JOBS
// ===================================================================
export const startAllCronJobs = () => {
  console.log('\n🚀 Starting cron jobs...');
  
  // Start subscription expiry checker (hourly)
  subscriptionExpiryJob.start();
  console.log('   ✅ Subscription expiry check: Every hour');
  
  // Start watch time reset (daily at midnight)
  watchTimeResetJob.start();
  console.log('   ✅ Watch time reset: Daily at 00:00');
  
  // Start expiry reminder (daily at 9 AM)
  expiryReminderJob.start();
  console.log('   ✅ Expiry reminders: Daily at 09:00');
  
  console.log('✅ All cron jobs started successfully\n');
};

// ===================================================================
// STOP ALL CRON JOBS (for graceful shutdown)
// ===================================================================
export const stopAllCronJobs = () => {
  console.log('\n🛑 Stopping cron jobs...');
  subscriptionExpiryJob.stop();
  watchTimeResetJob.stop();
  expiryReminderJob.stop();
  console.log('✅ All cron jobs stopped\n');
};

// ===================================================================
// MANUAL TRIGGERS (for testing)
// ===================================================================
export const manualExpiryCheck = async () => {
  console.log('🔧 Manual expiry check triggered');
  const now = new Date();
  
  const expiredSubs = await Subscription.find({
    endDate: { $lt: now },
    status: 'ACTIVE',
    planType: { $ne: 'free' }
  });

  for (const sub of expiredSubs) {
    sub.status = 'EXPIRED';
    sub.isActive = false;
    await sub.save();

    const user = await User.findById(sub.userId);
    if (user) {
      user.currentPlan = 'FREE';
      user.watchTimeLimit = 5;
      user.subscriptionExpiry = null;
      await user.save();
    }
  }

  return { success: true, expired: expiredSubs.length };
};

export const manualWatchTimeReset = async () => {
  console.log('🔧 Manual watch time reset triggered');
  
  const users = await User.find({});
  let count = 0;

  for (const user of users) {
    const limit = PLAN_WATCH_LIMITS[user.currentPlan] || 5;
    if (limit !== -1) {
      user.watchTimeLimit = limit;
      await user.save();
      count++;
    }
  }

  return { success: true, reset: count };
};

// ===================================================================
// EXPORT
// ===================================================================
export default {
  startAllCronJobs,
  stopAllCronJobs,
  manualExpiryCheck,
  manualWatchTimeReset
};