// server/controllers/subscription.js
import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";
import Subscription from "../Modals/subscription.js";
import Transaction from "../Modals/Transaction.js";
import User from "../Modals/User.js";
import { sendInvoiceEmail } from "../utils/emailService.js";
import { generateInvoice } from "../utils/invoiceGenerator.js";

// Razorpay Init - LAZY LOADING
let razorpay = null;
let isRazorpayInitialized = false;

const getRazorpayInstance = () => {
  if (isRazorpayInitialized) {
    return razorpay;
  }

  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }
    console.log("✅ Razorpay initialized successfully");
    isRazorpayInitialized = true;
    return razorpay;
  } catch (error) {
    console.error("❌ Razorpay initialization failed:", error);
    isRazorpayInitialized = true;
    return null;
  }
};

// PLAN DETAILS
const PLAN_DETAILS = {
  FREE: { price: 0, watchTime: 5, durationDays: 0 },
  BRONZE: { price: 10, watchTime: 7, durationDays: 30 },
  SILVER: { price: 50, watchTime: 10, durationDays: 30 },
  GOLD: { price: 100, watchTime: -1, durationDays: 30 },
  MONTHLY: { price: 199, watchTime: -1, durationDays: 30 },
  YEARLY: { price: 1999, watchTime: -1, durationDays: 365 },
};

// Get all available plans
export const getAvailablePlans = async (req, res) => {
  try {
    const planDetails = {
      FREE: {
        id: "FREE",
        name: "FREE",
        price: 0,
        duration: 0,
        watchTime: 5,
        features: ["5 minutes watch time", "Basic features", "Ad-supported"],
      },
      BRONZE: {
        id: "BRONZE",
        name: "BRONZE",
        price: 10,
        duration: 30,
        watchTime: 7,
        features: [
          "7 minutes watch time",
          "Basic features",
          "Reduced ads",
          "30 days validity",
        ],
      },
      SILVER: {
        id: "SILVER",
        name: "SILVER",
        price: 50,
        duration: 30,
        watchTime: 10,
        features: [
          "10 minutes watch time",
          "Premium features",
          "No ads",
          "30 days validity",
        ],
      },
      GOLD: {
        id: "GOLD",
        name: "GOLD",
        price: 100,
        duration: 30,
        watchTime: -1,
        features: [
          "Unlimited watch time",
          "All premium features",
          "No ads",
          "30 days validity",
          "Priority support",
        ],
      },
    };

    const plans = Object.values(planDetails);
    return res.status(200).json({ success: true, plans });
  } catch (error) {
    console.error("Get plans error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch plans" });
  }
};

// Get user's current subscription
export const getUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    let subscription = await Subscription.findOne({ userId }).sort({
      createdAt: -1,
    });
    if (!subscription) {
      subscription = new Subscription({
        userId,
        planType: "free",
        planName: "Free Plan",
        status: "ACTIVE",
      });
      await subscription.save();
    }

    const user = await User.findById(userId);
    return res.status(200).json({
      success: true,
      subscription,
      userPlan: user ? user.currentPlan : "FREE",
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch subscription" });
  }
};

