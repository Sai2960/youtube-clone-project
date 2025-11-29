/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/SubscriptionPage.tsx
import React, { useState, useEffect } from "react";
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

const SubscriptionPage = () => {
  const { user } = useUser();
  const { subscription, refreshSubscription } = useSubscription();
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
      if (response.data.success && response.data.plans) {
        const paidPlans = response.data.plans.filter((p: any) => p.id !== "FREE");
        setPlans(paidPlans);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: any) => {
    const token = localStorage.getItem('token');
    if (!user || !token) {
      alert("Please login to subscribe");
      router.push('/');
      return;
    }

    const planHierarchy: any = { FREE: 0, BRONZE: 1, SILVER: 2, GOLD: 3 };
    const currentLevel = planHierarchy[subscription?.planType?.toUpperCase() || 'FREE'];
    const newLevel = planHierarchy[plan.id];

    if (newLevel < currentLevel) {
      alert("You cannot downgrade to a lower plan. Please cancel your current subscription first.");
      return;
    }

    if (newLevel === currentLevel) {
      alert("You are already subscribed to this plan.");
      return;
    }

    setSelectedPlan(plan.id);
    setProcessing(true);

    try {
      const orderResponse = await axiosInstance.post("/subscription/create-order", {
        plan: plan.id
      });

      if (!orderResponse.data.orderId) {
        throw new Error("Failed to create order");
      }

      const { orderId, amount, currency, keyId } = orderResponse.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "YouTube Clone Premium",
        description: plan.name,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await axiosInstance.post("/subscription/verify-payment", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              plan: plan.id
            });

            if (verifyResponse.data.message) {
              alert("Payment successful! Your subscription is now active. Check your email for the invoice.");
              await refreshSubscription();
              router.push('/');
            }
          } catch (error: any) {
            console.error("Payment verification error:", error);
            if (error.response?.status === 401) {
              alert("Session expired. Please login again.");
              router.push('/');
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#EF4444",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      
      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        router.push('/');
      } else {
        alert(`Payment failed: ${error.response?.data?.message || 'Please try again'}`);
      }
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    const token = localStorage.getItem('token');
    if (!user || !token) {
      alert("Please login to cancel subscription");
      router.push('/');
      return;
    }

    setCancelling(true);
    try {
      const response = await axiosInstance.post('/subscription/cancel');
      
      if (response.data.success) {
        alert('Subscription cancelled successfully. You have been moved to the Free plan.');
        await refreshSubscription();
        setShowCancelModal(false);
        window.location.reload();
      } else {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      
      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        router.push('/');
      } else {
        alert('Failed to cancel subscription. Please try again.');
      }
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-youtube-primary">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  const isPremium = subscription?.planType?.toUpperCase() !== "FREE";

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

        {/* Active Subscription Card */}
        {isPremium && subscription && (
          <div className="max-w-4xl mx-auto mb-8 bg-youtube-secondary rounded-xl shadow-lg p-6 border border-youtube">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="bg-green-500 bg-opacity-20 p-3 rounded-full">
                  <Crown className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-youtube-primary mb-1">
                    Active {subscription.planType?.toUpperCase()} Subscription
                  </h3>
                  <p className="text-youtube-secondary mb-3">
                    {subscription.planName || "Premium Plan"}
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.planType?.toUpperCase() === plan.id;
            const planHierarchy: any = { BRONZE: 1, SILVER: 2, GOLD: 3 };
            const currentLevel = planHierarchy[subscription?.planType?.toUpperCase() || 'FREE'] || 0;
            const planLevel = planHierarchy[plan.id];
            const isUpgrade = planLevel > currentLevel;
            const isDowngrade = planLevel < currentLevel;

            return (
              <div
                key={plan.id}
                className={`relative bg-youtube-secondary rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl border border-youtube ${
                  plan.id === "GOLD" ? "ring-4 ring-yellow-500 scale-105" : ""
                }`}
              >
                {plan.id === "GOLD" && (
                  <div className="absolute top-0 right-0 bg-yellow-500 text-black px-4 py-1 text-sm font-semibold rounded-bl-lg">
                    BEST VALUE
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
                    <p className="text-youtube-secondary mt-1">{plan.duration} days validity</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features?.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-youtube-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={processing || isCurrentPlan || isDowngrade}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                      isCurrentPlan
                        ? "bg-green-500 text-white cursor-not-allowed opacity-70"
                        : isDowngrade
                        ? "bg-youtube-hover text-youtube-disabled cursor-not-allowed"
                        : plan.id === "GOLD"
                        ? "bg-yellow-600 hover:bg-yellow-700 text-black shadow-lg hover:shadow-xl"
                        : "bg-youtube-hover hover:bg-primary text-youtube-primary hover:text-white"
                    }`}
                  >
                    {processing && selectedPlan === plan.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </div>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : isDowngrade ? (
                      "Cannot Downgrade"
                    ) : isUpgrade ? (
                      "Upgrade Now"
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
                Can I upgrade my plan?
              </h3>
              <p className="text-youtube-secondary">
                Yes! You can upgrade from BRONZE to SILVER or GOLD, or from SILVER to GOLD at any time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-youtube-primary">
                Is this a test payment?
              </h3>
              <p className="text-youtube-secondary">
                Yes, we are using Razorpay test mode. Use card 4111 1111 1111 1111 to test. No real money will be charged.
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
                  Are you sure you want to cancel your {subscription?.planType} subscription? You will lose:
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
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500" />
                    Ad-free experience
                  </li>
                </ul>
                <p className="text-sm text-youtube-secondary bg-yellow-500 bg-opacity-10 p-3 rounded-lg border border-yellow-500 border-opacity-30">
                  <strong>Note:</strong> You will be moved to the FREE plan (5 min watch limit) immediately.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 px-4 py-3 bg-youtube-hover text-youtube-primary rounded-lg hover:bg-primary hover:text-white transition-colors font-semibold"
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