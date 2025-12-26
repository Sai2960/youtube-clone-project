// src/pages/login.tsx - MOBILE-OPTIMIZED VERSION
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

      if (locationInfo?.theme) {
        console.log("🎨 Applying theme after login:", locationInfo.theme);
        await checkLocationAndApplyTheme();
      }

      toast.success("Login successful!");
    } catch (error: any) {
      console.error("❌ Google sign-in error:", error);

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

        if (result.otp) {
          toast.success(
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔐</span>
                <div>
                  <p className="font-bold text-sm">OTP Sent Successfully!</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Valid for 5 minutes
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-semibold">
                  Your Verification Code:
                </p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xl font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-md border border-blue-300 dark:border-blue-700">
                    {result.otp}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.otp);
                      toast.success("Copied!", { duration: 2000 });
                    }}
                    className="flex-shrink-0 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="text-amber-500 flex-shrink-0 mt-0.5">💡</span>
                <p>Check your email or use the code above.</p>
              </div>
            </div>,
            {
              duration: 90000,
              className:
                "!bg-white dark:!bg-gray-900 !border !border-blue-200 dark:!border-blue-800 !shadow-xl !p-3 !rounded-xl !min-w-[340px] !max-w-[400px]",
            }
          );

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
    const verifyingToast = toast.loading(
      <div className="flex items-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="font-semibold text-sm">Verifying your code...</span>
      </div>,
      {
        className:
          "!bg-white dark:!bg-gray-900 !border !border-blue-200 dark:!border-blue-800",
      }
    );

    try {
      console.log("🔐 Verifying OTP...");

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
            "!bg-white dark:!bg-gray-900 !border !border-red-200 dark:!border-red-800",
        });
        return;
      }

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
            "!bg-white dark:!bg-gray-900 !border !border-red-200 dark:!border-red-800",
        });
        return;
      }

      localStorage.setItem("token", loginData.token);
      localStorage.setItem("user", JSON.stringify(loginData.user));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
      }

      toast.dismiss(verifyingToast);

      toast.success(
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
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
              <p className="font-bold text-base">Login Successful!</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Welcome back, {loginData.user.name}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 p-2.5 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="animate-spin h-3.5 w-3.5 border-2 border-green-600 border-t-transparent rounded-full"></div>
              <span>Redirecting to your homepage...</span>
            </div>
          </div>
        </div>,
        {
          duration: 3000,
          className:
            "!bg-white dark:!bg-gray-900 !border !border-green-200 dark:!border-green-800 !shadow-xl !p-3 !rounded-xl !min-w-[320px]",
        }
      );

      console.log("✅ Login complete - waiting before redirect...");

      setTimeout(() => {
        console.log("🏠 Redirecting to home...");
        window.location.replace("/");
      }, 2000);
    } catch (error: any) {
      console.error("❌ Error:", error);
      toast.dismiss(verifyingToast);
      toast.error("Verification failed. Please try again.", {
        className:
          "!bg-white dark:!bg-gray-900 !border !border-red-200 dark:!border-red-800",
      });
    } finally {
      setLoading(false);
    }
  };

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

      {/* MOBILE-OPTIMIZED: Simplified background with better performance */}
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-[#0a0a0a] dark:via-[#0f0f23] dark:to-[#1a1a2e] flex flex-col">
        {/* MOBILE-OPTIMIZED: Reduced number of gradient orbs for better performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Primary gradient orb */}
          <div className="absolute -top-32 -left-32 w-80 h-80 md:w-96 md:h-96 bg-gradient-to-br from-blue-400/30 via-purple-400/20 to-pink-400/15 dark:from-blue-600/25 dark:via-purple-600/20 dark:to-pink-600/15 rounded-full blur-3xl animate-float-slow"></div>

          {/* Secondary gradient orb */}
          <div className="absolute -bottom-32 -right-32 w-96 h-96 md:w-[500px] md:h-[500px] bg-gradient-to-tl from-indigo-400/30 via-blue-400/20 to-cyan-400/15 dark:from-indigo-600/25 dark:via-blue-600/20 dark:to-cyan-600/15 rounded-full blur-3xl animate-float-slower"></div>

          {/* Accent orb - hidden on very small screens */}
          <div className="hidden sm:block absolute top-1/3 right-1/4 w-64 h-64 md:w-72 md:h-72 bg-gradient-to-br from-purple-400/25 via-pink-400/20 to-red-400/10 dark:from-purple-600/20 dark:via-pink-600/15 dark:to-red-600/10 rounded-full blur-3xl animate-float"></div>
        </div>

        {/* MOBILE-OPTIMIZED: Lighter grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDIiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30 dark:opacity-15"></div>

        {/* MOBILE-OPTIMIZED: Content container with better mobile spacing */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:py-8 w-full safe-area-inset">
          <div className="w-full max-w-[420px] sm:max-w-[440px] lg:max-w-[480px]">
            {/* MOBILE-OPTIMIZED: Compact YouTube logo section */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center gap-2.5 sm:gap-3 mb-5 sm:mb-6 group cursor-default">
                {/* MOBILE-OPTIMIZED: Smaller logo with optimized glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-red-600 via-red-500 to-red-700 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/40 transform group-hover:scale-105 transition-all duration-300">
                    <div className="w-0 h-0 border-l-[14px] sm:border-l-[16px] md:border-l-[18px] border-l-white border-y-[9px] sm:border-y-[10px] md:border-y-[11px] border-y-transparent ml-1 drop-shadow-lg"></div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent drop-shadow-sm">
                    YouTube
                  </span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                Sign in to continue to YouTube
              </p>
            </div>

            {/* MOBILE-OPTIMIZED: Login card with solid background on mobile */}
            <div className="mobile-card relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6 md:p-8 lg:p-10 shadow-xl dark:shadow-2xl">
              {/* MOBILE-OPTIMIZED: Removed backdrop blur and heavy effects on mobile */}
              <div className="hidden sm:block absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/50 via-white/20 to-transparent dark:from-gray-800/30 dark:via-gray-900/15 dark:to-transparent pointer-events-none"></div>

              {/* Content */}
              <div className="relative z-10">
                {/* Error Message */}
                {error && (
                  <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-700 dark:text-red-400 text-center font-medium">
                    {error}
                  </div>
                )}

                {/* Step 1: Login Options */}
                {step === "login" && (
                  <div className="space-y-4 sm:space-y-5">
                    {/* MOBILE-OPTIMIZED: Touch-friendly Google button */}
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full relative group bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-700 hover:via-blue-800 hover:to-blue-700 active:from-blue-800 active:via-blue-900 active:to-blue-800 text-white font-semibold py-3.5 sm:py-4 px-5 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg shadow-blue-500/25 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden touch-manipulation"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></div>

                      {loading ? (
                        <span className="flex items-center justify-center gap-2.5 relative z-10">
                          <div className="animate-spin h-4.5 w-4.5 border-2.5 border-white border-t-transparent rounded-full" />
                          <span className="text-sm sm:text-base">
                            Signing in...
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2.5 relative z-10">
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
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

                    {/* MOBILE-OPTIMIZED: Compact divider */}
                    <div className="relative my-5 sm:my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 sm:px-4 py-1 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
                          or verify with OTP
                        </span>
                      </div>
                    </div>

                    {/* MOBILE-OPTIMIZED: Compact location card */}
                    {locationInfo && (
                      <div className="relative group bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-950/60 dark:via-blue-950/60 dark:to-purple-950/60 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-indigo-200 dark:border-indigo-800/60 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                        <div className="flex items-center gap-2.5 sm:gap-3 relative z-10">
                          <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                            <span className="text-lg sm:text-xl">
                              {otpMethod === "email" ? "📧" : "📱"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base mb-0.5">
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

                    {/* MOBILE-OPTIMIZED: Touch-friendly input */}
                    <div className="space-y-2">
                      <div className="relative group">
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          className="h-12 sm:h-14 px-4 sm:px-5 text-base border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 pr-11 touch-manipulation"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
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
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 px-1 flex items-center gap-1.5">
                        <span className="text-blue-500">ℹ️</span>
                        Use your active email address
                      </p>
                    </div>

                    {/* MOBILE-OPTIMIZED: Touch-friendly Send OTP button */}
                    <Button
                      onClick={handleSendOTP}
                      disabled={loading || countdown > 0}
                      className="w-full h-12 sm:h-13 text-sm sm:text-base font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 active:from-indigo-800 active:via-purple-800 active:to-indigo-800 text-white rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg shadow-purple-500/25 active:shadow-sm disabled:opacity-50 disabled:shadow-none relative overflow-hidden group touch-manipulation"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
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
                          <div className="animate-spin h-4.5 w-4.5 border-2.5 border-white border-t-transparent rounded-full" />
                          Sending...
                        </span>
                      ) : (
                        <span className="relative z-10">Send OTP</span>
                      )}
                    </Button>

                    {/* MOBILE-OPTIMIZED: Touch-friendly link */}
                    <button
                      onClick={() => setStep("otp")}
                      className="w-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 active:bg-blue-100 dark:active:bg-blue-950/50 py-2.5 sm:py-3 rounded-xl text-sm font-bold transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 touch-manipulation"
                    >
                      Already have OTP? Enter code →
                    </button>
                  </div>
                )}

                {/* Step 2: MOBILE-OPTIMIZED OTP Verification */}
                {step === "otp" && (
                  <div className="space-y-4 sm:space-y-5">
                    {/* MOBILE-OPTIMIZED: Compact header */}
                    <div className="text-center mb-5 sm:mb-6">
                      <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl sm:rounded-2xl mb-3.5 sm:mb-4 shadow-xl shadow-green-500/30 animate-pulse-subtle">
                        <span className="text-2xl sm:text-3xl">🔐</span>
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                        Verify Your Identity
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
                        Enter the 6-digit code sent to
                      </p>
                      <p className="font-bold text-sm sm:text-base text-blue-600 dark:text-blue-400 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg inline-block break-all max-w-full">
                        {contact}
                      </p>
                    </div>

                    {/* MOBILE-OPTIMIZED: Touch-friendly OTP input */}
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="• • • • • •"
                        value={otp}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setOtp(value);
                        }}
                        maxLength={6}
                        className="h-16 sm:h-18 md:h-20 text-center text-xl sm:text-2xl md:text-4xl tracking-[0.4em] sm:tracking-[0.6em] font-bold border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-500/20 transition-all shadow-inner touch-manipulation"
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

                    {/* MOBILE-OPTIMIZED: Touch-friendly Verify button */}
                    <Button
                      onClick={handleVerifyOTP}
                      disabled={loading || otp.length !== 6}
                      className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 active:from-green-800 active:via-emerald-800 active:to-green-800 text-white rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg shadow-green-500/25 active:shadow-sm disabled:opacity-50 disabled:shadow-none relative overflow-hidden group touch-manipulation"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                      {loading ? (
                        <span className="relative z-10 flex items-center gap-2.5 justify-center">
                          <div className="animate-spin h-4.5 w-4.5 sm:h-5 sm:w-5 border-2.5 border-white border-t-transparent rounded-full" />
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

                    {/* MOBILE-OPTIMIZED: Touch-friendly action buttons */}
                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={() => setStep("login")}
                        className="flex-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 py-2.5 sm:py-3 rounded-xl text-sm font-bold transition-all border border-gray-300 dark:border-gray-600 touch-manipulation"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleSendOTP}
                        disabled={loading || countdown > 0}
                        className="flex-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 active:bg-blue-100 dark:active:bg-blue-950/50 py-2.5 sm:py-3 rounded-xl text-sm font-bold transition-all border border-blue-300 dark:border-blue-700 disabled:opacity-50 disabled:hover:bg-transparent touch-manipulation"
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

            {/* MOBILE-OPTIMIZED: Compact footer links */}
            <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <a
                href="#"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors touch-manipulation"
              >
                Help Center
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="#"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors touch-manipulation"
              >
                Privacy Policy
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="#"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors touch-manipulation"
              >
                Terms of Service
              </a>
            </div>

            {/* MOBILE-OPTIMIZED: Compact debug info */}
            {process.env.NODE_ENV === "development" && locationInfo && (
              <div className="mt-5 sm:mt-6 p-3.5 sm:p-4 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/40 dark:via-yellow-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs sm:text-sm shadow-md">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">🧪</span>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">
                    Development Debug Info
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-700 dark:text-gray-300">
                  <div className="col-span-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                      Location
                    </p>
                    <p className="font-bold text-sm">
                      {locationInfo.location.city},{" "}
                      {locationInfo.location.state}
                    </p>
                  </div>
                  <div className="p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                      Theme
                    </p>
                    <p className="font-bold text-sm capitalize">
                      {locationInfo.theme}
                    </p>
                  </div>
                  <div className="p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                      OTP Method
                    </p>
                    <p className="font-bold text-sm uppercase">{otpMethod}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* ============================================ */
        /* MOBILE-OPTIMIZED STYLES */
        /* ============================================ */

        /* Mobile viewport fix - CRITICAL FOR iOS */
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

        /* Safe area insets for notched devices */
        .safe-area-inset {
          padding-left: max(1rem, env(safe-area-inset-left));
          padding-right: max(1rem, env(safe-area-inset-right));
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }

        .min-h-screen {
          min-height: 100vh;
          min-height: 100dvh;
        }

        /* iOS Safari specific fixes */
        @supports (-webkit-touch-callout: none) {
          .min-h-screen {
            min-height: -webkit-fill-available;
          }

          :global(html) {
            height: -webkit-fill-available;
          }
        }

        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          :global(button),
          :global(a),
          :global(input) {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
        }

        /* MOBILE-SPECIFIC OPTIMIZATIONS (< 640px) */
        @media (max-width: 640px) {
          /* ========== SCROLLBAR HIDING ========== */
          :global(*) {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          :global(*::-webkit-scrollbar) {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }

          :global(body) {
            overflow-y: scroll !important;
            overflow-x: hidden !important;
          }

          /* ========== SOLID BACKGROUNDS FOR PERFORMANCE ========== */

          /* Main login card - SOLID background */
          .mobile-card {
            background: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          :global(.dark) .mobile-card {
            background: rgb(15, 23, 42) !important;
          }

          /* Remove gradient overlays on mobile */
          .mobile-card > div:first-child {
            display: none !important;
          }

          /* ========== REMOVE HEAVY VISUAL EFFECTS ========== */

          /* Disable backdrop blur on mobile */
          :global(.backdrop-blur-3xl),
          :global(.backdrop-blur-md),
          :global(.backdrop-blur-sm) {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          /* Simplify shadows */
          :global(.shadow-2xl) {
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15) !important;
          }

          :global(.dark .shadow-2xl) {
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
          }

          /* Reduce animation intensity */
          :global(.animate-float),
          :global(.animate-float-slow),
          :global(.animate-float-slower) {
            animation-duration: 40s !important;
          }

          /* ========== INPUT OPTIMIZATIONS ========== */

          /* Prevent zoom on focus (iOS) */
          :global(input[type="text"]),
          :global(input[type="email"]),
          :global(input[type="tel"]) {
            font-size: 16px !important;
          }

          /* Better touch targets */
          :global(button),
          :global(a),
          :global(input) {
            min-height: 44px;
          }

          /* ========== TOAST OPTIMIZATIONS ========== */

          /* Smaller toasts on mobile */
          :global([data-sonner-toast]) {
            max-width: calc(100vw - 2rem) !important;
            font-size: 14px !important;
          }
        }

        /* ========== ANIMATIONS ========== */

        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(20px, -20px) scale(1.05);
          }
          66% {
            transform: translate(-15px, 15px) scale(0.95);
          }
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-30px, 30px) scale(1.03);
          }
        }

        @keyframes float-slower {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(40px, -40px) scale(1.05);
          }
        }

        @keyframes pulse-subtle {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
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
        :global(.animate-pulse-subtle) {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        /* ========== ACCESSIBILITY ========== */

        /* Respect reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          :global(.border) {
            border-width: 2px !important;
          }
        }
      `}</style>
    </>
  );
}
