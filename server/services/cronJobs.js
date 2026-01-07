// server/services/cronJobs.js - OPTIMIZED WITH TIME WINDOWS
import cron from "node-cron";
import User from "../Modals/User.js";
import Subscription from "../Modals/subscription.js";

const PLAN_WATCH_LIMITS = {
  FREE: 5,
  BRONZE: 7,
  SILVER: 10,
  GOLD: -1,
  PREMIUM: -1,
  MONTHLY: -1,
  YEARLY: -1,
};

// ✅ HELPER: Check if current time is within active window (9 AM - 1 AM IST)
const isActiveHours = () => {
  const now = new Date();
  const istOffset = 5.5 * 60; // IST is UTC+5:30
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + istOffset) % (24 * 60);
  const istHour = Math.floor(istMinutes / 60);
  
  // Active: 9 AM (9) to 1 AM next day (25 in 24h format = 1 AM)
  // This means: 9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0 (1 AM)
  return istHour >= 9 || istHour <= 1;
};

// ===================================================================
// 1. SUBSCRIPTION EXPIRY CHECK - Every 4 hours (9 AM - 1 AM only)
// ===================================================================
const subscriptionExpiryJob = cron.schedule(
  "0 */4 * * *", // Every 4 hours
  async () => {
    // ✅ Skip if outside active hours
    if (!isActiveHours()) {
      console.log("⏸️ [CRON] Skipping expiry check - outside active hours");
      return;
    }

    try {
      console.log("\n🕐 [CRON] Checking expired subscriptions...");
      const startTime = Date.now();

      const now = new Date();

      const expiredSubs = await Subscription.find({
        endDate: { $lt: now },
        status: "ACTIVE",
        isActive: true,
        planType: { $ne: "free" },
      }).limit(100); // ✅ Process in batches

      console.log(`   Found ${expiredSubs.length} expired subscriptions`);

      let successCount = 0;
      let errorCount = 0;

      // ✅ Process in batches of 10
      for (let i = 0; i < expiredSubs.length; i += 10) {
        const batch = expiredSubs.slice(i, i + 10);
        
        await Promise.all(
          batch.map(async (sub) => {
            try {
              sub.status = "EXPIRED";
              sub.isActive = false;
              await sub.save();

              const user = await User.findById(sub.userId);
              if (user) {
                user.currentPlan = "FREE";
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
          })
        );
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ [CRON] Expiry check complete - ${successCount} expired, ${errorCount} errors (${duration}ms)\n`
      );
    } catch (error) {
      console.error("❌ [CRON] Subscription expiry job failed:", error);
    }
  },
  {
    scheduled: false,
    timezone: "Asia/Kolkata", // ✅ IST timezone
  }
);

// ===================================================================
// 2. DAILY WATCH TIME RESET - 3 AM IST (off-peak)
// ===================================================================
const watchTimeResetJob = cron.schedule(
  "0 3 * * *", // 3 AM IST daily
  async () => {
    try {
      console.log("\n🌙 [CRON] Daily watch time reset starting...");
      const startTime = Date.now();

      // ✅ Use updateMany for better performance
      const result = await User.updateMany(
        {
          currentPlan: { $in: ["FREE", "BRONZE", "SILVER"] },
          watchTimeLimit: { $lt: 10 }, // Only reset if consumed
        },
        [
          {
            $set: {
              watchTimeLimit: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$currentPlan", "FREE"] }, then: 5 },
                    { case: { $eq: ["$currentPlan", "BRONZE"] }, then: 7 },
                    { case: { $eq: ["$currentPlan", "SILVER"] }, then: 10 },
                  ],
                  default: 5,
                },
              },
            },
          },
        ]
      );

      const duration = Date.now() - startTime;
      console.log(
        `✅ [CRON] Watch time reset complete - ${result.modifiedCount} users updated (${duration}ms)\n`
      );
    } catch (error) {
      console.error("❌ [CRON] Watch time reset job failed:", error);
    }
  },
  {
    scheduled: false,
    timezone: "Asia/Kolkata",
  }
);

// ===================================================================
// 3. EXPIRY REMINDER - Tuesday & Friday at 10 AM IST only
// ===================================================================
const expiryReminderJob = cron.schedule(
  "0 10 * * 2,5", // Tuesday & Friday at 10 AM IST
  async () => {
    try {
      console.log("\n📧 [CRON] Checking for subscriptions expiring soon...");

      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const expiringSoon = await Subscription.find({
        status: "ACTIVE",
        isActive: true,
        planType: { $ne: "free" },
        endDate: {
          $gte: new Date(),
          $lte: threeDaysFromNow,
        },
      })
        .populate("userId", "email name")
        .limit(50); // ✅ Limit batch size

      console.log(
        `   Found ${expiringSoon.length} subscriptions expiring in 3 days`
      );

      // TODO: Send reminder emails
      // for (const sub of expiringSoon) {
      //   await sendExpiryReminderEmail(sub.userId.email, sub);
      // }

      console.log("✅ [CRON] Expiry reminder check complete\n");
    } catch (error) {
      console.error("❌ [CRON] Expiry reminder job failed:", error);
    }
  },
  {
    scheduled: false,
    timezone: "Asia/Kolkata",
  }
);

// ===================================================================
// START ALL CRON JOBS WITH CRASH PROTECTION
// ===================================================================
export const startAllCronJobs = () => {
  console.log("\n🚀 Starting cron jobs (Active hours: 9 AM - 1 AM IST)...");

  try {
    subscriptionExpiryJob.start();
    console.log("   ✅ Subscription expiry check: Every 4 hours (9 AM - 1 AM)");

    watchTimeResetJob.start();
    console.log("   ✅ Watch time reset: Daily at 3 AM IST");

    expiryReminderJob.start();
    console.log("   ✅ Expiry reminders: Tue & Fri at 10 AM IST");

    console.log("✅ All cron jobs started successfully\n");
  } catch (error) {
    console.error("❌ Failed to start cron jobs:", error.message);
  }
};

// ===================================================================
// STOP ALL CRON JOBS (for graceful shutdown)
// ===================================================================
export const stopAllCronJobs = () => {
  console.log("\n🛑 Stopping cron jobs...");
  subscriptionExpiryJob.stop();
  watchTimeResetJob.stop();
  expiryReminderJob.stop();
  console.log("✅ All cron jobs stopped\n");
};

// ===================================================================
// MANUAL TRIGGERS (for testing)
// ===================================================================
export const manualExpiryCheck = async () => {
  console.log("🔧 Manual expiry check triggered");
  const now = new Date();

  const expiredSubs = await Subscription.find({
    endDate: { $lt: now },
    status: "ACTIVE",
    planType: { $ne: "free" },
  }).limit(100);

  for (const sub of expiredSubs) {
    sub.status = "EXPIRED";
    sub.isActive = false;
    await sub.save();

    const user = await User.findById(sub.userId);
    if (user) {
      user.currentPlan = "FREE";
      user.watchTimeLimit = 5;
      user.subscriptionExpiry = null;
      await user.save();
    }
  }

  return { success: true, expired: expiredSubs.length };
};

export const manualWatchTimeReset = async () => {
  console.log("🔧 Manual watch time reset triggered");

  const result = await User.updateMany(
    {
      currentPlan: { $in: ["FREE", "BRONZE", "SILVER"] },
    },
    [
      {
        $set: {
          watchTimeLimit: {
            $switch: {
              branches: [
                { case: { $eq: ["$currentPlan", "FREE"] }, then: 5 },
                { case: { $eq: ["$currentPlan", "BRONZE"] }, then: 7 },
                { case: { $eq: ["$currentPlan", "SILVER"] }, then: 10 },
              ],
              default: 5,
            },
          },
        },
      },
    ]
  );

  return { success: true, reset: result.modifiedCount };
};

export default {
  startAllCronJobs,
  stopAllCronJobs,
  manualExpiryCheck,
  manualWatchTimeReset,
};