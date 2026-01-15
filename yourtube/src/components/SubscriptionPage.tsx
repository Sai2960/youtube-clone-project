// src/components/SubscriptionPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Crown, Check, Loader2, X, AlertCircle } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
  watchTime: number;
  features: string[];
}

const SubscriptionPage = () => {
  const { user } = useUser();
  const { subscription, refreshSubscription, loading: subscriptionLoading } = useSubscription();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Load Razorpay script
  const loadRazorpayScript = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  // ✅ Fetch plans with error handling
  const fetchPlans = useCallback(async () => {
    try {
      setError(null);
      console.log("📋 Fetching subscription plans...");
      
      const response = await axiosInstance.get("/subscription/plans");
      console.log("📋 Plans response:", response.data);
      
      if (response.data.success && response.data.plans) {
        // Filter out FREE plan for purchase options
        const paidPlans = response.data.plans.filter(
          (p: Plan) => p.id !== "FREE"
        );
        setPlans(paidPlans);
        console.log("✅ Plans loaded:", paidPlans.length);
      } else {
        throw new Error("Invalid plans response");
      }
    } catch (err: any) {
      console.error("❌ Error fetching plans:", err);
      setError("Failed to load plans. Please refresh the page.");
      
      // Fallback plans
      setPlans([
        { 
          id: "BRONZE", 
          name: "BRONZE", 
          price: 10, 
          duration: 30, 
          watchTime: 7,
          features: ["7 minutes watch time", "Basic features", "Reduced ads", "30 days validity"]
        },
        { 
          id: "SILVER", 
          name: "SILVER", 
          price: 50, 
          duration: 30, 
          watchTime: 10,
          features: ["10 minutes watch time", "Premium features", "No ads", "30 days validity"]
        },
        { 
          id: "GOLD", 
          name: "GOLD", 
          price: 100, 
          duration: 30, 
          watchTime: -1,
          features: ["Unlimited watch time", "All premium features", "No ads", "30 days validity", "Priority support"]
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Initialize on mount
  useEffect(() => {
    console.log("🔄 SubscriptionPage mounted");
    
    const init = async () => {
      await loadRazorpayScript();
      await fetchPlans();
    };
    
    init();
  }, [fetchPlans, loadRazorpayScript]);

  // ✅ Handle subscription purchase
  const handleSubscribe = async (plan: Plan) => {
    const token = localStorage.getItem("token");
    
    if (!user || !token) {
      alert("Please login to subscribe");
      router.push("/");
      return;
    }

    const currentPlanType = subscription?.planType?.toUpperCase() || "FREE";

    if (plan.id === currentPlanType) {
      alert("You are already subscribed to this plan.");
      return;
    }

    setSelectedPlan(plan.id);
    setProcessing(true);
    setError(null);

    try {
      console.log("📞 Creating order for plan:", plan.id);
      
      const orderResponse = await axiosInstance.post(
        "/subscription/create-order",
        { plan: plan.id }
      );

      console.log("📋 Order response:", orderResponse.data);

      if (!orderResponse.data.orderId) {
        throw new Error(orderResponse.data.message || "Failed to create order");
      }

      const { orderId, amount, currency, keyId } = orderResponse.data;

      if (!keyId) {
        throw new Error("Payment gateway not configured");
      }

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "YouTube Clone Premium",
        description: `${plan.name} Plan Subscription`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            console.log("✅ Payment successful, verifying...");
            
            const verifyResponse = await axiosInstance.post(
              "/subscription/verify-payment",
              {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                plan: plan.id,
              }
            );

            if (verifyResponse.data.message || verifyResponse.data.success) {
              alert("🎉 Payment successful! Your subscription is now active.");
              await refreshSubscription();
              router.push("/");
            } else {
              throw new Error("Verification failed");
            }
          } catch (verifyErr: any) {
            console.error("❌ Verification error:", verifyErr);
            alert(verifyErr.response?.data?.message || "Payment verification failed");
          } finally {
            setProcessing(false);
            setSelectedPlan(null);
          }
        },
        modal: {
          ondismiss: function () {
            console.log("🔄 Payment modal dismissed");
            setProcessing(false);
            setSelectedPlan(null);
          },
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        theme: {
          color: "#FF0000",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (err: any) {
      console.error("❌ Payment error:", err);
      
      const errorMessage = err.response?.data?.message || err.message || "Payment failed";
      setError(errorMessage);
      alert(errorMessage);
      
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  // ✅ Handle subscription cancellation
  const handleCancelSubscription = async () => {
    const token = localStorage.getItem("token");
    
    if (!user || !token) {
      alert("Please login to cancel subscription");
      router.push("/");
      return;
    }

    setCancelling(true);
    
    try {
      const response = await axiosInstance.post("/subscription/cancel");

      if (response.data.success) {
        alert("Subscription cancelled. You are now on the Free plan.");
        await refreshSubscription();
        setShowCancelModal(false);
      } else {
        throw new Error("Failed to cancel");
      }
    } catch (err: any) {
      console.error("❌ Cancel error:", err);
      alert(err.response?.data?.message || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  // ✅ Format date helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ✅ Loading state
  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-youtube-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-youtube-secondary">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  const isPremium = subscription?.planType?.toUpperCase() !== "FREE";
  const currentPlanType = subscription?.planType?.toUpperCase() || "FREE";

  return (
    <div className="min-h-screen bg-youtube-primary py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-10 h-10 text-yellow-500" />
            <h1 className="text-4xl font-bold text-youtube-primary">
              Choose Your Plan
            </h1>
          </div>
          <p className="text-xl text-youtube-secondary">
            Unlock unlimited watch time and exclusive features
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8 bg-red-500 bg-opacity-10 border border-red-500 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        )}

        {/* Active Subscription Card */}
        {isPremium && subscription && (
          <div className="max-w-4xl mx-auto mb-8 bg-youtube-secondary rounded-xl shadow-lg p-6 border border-green-500">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-green-500 bg-opacity-20 p-3 rounded-full">
                  <Crown className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-youtube-primary mb-1">
                    Active {currentPlanType} Subscription
                  </h3>
                  <p className="text-youtube-secondary mb-3">
                    {subscription.planName || `${currentPlanType} Plan`}
                  </p>
                  <div className="space-y-1 text-sm text-youtube-secondary">
                    <p>
                      <span className="font-semibold">Started:</span>{" "}
                      {formatDate(subscription.startDate)}
                    </p>
                    <p>
                      <span className="font-semibold">Expires:</span>{" "}
                      {formatDate(subscription.endDate)}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 bg-red-600 bg-opacity-20 text-red-500 rounded-lg hover:bg-opacity-30 transition-colors font-semibold"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        )}

        {/* Current Plan Badge for Free Users */}
        {!isPremium && (
          <div className="max-w-4xl mx-auto mb-8 bg-youtube-secondary rounded-xl p-4 border border-youtube">
            <div className="flex items-center gap-3">
              <div className="bg-gray-500 bg-opacity-20 p-2 rounded-full">
                <Crown className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-youtube-primary font-semibold">Current Plan: FREE</p>
                <p className="text-sm text-youtube-secondary">5 minutes watch time limit</p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlanType === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-youtube-secondary rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl border ${
                  isCurrentPlan 
                    ? "border-green-500 ring-2 ring-green-500" 
                    : plan.id === "GOLD" 
                    ? "border-yellow-500 ring-2 ring-yellow-500 scale-105" 
                    : "border-youtube"
                }`}
              >
                {plan.id === "GOLD" && !isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-yellow-500 text-black px-4 py-1 text-sm font-semibold rounded-bl-lg z-10">
                    BEST VALUE
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 text-sm font-semibold rounded-br-lg z-10">
                    CURRENT PLAN
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-youtube-primary mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-youtube-primary">
                        ₹{plan.price}
                      </span>
                    </div>
                    <p className="text-youtube-secondary mt-1">
                      {plan.duration} days validity
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features?.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-youtube-secondary">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={processing || isCurrentPlan}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                      isCurrentPlan
                        ? "bg-green-500 text-white cursor-not-allowed opacity-70"
                        : plan.id === "GOLD"
                        ? "bg-yellow-600 hover:bg-yellow-700 text-black shadow-lg hover:shadow-xl"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {processing && selectedPlan === plan.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </div>
                    ) : isCurrentPlan ? (
                      "Current Plan"
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
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-youtube-primary">
            Frequently Asked Questions
          </h2>
          <div className="bg-youtube-secondary rounded-xl shadow-lg p-8 space-y-6 border border-youtube">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-youtube-primary">
                What are the watch time limits?
              </h3>
              <p className="text-youtube-secondary">
                FREE: 5 minutes | BRONZE: 7 minutes | SILVER: 10 minutes | GOLD: Unlimited
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-youtube-primary">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-youtube-secondary">
                Yes, you can cancel your subscription at any time. You'll be moved back to the FREE plan immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-youtube-primary">
                Is this a test payment?
              </h3>
              <p className="text-youtube-secondary">
                Yes, we are using Razorpay test mode. Use card 4111 1111 1111 1111 to test.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-youtube-secondary rounded-xl shadow-2xl max-w-md w-full p-6 border border-youtube">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-red-500 bg-opacity-20 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-youtube-primary mb-2">
                  Cancel Subscription?
                </h3>
                <p className="text-youtube-secondary mb-4">
                  Are you sure you want to cancel your {currentPlanType} subscription?
                </p>
                <ul className="space-y-2 text-sm text-youtube-secondary mb-4">
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500" />
                    Extended watch time
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500" />
                    Premium features
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 px-4 py-3 bg-youtube-hover text-youtube-primary rounded-lg hover:bg-opacity-80 transition-colors font-semibold"
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
              >
                {cancelling ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelling...
                  </div>
                ) : (
                  "Yes, Cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
