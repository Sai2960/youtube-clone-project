// src/pages/login.tsx - PREMIUM PROFESSIONAL VERSION
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import Head from "next/head";
import { LogIn, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Import locationApi functions
import {
  checkLocationAndApplyTheme,
  sendOTP as sendOTPApi,
  verifyOTP as verifyOTPApi,
} from "@/lib/locationApi";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://youtube-clone-project-q3pd.onrender.com";

export default function LoginPage() {
  const { user, handlegooglesignin, error } = useUser();
  const router = useRouter();

  // State management
  const [step, setStep] = useState<"login" | "otp">("login");
  const [otpMethod] = useState<"email" | "sms">("email");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [locationInfo, setLocationInfo] = useState<any>(null);

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      const returnUrl = (router.query.returnUrl as string) || "/";
      router.replace(returnUrl);
    }
  }, [user, router]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Check location on mount
  useEffect(() => {
    checkLocation();
  }, []);

  // Check location and apply theme
  const checkLocation = async () => {
    try {
      console.log("🌍 Checking location and theme...");
      const data = await checkLocationAndApplyTheme();

      if (data) {
        // ✅ Don't change OTP method - always use email
        setLocationInfo(data);

        console.log("✅ Location detected:", {
          state: data.location.state,
          city: data.location.city,
          theme: data.theme,
          time: `${data.currentHour}:${String(data.currentMinute).padStart(
            2,
            "0"
          )}`,
          isMorningTime: data.isMorningTime,
        });
      }
    } catch (error) {
      console.error("❌ Location check failed:", error);
      console.log("⚠️ Using email OTP");
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await handlegooglesignin();

      // Apply theme after login
      if (locationInfo?.theme) {
        console.log("🎨 Applying theme after login:", locationInfo.theme);
        await checkLocationAndApplyTheme();
      }

      toast.success("Login successful!");
    } catch (error: any) {
      console.error("❌ Google sign-in error:", error);

      // Handle approval pending
      if (error.response?.status === 403) {
        const message = error.response?.data?.message || error.message;

        if (
          message?.includes("pending admin approval") ||
          error.response?.data?.status === "pending_approval"
        ) {
          toast.error("⏳ Account Pending Approval", {
            description:
              "Your account is being reviewed by an administrator. You will be able to log in once approved.",
            duration: 8000,
          });
        } else {
          toast.error(message || "Access denied");
        }
      } else {
        toast.error(error.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };
  const handleSendOTP = async () => {
    if (!contact.trim()) {
      toast.error("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      console.log("📤 Sending OTP to:", contact);

      const response = await fetch(`${API_URL}/api/otp/send-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: contact.trim() }),
      });

      const result = await response.json();

      console.log("✅ Backend Response:", result);

      if (result.success) {
        setCountdown(60);
        setStep("otp");

        // ✅ PREMIUM: Show OTP in a persistent toast for 90 seconds
        if (result.otp) {
          toast.success(
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔐</span>
                <div>
                  <p className="font-bold text-base">OTP Sent Successfully!</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Valid for 5 minutes
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">
                  Your Verification Code:
                </p>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-3xl font-bold tracking-[0.3em] text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700">
                    {result.otp}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.otp);
                      toast.success("Copied to clipboard!", { duration: 2000 });
                    }}
                    className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="text-amber-500 flex-shrink-0 mt-0.5">💡</span>
                <p>
                  Check your email or use the code above. This message will stay
                  visible for 90 seconds.
                </p>
              </div>
            </div>,
            {
              duration: 90000, // 90 seconds (1.5 minutes)
              className:
                "!bg-white dark:!bg-gray-900 !border-2 !border-blue-200 dark:!border-blue-800 !shadow-2xl !p-4 !rounded-2xl !min-w-[400px] !max-w-[500px]",
            }
          );

          // Log for console visibility
          console.log("═══════════════════════════════════════");
          console.log("🔐 YOUR OTP CODE:", result.otp);
          console.log("📧 Email:", result.email);
          console.log("✉️ Email Sent:", result.emailSent);
          console.log("⏱️ Expires in:", result.expiresIn, "seconds");
          if (result.debug?.emailError) {
            console.log("⚠️ Email Error:", result.debug.emailError);
          }
          console.log("═══════════════════════════════════════");
        } else {
          toast.success("OTP sent to your email!");
        }
      } else {
        toast.error(result.error || "Failed to send OTP");
        console.error("❌ Error:", result);
      }
    } catch (error: any) {
      console.error("❌ Network Error:", error);
      toast.error("Network error. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      toast.error("Please enter OTP");
      return;
    }

    if (otp.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    // ✅ PREMIUM: Show verifying toast
    const verifyingToast = toast.loading(
      <div className="flex items-center gap-3">
        <div className="animate-spin h-5 w-5 border-3 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="font-semibold">Verifying your code...</span>
      </div>,
      {
        className:
          "!bg-white dark:!bg-gray-900 !border-2 !border-blue-200 dark:!border-blue-800",
      }
    );

    try {
      console.log("🔐 Verifying OTP...");

      // Step 1: Verify OTP
      const verifyResponse = await fetch(`${API_URL}/api/otp/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, otp }),
      });

      const verifyResult = await verifyResponse.json();
      console.log("📋 Verify result:", verifyResult);

      if (!verifyResult.success) {
        toast.dismiss(verifyingToast);
        toast.error(verifyResult.error || "Invalid OTP", {
          className:
            "!bg-white dark:!bg-gray-900 !border-2 !border-red-200 dark:!border-red-800",
        });
        return;
      }

      // Step 2: Login/Create user
      const loginResponse = await fetch(`${API_URL}/auth/otp-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: contact,
          contactType: otpMethod,
        }),
      });

      const loginData = await loginResponse.json();
      console.log("📦 Login data:", loginData);

      if (!loginData.success || !loginData.token) {
        toast.dismiss(verifyingToast);
        toast.error(loginData.error || "Login failed", {
          className:
            "!bg-white dark:!bg-gray-900 !border-2 !border-red-200 dark:!border-red-800",
        });
        return;
      }

      // Step 3: Store auth data
      localStorage.setItem("token", loginData.token);
      localStorage.setItem("user", JSON.stringify(loginData.user));

      // ✅ Update AuthContext state
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
      }

      // ✅ PREMIUM: Show success message and wait before redirect
      toast.dismiss(verifyingToast);

      toast.success(
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="font-bold text-lg">Login Successful!</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Welcome back, {loginData.user.name}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 p-3 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
              <span>Redirecting to your homepage...</span>
            </div>
          </div>
        </div>,
        {
          duration: 3000,
          className:
            "!bg-white dark:!bg-gray-900 !border-2 !border-green-200 dark:!border-green-800 !shadow-2xl !p-4 !rounded-2xl !min-w-[380px]",
        }
      );

      console.log("✅ Login complete - waiting before redirect...");

      // ✅ PREMIUM: Wait 2 seconds before redirect for better UX
      setTimeout(() => {
        console.log("🏠 Redirecting to home...");
        window.location.replace("/");
      }, 2000);
    } catch (error: any) {
      console.error("❌ Error:", error);
      toast.dismiss(verifyingToast);
      toast.error("Verification failed. Please try again.", {
        className:
          "!bg-white dark:!bg-gray-900 !border-2 !border-red-200 dark:!border-red-800",
      });
    } finally {
      setLoading(false);
    }
  };
  // Handle phone input formatting
  const handlePhoneInput = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, "");
    setContact(cleaned);
  };

  return (
    <>
      <Head>
        <title>Sign in - YouTube</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </Head>

      {/* Premium Background with Animated Gradient Mesh */}
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-[#0a0a0a] dark:via-[#0f0f23] dark:to-[#1a1a2e] flex flex-col">
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large Gradient Orb 1 */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/40 via-purple-400/30 to-pink-400/20 dark:from-blue-600/30 dark:via-purple-600/25 dark:to-pink-600/20 rounded-full blur-3xl animate-float-slow"></div>

          {/* Large Gradient Orb 2 */}
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tl from-indigo-400/40 via-blue-400/30 to-cyan-400/20 dark:from-indigo-600/30 dark:via-blue-600/25 dark:to-cyan-600/20 rounded-full blur-3xl animate-float-slower"></div>

          {/* Medium Orb 3 */}
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-br from-purple-400/30 via-pink-400/25 to-red-400/15 dark:from-purple-600/25 dark:via-pink-600/20 dark:to-red-600/15 rounded-full blur-3xl animate-float"></div>

          {/* Medium Orb 4 */}
          <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-gradient-to-tr from-cyan-400/30 via-teal-400/25 to-emerald-400/15 dark:from-cyan-600/25 dark:via-teal-600/20 dark:to-emerald-600/15 rounded-full blur-3xl animate-float-slow"></div>

          {/* Small Accent Orbs */}
          <div className="absolute top-20 right-1/3 w-48 h-48 bg-gradient-to-br from-yellow-400/25 to-orange-400/20 dark:from-yellow-600/20 dark:to-orange-600/15 rounded-full blur-2xl animate-pulse-slow"></div>
          <div className="absolute bottom-32 left-1/3 w-56 h-56 bg-gradient-to-tl from-rose-400/25 to-pink-400/20 dark:from-rose-600/20 dark:to-pink-600/15 rounded-full blur-2xl animate-pulse-slower"></div>
        </div>

        {/* Subtle Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40 dark:opacity-20"></div>

        {/* Content Container */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:py-8 pb-16 sm:pb-20 w-full">
          <div className="w-full max-w-[440px] lg:max-w-[480px]">
            {/* Premium YouTube Logo Section */}
            <div className="text-center mb-8 sm:mb-10">
              <div className="inline-flex items-center justify-center gap-3 mb-6 sm:mb-8 group cursor-default">
                {/* Iconic Red Play Button with Glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-2xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-600 via-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/50 transform group-hover:scale-105 transition-all duration-300">
                    <div className="w-0 h-0 border-l-[16px] sm:border-l-[18px] border-l-white border-y-[10px] sm:border-y-[11px] border-y-transparent ml-1 drop-shadow-lg"></div>
                  </div>
                </div>

                {/* YouTube Text with Gradient */}
                <div className="flex flex-col">
                  <span className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent drop-shadow-sm">
                    YouTube
                  </span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                Sign in to continue to YouTube
              </p>
            </div>

            {/* Premium Login Card with Glassmorphism */}
            <div className="relative bg-white/90 dark:bg-gray-900/95 backdrop-blur-3xl rounded-3xl border border-gray-200/80 dark:border-gray-700/50 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-gray-900/10 dark:shadow-black/50">
              {/* Subtle Inner Glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/70 via-white/30 to-transparent dark:from-gray-800/40 dark:via-gray-900/20 dark:to-transparent pointer-events-none"></div>

              {/* Content */}
              <div className="relative z-10">
                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-2xl text-sm text-red-700 dark:text-red-400 text-center font-medium">
                    {error}
                  </div>
                )}

                {/* Step 1: Login Options */}
                {step === "login" && (
                  <div className="space-y-5 sm:space-y-6">
                    {/* Premium Google Sign-In Button */}
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full relative group bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-700 hover:via-blue-800 hover:to-blue-700 text-white font-semibold py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {/* Animated Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></div>

                      {loading ? (
                        <span className="flex items-center justify-center gap-3 relative z-10">
                          <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full" />
                          <span className="text-sm sm:text-base">
                            Signing in...
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-3 relative z-10">
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fill="#ffffff"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#ffffff"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#ffffff"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#ffffff"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          <span className="text-sm sm:text-base">
                            Continue with Google
                          </span>
                        </span>
                      )}
                    </button>

                    {/* Premium Divider */}
                    <div className="relative my-6 sm:my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-gray-200 dark:border-gray-700"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-4 sm:px-5 py-1 sm:py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                          or verify with OTP
                        </span>
                      </div>
                    </div>

                    {/* Premium Location Info Card */}
                    {locationInfo && (
                      <div className="relative group bg-gradient-to-br from-indigo-50/95 via-blue-50/95 to-purple-50/95 dark:from-indigo-950/80 dark:via-blue-950/80 dark:to-purple-950/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border-2 border-indigo-200/80 dark:border-indigo-800/60 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                        {/* Animated Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                          <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-xl sm:text-2xl">
                              {otpMethod === "email" ? "📧" : "📱"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base mb-0.5 sm:mb-1">
                              {otpMethod === "email" ? "Email OTP" : "SMS OTP"}{" "}
                              Verification
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 truncate">
                              <span>📍</span>
                              <span className="font-medium">
                                {locationInfo.location.city},{" "}
                                {locationInfo.location.state}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Premium Contact Input */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="relative group">
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          className="h-12 sm:h-14 px-4 sm:px-5 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 pr-12"
                        />
                        {/* Input Icon */}
                        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                          {otpMethod === "email" ? (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 px-1 flex items-center gap-1.5">
                        <span className="text-blue-500">ℹ️</span>
                        {otpMethod === "sms"
                          ? "Enter 10-digit number without country code"
                          : "Use your active email address"}
                      </p>
                    </div>

                    {/* Premium Send OTP Button */}
                    <Button
                      onClick={handleSendOTP}
                      disabled={loading || countdown > 0}
                      className="w-full h-12 sm:h-13 text-sm sm:text-base font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:shadow-none relative overflow-hidden group transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                      {countdown > 0 ? (
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Resend in {countdown}s
                        </span>
                      ) : loading ? (
                        <span className="relative z-10 flex items-center gap-2 justify-center">
                          <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full" />
                          Sending...
                        </span>
                      ) : (
                        <span className="relative z-10">Send OTP</span>
                      )}
                    </Button>

                    {/* Already Have OTP Link */}
                    <button
                      onClick={() => setStep("otp")}
                      className="w-full text-blue-600 dark:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/30 backdrop-blur-sm py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                    >
                      Already have OTP? Enter code →
                    </button>
                  </div>
                )}

                {/* Step 2: Premium OTP Verification */}
                {step === "otp" && (
                  <div className="space-y-5 sm:space-y-6">
                    {/* Premium OTP Header */}
                    <div className="text-center mb-6 sm:mb-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl sm:rounded-3xl mb-4 sm:mb-6 shadow-2xl shadow-green-500/40 animate-pulse-subtle">
                        <span className="text-3xl sm:text-4xl">🔐</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                        Verify Your Identity
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Enter the 6-digit code sent to
                      </p>
                      <p className="font-bold text-sm sm:text-base text-blue-600 dark:text-blue-400 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50/80 dark:bg-blue-950/40 backdrop-blur-sm rounded-xl inline-block break-all max-w-full">
                        {contact}
                      </p>
                    </div>

                    {/* Premium OTP Input */}
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="• • • • • •"
                        value={otp}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setOtp(value);
                        }}
                        maxLength={6}
                        className="h-16 sm:h-20 text-center text-2xl sm:text-4xl tracking-[0.5em] sm:tracking-[0.8em] font-bold border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 transition-all shadow-inner backdrop-blur-sm"
                      />
                      {otp.length > 0 && (
                        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                          <div
                            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                              otp.length === 6
                                ? "bg-green-500 animate-pulse shadow-lg shadow-green-500/50"
                                : "bg-gray-400"
                            }`}
                          ></div>
                        </div>
                      )}
                    </div>

                    {/* Premium Verify Button */}
                    <Button
                      onClick={handleVerifyOTP}
                      disabled={loading || otp.length !== 6}
                      className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 disabled:opacity-50 disabled:shadow-none relative overflow-hidden group transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                      {loading ? (
                        <span className="relative z-10 flex items-center gap-3 justify-center">
                          <div className="animate-spin h-5 w-5 sm:h-6 sm:w-6 border-3 border-white border-t-transparent rounded-full" />
                          <span>Verifying...</span>
                        </span>
                      ) : (
                        <span className="relative z-10 flex items-center gap-2 justify-center">
                          <span>Verify & Continue</span>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </span>
                      )}
                    </Button>

                    {/* Premium Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setStep("login")}
                        className="flex-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 backdrop-blur-sm py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all border border-gray-300 dark:border-gray-600 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleSendOTP}
                        disabled={loading || countdown > 0}
                        className="flex-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/30 backdrop-blur-sm py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all border border-blue-300 dark:border-blue-700 disabled:opacity-50 disabled:hover:bg-transparent transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {countdown > 0
                          ? `Resend (${countdown}s)`
                          : "Resend Code"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Footer Links */}
            <div className="mt-8 sm:mt-10 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
              <a
                href="#"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors"
              >
                Help Center
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="#"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors"
              >
                Privacy Policy
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="#"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors"
              >
                Terms of Service
              </a>
            </div>

            {/* Premium Debug Info */}
            {process.env.NODE_ENV === "development" && locationInfo && (
              <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-gradient-to-br from-amber-50/90 via-yellow-50/90 to-orange-50/90 dark:from-amber-950/50 dark:via-yellow-950/50 dark:to-orange-950/50 backdrop-blur-sm border-2 border-amber-200 dark:border-amber-800 rounded-2xl text-xs sm:text-sm shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm sm:text-base">
                      🧪
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                    Development Debug Info
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-gray-700 dark:text-gray-300">
                  <div className="col-span-2 p-2.5 sm:p-3 bg-white/60 dark:bg-black/30 backdrop-blur-sm rounded-xl">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Location
                    </p>
                    <p className="font-bold text-sm">
                      {locationInfo.location.city},{" "}
                      {locationInfo.location.state}
                    </p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white/60 dark:bg-black/30 backdrop-blur-sm rounded-xl">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Theme
                    </p>
                    <p className="font-bold text-sm capitalize">
                      {locationInfo.theme}
                    </p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white/60 dark:bg-black/30 backdrop-blur-sm rounded-xl">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      OTP Method
                    </p>
                    <p className="font-bold text-sm uppercase">{otpMethod}</p>
                  </div>
                  <div className="col-span-2 p-2.5 sm:p-3 bg-white/60 dark:bg-black/30 backdrop-blur-sm rounded-xl">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Current Time (IST)
                    </p>
                    <p className="font-bold text-sm">
                      {locationInfo.currentHour}:
                      {String(locationInfo.currentMinute).padStart(2, "0")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Mobile viewport fix */
        :global(html),
        :global(body) {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        :global(body) {
          background: linear-gradient(
            to bottom right,
            rgb(248 250 252),
            rgb(219 234 254),
            rgb(224 231 255)
          );
        }

        :global(.dark body) {
          background: linear-gradient(
            to bottom right,
            #0a0a0a,
            #0f0f23,
            #1a1a2e
          );
        }

        .min-h-screen {
          min-height: 100vh;
          min-height: 100dvh;
        }

        /* iOS Safari fix */
        @supports (-webkit-touch-callout: none) {
          .min-h-screen {
            min-height: -webkit-fill-available;
          }

          :global(html) {
            height: -webkit-fill-available;
          }
        }

        /* Mobile specific fixes */
        @media (max-width: 640px) {
          .min-h-screen {
            min-height: 100vh;
            min-height: 100dvh;
          }
        }

        @media (hover: none) and (pointer: coarse) {
          :global(button),
          :global(a) {
            -webkit-tap-highlight-color: transparent;
          }
        }

        /* Animations */
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-40px, 40px) scale(1.05);
          }
        }

        @keyframes float-slower {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(50px, -50px) scale(1.08);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }

        @keyframes pulse-slower {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        @keyframes pulse-subtle {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        :global(.animate-float) {
          animation: float 20s ease-in-out infinite;
        }
        :global(.animate-float-slow) {
          animation: float-slow 25s ease-in-out infinite;
        }
        :global(.animate-float-slower) {
          animation: float-slower 30s ease-in-out infinite;
        }
        :global(.animate-pulse-slow) {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        :global(.animate-pulse-slower) {
          animation: pulse-slower 10s ease-in-out infinite;
        }
        :global(.animate-pulse-subtle) {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        /* ✅ FIXED: Mobile-specific card adjustments - solid backgrounds */
        @media (max-width: 640px) {
          /* Main login card - SOLID background to prevent scroll issues */
          :global(.relative.bg-white\/90.dark\:bg-gray-900\/95) {
            background: #ffffff !important;
            border: 2px solid rgb(229, 231, 235) !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15),
              0 0 0 1px rgba(0, 0, 0, 0.05) !important;
          }

          :global(.dark .relative.bg-white\/90.dark\:bg-gray-900\/95) {
            background: rgb(15, 23, 42) !important;
            border: 2px solid rgba(71, 85, 105, 0.6) !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 255, 255, 0.05) !important;
          }

          /* Location info card - SOLID gradient background */
          :global(.bg-gradient-to-br.from-indigo-50\/95) {
            background: linear-gradient(
              to bottom right,
              rgb(238, 242, 255),
              rgb(224, 231, 255),
              rgb(237, 233, 254)
            ) !important;
            border: 2.5px solid rgb(199, 210, 254) !important;
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15) !important;
          }

          :global(.dark .bg-gradient-to-br.from-indigo-50\/95) {
            background: linear-gradient(
              to bottom right,
              rgb(30, 27, 75),
              rgb(23, 37, 84),
              rgb(46, 16, 101)
            ) !important;
            border: 2.5px solid rgba(99, 102, 241, 0.5) !important;
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25) !important;
          }

          /* Remove inner glow gradient on mobile for better performance */
          :global(.absolute.inset-0.rounded-3xl.bg-gradient-to-br) {
            display: none !important;
          }

          /* Enhanced backdrop blur - remove if causing issues */
          :global(.backdrop-blur-3xl),
          :global(.backdrop-blur-md),
          :global(.backdrop-blur-sm) {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          /* Input fields - SOLID backgrounds */
          :global(input.border-2) {
            background: #ffffff !important;
            border: 2px solid rgb(209, 213, 219) !important;
          }

          :global(.dark input.border-2) {
            background: rgb(31, 41, 55) !important;
            border: 2px solid rgb(75, 85, 99) !important;
          }

          /* Ensure fixed positioning during scroll */
          :global(.min-h-screen) {
            position: relative;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
          }

          /* Fix for iOS Safari scrolling */
          :global(body) {
            position: fixed;
            width: 100%;
            overflow-y: scroll;
            -webkit-overflow-scrolling: touch;
          }

          /* Enhance backdrop blur for mobile */
          :global(.backdrop-blur-3xl),
          :global(.backdrop-blur-md),
          :global(.backdrop-blur-sm) {
            backdrop-filter: blur(24px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
          }

          /* Input fields - better contrast on mobile */
          :global(input.border-2) {
            background-color: rgba(255, 255, 255, 0.95) !important;
            border-width: 2px !important;
          }

          :global(.dark input.border-2) {
            background-color: rgba(31, 41, 55, 0.95) !important;
          }

          /* Buttons - ensure full opacity on mobile */
          :global(button.bg-gradient-to-r) {
            backdrop-filter: none !important;
          }

          /* Touch target sizes for mobile */
          :global(button),
          :global(a) {
            min-height: 44px;
            min-width: 44px;
          }

          /* Prevent text size adjustment on mobile */
          :global(body) {
            -webkit-text-size-adjust: 100%;
            -moz-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
        }

        /* Tablet adjustments */
        @media (min-width: 641px) and (max-width: 1024px) {
          :global(.relative.bg-white\/90.dark\:bg-gray-900\/95) {
            background-color: rgba(255, 255, 255, 0.95) !important;
          }

          :global(.dark .relative.bg-white\/90.dark\:bg-gray-900\/95) {
            background-color: rgba(15, 23, 42, 0.96) !important;
          }
        }
      `}</style>
    </>
  );
}
