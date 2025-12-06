/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Crown, Check, Loader2, Zap, Star } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import axiosInstance from "@/lib/axiosinstance";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PremiumPage = () => {
  const { user } = useUser();
  const { subscription, refreshSubscription } = useSubscription();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const planIcons: Record<string, any> = {
    FREE: Star,
    BRONZE: Zap,
    SILVER: Crown,
    GOLD: Crown,
  };

  const planColors: Record<string, string> = {
    FREE: "from-gray-600 to-gray-800",
    BRONZE: "from-orange-500 to-orange-700",
    SILVER: "from-gray-400 to-gray-600",
    GOLD: "from-yellow-400 to-yellow-600",
  };

  const planFeatures: Record<string, string[]> = {
    FREE: ["5 minutes watch time", "Basic features", "Ad-supported", "1 download per day"],
    BRONZE: ["7 minutes watch time", "Basic features", "Reduced ads", "30 days validity", "Unlimited downloads"],
    SILVER: ["10 minutes watch time", "Premium features", "No ads", "30 days validity", "Unlimited downloads", "HD quality"],
    GOLD: ["Unlimited watch time", "All premium features", "No ads", "30 days validity", "Priority support", "Unlimited HD downloads"],
  };

  useEffect(() => {
    fetchPlans();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchPlans = async () => {
    try {
      const response = await axiosInstance.get("/subscription/plans");
      setPlans(
        Object.entries(response.data).map(([key, value]: any) => ({
          id: key,
          name: key,
          price: value.price,
        }))
      );
    } catch (error) {
      console.error("Error fetching plans:", error);
      setPlans([
        { id: "FREE", name: "FREE", price: 0 },
        { id: "BRONZE", name: "BRONZE", price: 10 },
        { id: "SILVER", name: "SILVER", price: 50 },
        { id: "GOLD", name: "GOLD", price: 100 },
      ]);
    } finally {
      setLoading(false);
    }
  };

const handleSubscribe = async (plan: any) => {
  if (plan.id === "FREE") return;
  if (!user) {
    alert("Please login to subscribe");
    return;
  }

  setSelectedPlan(plan.id);
  setProcessing(true);

  try {
    // Step 1: Create order
    const orderResponse = await axiosInstance.post("/subscription/create-order", {
      userId: user._id,
      plan: plan.id,
    });

    if (!orderResponse.data.success) {
      throw new Error(orderResponse.data.message || "Failed to create order");
    }

    const { order } = orderResponse.data;

    // ✅ Step 2: Validate Razorpay key
    const razorpayKey = order.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!razorpayKey) {
      console.error('❌ Razorpay key not configured');
      throw new Error('Payment service configuration error');
    }

    // Step 3: Initialize Razorpay
    const options = {
      key: razorpayKey, // ✅ Validated key
      amount: order.amount * 100,
      currency: order.currency,
      name: "YouTube Clone Premium",
      description: `${plan.name} Plan Subscription`,
      order_id: order.orderId,
      handler: async function (response: any) {
        try {
          const verifyResponse = await axiosInstance.post("/subscription/verify-payment", {
            userId: user._id,
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            plan: plan.id,
          });

          if (verifyResponse.data.success) {
            alert("🎉 Payment successful! Subscription active.");
            await refreshSubscription();
            window.location.href = "/";
          } else {
            throw new Error(verifyResponse.data.message || "Verification failed");
          }
        } catch (err: any) {
          console.error("Verification error:", err);
          alert(err.response?.data?.message || "Payment verification failed. Please contact support.");
        }
      },
      prefill: { 
        name: user.name, 
        email: user.email 
      },
      theme: { color: "#EF4444" },
      modal: {
        ondismiss: () => {
          setProcessing(false);
          setSelectedPlan(null);
        }
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (err: any) {
    console.error("Payment error:", err);
    alert(err.message || "Payment initialization failed. Please try again.");
    setProcessing(false);
    setSelectedPlan(null);
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-youtube-primary">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-youtube-primary py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-4">
            <Crown className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-youtube-primary mb-4">
            Unlock unlimited watch time and exclusive features
          </h1>
          <p className="text-lg md:text-xl text-youtube-secondary">
            Choose the perfect plan for your viewing experience
          </p>
        </div>

        {/* Active Subscription Banner */}
        {subscription && subscription.planType !== 'free' && (
          <div className="mb-8 p-6 bg-youtube-secondary border-2 border-green-500 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-full">
                  <Crown className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-youtube-primary">
                    Active {subscription.planType?.toUpperCase()} Subscription
                  </h3>
                  <p className="text-sm text-youtube-secondary">
                    {subscription.planName || 'GOLD Plan'}
                  </p>
                  <p className="text-xs text-youtube-secondary mt-1">
                    Started: {subscription.startDate 
                      ? new Date(subscription.startDate).toLocaleDateString()
                      : '8 October 2025'}
                  </p>
                  <p className="text-xs text-youtube-secondary">
                    Expires: {subscription.endDate 
                      ? new Date(subscription.endDate).toLocaleDateString()
                      : '7 November 2025'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/subscription'}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan: any) => {
            const Icon = planIcons[plan.id as keyof typeof planIcons] || Star;
            const currentPlanType = subscription?.planType?.toUpperCase() || 'FREE';
            const isCurrent = currentPlanType === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-youtube-secondary rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 border-2 ${
                  isCurrent 
                    ? "border-green-500" 
                    : plan.id === "GOLD"
                    ? "border-yellow-500"
                    : "border-youtube"
                }`}
              >
                {/* Best Value Badge */}
                {plan.id === "GOLD" && !isCurrent && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 py-1 text-xs font-bold rounded-bl-lg z-10">
                    BEST VALUE
                  </div>
                )}
                
                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 text-xs font-bold rounded-br-lg z-10">
                    CURRENT PLAN
                  </div>
                )}

                {/* Plan Header */}
                <div className={`bg-gradient-to-br ${planColors[plan.id]} p-6 text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  <Icon className="w-10 h-10 mb-3 relative z-10" />
                  <h2 className="text-2xl font-bold mb-2 relative z-10">{plan.name}</h2>
                  <div className="text-3xl font-bold relative z-10">₹{plan.price}</div>
                  {plan.id !== 'FREE' && (
                    <div className="text-sm opacity-90 mt-1 relative z-10">30 days validity</div>
                  )}
                </div>

                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {planFeatures[plan.id as keyof typeof planFeatures].map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-youtube-secondary text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Subscribe Button */}
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={processing || isCurrent || plan.id === "FREE"}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                      isCurrent
                        ? "bg-youtube-hover text-youtube-secondary cursor-not-allowed"
                        : plan.id === "FREE"
                        ? "bg-youtube-hover text-youtube-secondary cursor-not-allowed"
                        : `bg-gradient-to-r ${planColors[plan.id]} text-white hover:opacity-90 hover:shadow-lg transform hover:-translate-y-1`
                    }`}
                  >
                    {processing && selectedPlan === plan.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : plan.id === "FREE" ? (
                      "Cannot Downgrade"
                    ) : (
                      "Subscribe Now"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-youtube-secondary rounded-xl p-8 shadow-lg border border-youtube">
          <h2 className="text-2xl font-bold text-youtube-primary mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-youtube-primary mb-2 flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                What are the watch time limits?
              </h3>
              <p className="text-youtube-secondary ml-5">
                FREE: 5 minutes | BRONZE: 7 minutes | SILVER: 10 minutes | GOLD: Unlimited
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-youtube-primary mb-2 flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-youtube-secondary ml-5">
                Yes, you can cancel your subscription at any time. You'll be moved back to the FREE plan immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-youtube-primary mb-2 flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                Can I upgrade my plan?
              </h3>
              <p className="text-youtube-secondary ml-5">
                Yes! You can upgrade from BRONZE to SILVER or GOLD, or from SILVER to GOLD at any time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-youtube-primary mb-2 flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                What payment methods do you accept?
              </h3>
              <p className="text-youtube-secondary ml-5">
                We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;