// Create Razorpay subscription order
export const createSubscriptionOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    console.log("Creating order for plan:", plan, "User:", userId);

    if (!PLAN_DETAILS[plan] || plan === "FREE") {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check plan hierarchy - ALLOW DOWNGRADE NOW
    const planHierarchy = {
      FREE: 0,
      BRONZE: 1,
      SILVER: 2,
      GOLD: 3,
      MONTHLY: 4,
      YEARLY: 5,
    };
    const currentLevel = planHierarchy[user.currentPlan] || 0;
    const newLevel = planHierarchy[plan];

    // Only block if same plan
    if (newLevel === currentLevel && currentLevel !== 0) {
      return res.status(400).json({
        message: "You are already subscribed to this plan.",
      });
    }

    // Get Razorpay instance
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return res.status(500).json({ message: "Payment gateway not available" });
    }

    // Create Razorpay order
    const amount = PLAN_DETAILS[plan].price * 100;
    const options = {
      amount,
      currency: "INR",
      receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()
        .toString()
        .slice(-8)}`,
      notes: { userId, plan },
    };

    const order = await razorpayInstance.orders.create(options);

    const transaction = new Transaction({
      userId,
      orderId: order.id,
      amount: PLAN_DETAILS[plan].price,
      plan,
      status: "PENDING",
    });
    await transaction.save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// Verify payment and activate subscription
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, plan } = req.body;
    const userId = req.user.id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const transaction = await Transaction.findOne({ orderId });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    transaction.paymentId = paymentId;
    transaction.status = "SUCCESS";
    await transaction.save();

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + PLAN_DETAILS[plan].durationDays);

    // Cancel all existing active subscriptions
    await Subscription.updateMany(
      { userId, status: "ACTIVE" },
      { status: "CANCELLED", isActive: false }
    );

    // Create new subscription
    const subscription = new Subscription({
      userId,
      planType: plan.toLowerCase(),
      planName: `${plan} Plan`,
      startDate,
      endDate,
      paymentId,
      orderId,
      amount: PLAN_DETAILS[plan].price,
      price: PLAN_DETAILS[plan].price,
      status: "ACTIVE",
      paymentStatus: "completed",
      isActive: true,
    });

    await subscription.save();

    const user = await User.findById(userId);
    if (user) {
      user.currentPlan = plan;
      user.subscriptionExpiry = endDate;
      user.watchTimeLimit = PLAN_DETAILS[plan].watchTime;
      await user.save();
    }

    const invoiceData = {
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date(),
      user: { name: user?.name, email: user?.email },
      plan,
      amount: PLAN_DETAILS[plan].price,
      paymentId,
      orderId,
    };

    console.log("📩 Email triggered for user", userId, "for plan", plan);

    try {
      const invoicePath = await generateInvoice(invoiceData);
      transaction.invoiceUrl = invoicePath;
      await transaction.save();

      console.log("📩 Email triggered for user", userId, "for plan", plan);
      await sendInvoiceEmail(user.email, user.name, invoicePath, invoiceData);
    } catch (invoiceError) {
      console.error("Invoice/Email error:", invoiceError);
    }

    res.json({
      message: "Subscription activated successfully",
      subscription,
      invoiceUrl: transaction.invoiceUrl || null,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("Cancelling subscription for user:", userId);

    // Cancel all active subscriptions
    await Subscription.updateMany(
      { userId, status: "ACTIVE" },
      {
        planType: "free",
        planName: "Free Plan",
        status: "CANCELLED",
        isActive: false,
        endDate: new Date(),
      }
    );

    const user = await User.findById(userId);
    if (user) {
      user.currentPlan = "FREE";
      user.watchTimeLimit = PLAN_DETAILS.FREE.watchTime;
      user.subscriptionExpiry = null;
      await user.save();
      console.log("User updated to FREE plan");
    }

    // Get the latest subscription to return
    const subscription = await Subscription.findOne({ userId }).sort({
      updatedAt: -1,
    });

    return res.status(200).json({
      success: true,
      message:
        "Subscription cancelled successfully. You have been moved to the FREE plan.",
      subscription,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
      error: error.message,
    });
  }
};

// Get subscription analytics
export const getSubscriptionAnalytics = async (req, res) => {
  try {
    const analytics = await Subscription.aggregate([
      {
        $group: {
          _id: "$planType",
          count: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
      {
        $project: {
          plan: "$_id",
          userCount: "$count",
          revenue: "$revenue",
          _id: 0,
        },
      },
    ]);

    return res.status(200).json({ success: true, analytics });
  } catch (error) {
    console.error("Get analytics error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch analytics" });
  }
};

// Get current subscription
export const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await Subscription.findOne({
      userId,
      status: "ACTIVE",
    });
    const user = await User.findById(userId);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.json({
      success: true,
      subscription: {
        planType:
          subscription?.planType || user.currentPlan?.toLowerCase() || "free",
        planName:
          subscription?.planName || `${user.currentPlan} Plan` || "Free Plan",
        startDate: subscription?.startDate,
        endDate: subscription?.endDate,
        status: subscription?.status || "ACTIVE",
      },
      currentPlan: user.currentPlan || "FREE",
      watchTimeLimit: user.watchTimeLimit || 5,
      subscriptionExpiry: user.subscriptionExpiry,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get subscription" });
  }
};

// Check watch limit
export const checkWatchLimit = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const canWatch = user.watchTimeLimit === -1 || user.watchTimeLimit > 0;
    res.json({
      canWatch,
      watchTimeLimit: user.watchTimeLimit,
      currentPlan: user.currentPlan,
    });
  } catch (error) {
    console.error("Check watch limit error:", error);
    res.status(500).json({ message: "Failed to check watch limit" });
  }
};

// Get transaction history
export const getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ transactions });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ message: "Failed to get transactions" });
  }
};
