// src/components/SubscriptionPage.tsx - PREMIUM DELUXE VERSION
import React, { useState, useEffect, useCallback } from "react";
import {
  Crown,
  Check,
  Loader2,
  X,
  AlertCircle,
  Sparkles,
  Shield,
  Zap,
  Star,
  Diamond,
} from "lucide-react";
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
  const {
    subscription,
    refreshSubscription,
    loading: subscriptionLoading,
  } = useSubscription();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plan styling configuration
  const planConfig: Record<
    string,
    {
      icon: any;
      gradient: string;
      glow: string;
      badge: string;
      iconBg: string;
      borderColor: string;
      buttonGradient: string;
    }
  > = {
    BRONZE: {
      icon: Zap,
      gradient: "from-amber-600 via-orange-500 to-amber-700",
      glow: "shadow-orange-500/20",
      badge: "bg-gradient-to-r from-amber-600 to-orange-500",
      iconBg: "bg-gradient-to-br from-amber-500/20 to-orange-500/20",
      borderColor: "border-amber-500/30 hover:border-amber-400/50",
      buttonGradient: "from-amber-600 via-orange-500 to-amber-600",
    },
    SILVER: {
      icon: Shield,
      gradient: "from-slate-400 via-gray-300 to-slate-500",
      glow: "shadow-slate-400/20",
      badge: "bg-gradient-to-r from-slate-400 to-gray-500",
      iconBg: "bg-gradient-to-br from-slate-400/20 to-gray-400/20",
      borderColor: "border-slate-400/30 hover:border-slate-300/50",
      buttonGradient: "from-slate-500 via-gray-400 to-slate-500",
    },
    GOLD: {
      icon: Crown,
      gradient: "from-yellow-400 via-amber-300 to-yellow-500",
      glow: "shadow-yellow-400/30",
      badge: "bg-gradient-to-r from-yellow-400 to-amber-500",
      iconBg: "bg-gradient-to-br from-yellow-400/20 to-amber-400/20",
      borderColor: "border-yellow-400/40 hover:border-yellow-300/60",
      buttonGradient: "from-yellow-500 via-amber-400 to-yellow-500",
    },
  };

  // ✅ Load Razorpay script
  const loadRazorpayScript = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
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

  // ✅ Fetch plans with improved error handling and timeout
  const fetchPlans = useCallback(async () => {
    try {
      setError(null);
      console.log("📋 Fetching subscription plans...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await axiosInstance.get("/subscription/plans", {
        signal: controller.signal,
        timeout: 25000,
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      clearTimeout(timeoutId);
      console.log("📋 Plans response:", response.data);

      if (response.data.success && response.data.plans) {
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

      const errorMsg =
        err.code === "ECONNABORTED" || err.name === "AbortError"
          ? "Request timed out. Please check your connection and try again."
          : "Failed to load plans. Please refresh the page.";

      setError(errorMsg);

      setPlans([
        {
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
        {
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
        {
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
            alert(
              verifyErr.response?.data?.message || "Payment verification failed"
            );
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

      const errorMessage =
        err.response?.data?.message || err.message || "Payment failed";
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#141414]">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl opacity-30 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 rounded-full animate-pulse"></div>
            <Loader2 className="w-12 h-12 animate-spin text-yellow-500 relative z-10" />
          </div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium tracking-wide">
            Loading premium plans...
          </p>
        </div>
      </div>
    );
  }

  const isPremium = subscription?.planType?.toUpperCase() !== "FREE";
  const currentPlanType = subscription?.planType?.toUpperCase() || "FREE";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#141414] relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-yellow-400/10 via-amber-500/10 to-orange-500/10 dark:from-yellow-400/5 dark:via-amber-500/5 dark:to-orange-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 dark:from-purple-500/5 dark:via-pink-500/5 dark:to-red-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-teal-500/5 dark:from-blue-500/3 dark:via-cyan-500/3 dark:to-teal-500/3 rounded-full blur-3xl"></div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Premium Header */}
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            {/* Animated Crown Icon */}
            <div className="relative inline-flex items-center justify-center mb-6 sm:mb-8">
              <div className="absolute inset-0 blur-2xl opacity-40 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 rounded-full scale-150 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl shadow-yellow-500/30">
                <Crown className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 animate-pulse" />
              <Sparkles
                className="absolute -bottom-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse"
                style={{ animationDelay: "0.5s" }}
              />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                Choose Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Premium Plan
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed px-4">
              Unlock unlimited watch time and exclusive features with our
              premium membership tiers
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8 mt-8 sm:mt-10">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs sm:text-sm">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs sm:text-sm">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                <span>Instant Activation</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs sm:text-sm">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="max-w-4xl mx-auto mb-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-red-700 dark:text-red-300 font-medium">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Active Subscription Card */}
          {isPremium && subscription && (
            <div className="max-w-4xl mx-auto mb-10 sm:mb-12 lg:mb-16">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 rounded-2xl sm:rounded-3xl blur opacity-30 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-green-200 dark:border-green-800/50 shadow-xl">
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                    <div className="flex items-start gap-4 sm:gap-5">
                      <div className="relative">
                        <div className="absolute inset-0 blur-xl opacity-40 bg-green-500 rounded-full"></div>
                        <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                          <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {currentPlanType} Membership
                          </h3>
                          <span className="px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full uppercase tracking-wide">
                            Active
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm sm:text-base">
                          {subscription.planName || `${currentPlanType} Plan`}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-gray-500 dark:text-gray-500">
                              Started:
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {formatDate(subscription.startDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            <span className="text-gray-500 dark:text-gray-500">
                              Expires:
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {formatDate(subscription.endDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full lg:w-auto px-6 py-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/50 transition-all duration-300 font-semibold border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Plan Badge for Free Users */}
          {!isPremium && (
            <div className="max-w-4xl mx-auto mb-10 sm:mb-12">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl">
                    <Star className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-bold text-lg">
                      Current Plan: <span className="text-gray-500">FREE</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      5 minutes watch time limit • Upgrade to unlock more
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-16 sm:mb-20">
            {plans.map((plan, index) => {
              const isCurrentPlan = currentPlanType === plan.id;
              const config = planConfig[plan.id] || planConfig.BRONZE;
              const PlanIcon = config.icon;
              const isGold = plan.id === "GOLD";

              return (
                <div
                  key={plan.id}
                  className={`relative group ${
                    isGold ? "md:col-span-2 lg:col-span-1 lg:-mt-4 lg:mb-4" : ""
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Glow Effect */}
                  <div
                    className={`absolute -inset-0.5 bg-gradient-to-r ${
                      config.gradient
                    } rounded-2xl sm:rounded-3xl blur opacity-0 group-hover:opacity-30 ${
                      isCurrentPlan ? "opacity-20" : ""
                    } ${
                      isGold ? "opacity-20 group-hover:opacity-40" : ""
                    } transition duration-500`}
                  ></div>

                  {/* Card */}
                  <div
                    className={`relative bg-white dark:bg-[#1a1a1a] rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 border ${
                      isCurrentPlan
                        ? "border-green-400 dark:border-green-500"
                        : isGold
                        ? "border-yellow-400/50 dark:border-yellow-500/50"
                        : config.borderColor
                    } ${
                      isGold ? "shadow-2xl shadow-yellow-500/10" : "shadow-xl"
                    } hover:shadow-2xl ${
                      isGold ? "hover:shadow-yellow-500/20" : ""
                    } ${isGold ? "lg:scale-105" : "hover:scale-[1.02]"}`}
                  >
                    {/* Best Value Badge */}
                    {isGold && !isCurrentPlan && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Diamond className="w-4 h-4 text-black" />
                          <span className="text-black font-bold text-sm tracking-wide uppercase">
                            Most Popular
                          </span>
                          <Diamond className="w-4 h-4 text-black" />
                        </div>
                      </div>
                    )}

                    {/* Current Plan Badge */}
                    {isCurrentPlan && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-400 to-emerald-500 py-2 text-center">
                        <span className="text-white font-bold text-sm tracking-wide uppercase">
                          Your Current Plan
                        </span>
                      </div>
                    )}

                    <div
                      className={`p-6 sm:p-8 ${
                        isGold || isCurrentPlan ? "pt-14" : ""
                      }`}
                    >
                      {/* Plan Icon & Name */}
                      <div className="flex items-center gap-4 mb-6">
                        <div
                          className={`relative ${config.iconBg} p-3 sm:p-4 rounded-xl sm:rounded-2xl`}
                        >
                          <div
                            className={`absolute inset-0 blur-lg opacity-40 bg-gradient-to-r ${config.gradient} rounded-xl sm:rounded-2xl`}
                          ></div>
                          <PlanIcon
                            className={`w-6 h-6 sm:w-8 sm:h-8 relative z-10 ${
                              plan.id === "GOLD"
                                ? "text-yellow-500"
                                : plan.id === "SILVER"
                                ? "text-slate-400"
                                : "text-amber-500"
                            }`}
                          />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {plan.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-500">
                            {plan.duration} days access
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-8">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">
                            ₹{plan.price}
                          </span>
                          <span className="text-gray-500 dark:text-gray-500 text-sm sm:text-base font-medium">
                            / month
                          </span>
                        </div>
                        {isGold && (
                          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                            Best value for power users
                          </p>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-6"></div>

                      {/* Features */}
                      <ul className="space-y-4 mb-8">
                        {plan.features?.map((feature: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <div
                              className={`flex-shrink-0 mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r ${config.gradient} flex items-center justify-center`}
                            >
                              <Check
                                className="w-3 h-3 sm:w-4 sm:h-4 text-white"
                                strokeWidth={3}
                              />
                            </div>
                            <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* Subscribe Button */}
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={processing || isCurrentPlan}
                        className={`relative w-full py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 overflow-hidden group/btn ${
                          isCurrentPlan
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 cursor-not-allowed"
                            : `bg-gradient-to-r ${config.buttonGradient} text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0`
                        }`}
                      >
                        {!isCurrentPlan && (
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                        )}
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {processing && selectedPlan === plan.id ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : isCurrentPlan ? (
                            <>
                              <Check className="w-5 h-5" />
                              <span>Current Plan</span>
                            </>
                          ) : (
                            <>
                              <span>Subscribe Now</span>
                              <Sparkles className="w-5 h-5" />
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Everything you need to know about our premium plans
              </p>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-2xl sm:rounded-3xl blur opacity-20"></div>
              <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-gray-200 dark:border-gray-800">
                <div className="space-y-6 sm:space-y-8">
                  {[
                    {
                      question: "What are the watch time limits?",
                      answer:
                        "FREE: 5 minutes | BRONZE: 7 minutes | SILVER: 10 minutes | GOLD: Unlimited",
                      icon: "⏱️",
                    },
                    {
                      question: "Can I cancel my subscription anytime?",
                      answer:
                        "Yes, you can cancel your subscription at any time. You'll be moved back to the FREE plan immediately with no questions asked.",
                      icon: "✨",
                    },
                    {
                      question: "Is this a test payment?",
                      answer:
                        "Yes, we are using Razorpay test mode. Use card 4111 1111 1111 1111 to test the payment flow securely.",
                      icon: "🔐",
                    },
                  ].map((faq, index) => (
                    <div
                      key={index}
                      className={`${
                        index !== 0
                          ? "pt-6 sm:pt-8 border-t border-gray-100 dark:border-gray-800"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-2xl">{faq.icon}</span>
                        <div>
                          <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white mb-2">
                            {faq.question}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="mt-12 sm:mt-16 text-center">
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-gray-400 dark:text-gray-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    256-bit SSL Secure
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Instant Activation
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  <span className="text-sm font-medium">24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl sm:rounded-3xl blur opacity-30"></div>
            <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800">
              {/* Close Button */}
              <button
                onClick={() => setShowCancelModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Cancel Subscription?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Are you sure you want to cancel your {currentPlanType}{" "}
                  subscription?
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 mb-6 border border-red-200 dark:border-red-800/50">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-3">
                  You'll lose access to:
                </p>
                <ul className="space-y-2">
                  {[
                    "Extended watch time",
                    "Premium features",
                    "Ad-free experience",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                    >
                      <X className="w-4 h-4" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-semibold"
                >
                  Keep Plan
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-semibold disabled:opacity-50 shadow-lg shadow-red-500/25"
                >
                  {cancelling ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cancelling...</span>
                    </div>
                  ) : (
                    "Yes, Cancel"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
