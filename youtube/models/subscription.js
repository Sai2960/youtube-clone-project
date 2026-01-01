import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true // ✅ Already good
  },
  planType: {
    type: String,
    enum: ["free", "premium", "bronze", "silver", "gold", "monthly", "yearly"],
    default: "free",
    index: true // ✅ ADD INDEX
  },
  planName: {
    type: String,
    default: "Free Plan"
  },
  price: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now,
    index: true // ✅ ADD INDEX
  },
  endDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ["ACTIVE", "EXPIRED", "CANCELLED"],
    default: "ACTIVE",
    index: true // ✅ ADD INDEX
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true // ✅ ADD INDEX
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  features: {
    unlimitedDownloads: { type: Boolean, default: false },
    hdQuality: { type: Boolean, default: false },
    adFree: { type: Boolean, default: false },
    earlyAccess: { type: Boolean, default: false }
  },
  dailyDownloads: {
    type: Number,
    default: 0
  },
  lastDownloadDate: {
    type: Date,
    default: null
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentId: String,
  orderId: String,
  amount: Number,
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
    index: true // ✅ ADD INDEX
  },
  lastPaymentDate: Date,
  nextBillingDate: Date,
}, { 
  timestamps: true,
  // ✅ ADD THIS - optimize queries
  collation: { locale: 'en', strength: 2 }
});

// =================== COMPOUND INDEXES FOR PERFORMANCE ===================
subscriptionSchema.index({ userId: 1, isActive: 1, status: 1 }); // ✅ Most common query
subscriptionSchema.index({ planType: 1, paymentStatus: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 }); // ✅ For expiration checks
subscriptionSchema.index({ createdAt: -1 }); // ✅ For sorting

// ✅ Keep existing methods (no changes needed)
subscriptionSchema.methods.isValidSubscription = function() {
  if (this.planType === "free") return true;
  if (!this.isActive || this.status !== "ACTIVE") return false;
  if (this.endDate && new Date() > this.endDate) return false;
  return this.paymentStatus === "completed";
};

subscriptionSchema.methods.canDownload = function() {
  if (
    ["premium", "bronze", "silver", "gold", "monthly", "yearly"].includes(this.planType) &&
    this.isValidSubscription()
  ) {
    return { allowed: true, remaining: "unlimited" };
  }

  const today = new Date().toDateString();
  const lastDownload = this.lastDownloadDate ? this.lastDownloadDate.toDateString() : null;

  if (lastDownload !== today) {
    this.dailyDownloads = 0;
  }

  const dailyLimit = 1;
  const remaining = Math.max(0, dailyLimit - this.dailyDownloads);

  return {
    allowed: remaining > 0,
    remaining: remaining
  };
};

subscriptionSchema.methods.incrementDownload = async function() {
  const today = new Date().toDateString();
  const lastDownload = this.lastDownloadDate ? this.lastDownloadDate.toDateString() : null;

  if (lastDownload !== today) {
    this.dailyDownloads = 1;
  } else {
    this.dailyDownloads += 1;
  }

  this.lastDownloadDate = new Date();
  await this.save();
};

subscriptionSchema.statics.getUserSubscription = async function(userId) {
  let subscription = await this.findOne({ userId })
    .sort({ createdAt: -1 })
    .maxTimeMS(3000) // ✅ ADD TIMEOUT
    .lean(); // ✅ ADD LEAN

  if (!subscription) {
    subscription = await this.create({ // ✅ Use create instead of new + save
      userId,
      planType: "free",
      planName: "Free Plan",
      isActive: true,
      status: "ACTIVE",
      features: {
        unlimitedDownloads: false,
        hdQuality: false,
        adFree: false,
        earlyAccess: false
      }
    });
  }

  return subscription;
};

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;