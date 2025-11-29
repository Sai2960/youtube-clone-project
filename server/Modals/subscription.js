import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

 
  planType: {
    type: String,
    enum: [
      "free",
      "premium",
      "bronze",
      "silver",
      "gold",
      "monthly",
      "yearly"
    ],
    default: "free"
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
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },


  status: {
    type: String,
    enum: ["ACTIVE", "EXPIRED", "CANCELLED"],
    default: "ACTIVE"
  },
  isActive: {
    type: Boolean,
    default: true
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
    default: "pending"
  },
  lastPaymentDate: Date,
  nextBillingDate: Date,
}, { timestamps: true });


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

/* ==============================

   ============================== */
subscriptionSchema.statics.getUserSubscription = async function(userId) {
  let subscription = await this.findOne({ userId }).sort({ createdAt: -1 });

  if (!subscription) {
    subscription = new this({
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
    await subscription.save();
  }

  return subscription;
};

/* ✅ Indexes */
subscriptionSchema.index({ userId: 1, isActive: 1 });
subscriptionSchema.index({ planType: 1, paymentStatus: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
