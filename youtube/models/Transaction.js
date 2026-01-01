import mongoose from "mongoose";


const PLAN_DETAILS = {
  FREE: { minutes: 5, price: 0 },
  BRONZE: { minutes: 7, price: 10 },
  SILVER: { minutes: 10, price: 50 },
  GOLD: { minutes: Infinity, price: 100 }
};


const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription"
  },
  orderId: String,
  paymentId: String,
  amount: Number,
  currency: {
    type: String,
    default: "INR"
  },
  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING"
  },
  plan: {
    type: String,
    enum: ["FREE", "BRONZE", "SILVER", "GOLD"],
    required: true
  },
  watchLimitMinutes: {
    type: Number,
    default: 5 
  },
  invoiceUrl: String
}, { timestamps: true });


transactionSchema.pre("save", function(next) {
  if (this.plan && PLAN_DETAILS[this.plan]) {
    this.amount = PLAN_DETAILS[this.plan].price;
    this.watchLimitMinutes = PLAN_DETAILS[this.plan].minutes;
  }
  next();
});

transactionSchema.post("save", async function(doc) {
  if (doc.status === "SUCCESS") {
    console.log(`📩 Email triggered for user ${doc.userId} for plan ${doc.plan}`);
  }
});


transactionSchema.statics.upgradePlan = async function(userId, plan, subscriptionId, paymentId, orderId) {
  if (!PLAN_DETAILS[plan]) {
    throw new Error("Invalid plan selected");
  }

  const txn = new this({
    userId,
    subscriptionId,
    plan,
    paymentId,
    orderId,
    amount: PLAN_DETAILS[plan].price,
    status: "SUCCESS" 
  });

  
  txn.invoiceUrl = `/invoices/${txn._id}.pdf`;

  await txn.save();
  return txn;
};


const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
