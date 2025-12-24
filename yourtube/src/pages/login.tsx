// src/pages/login.tsx - ENHANCED PROFESSIONAL VERSION
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
  const [otpMethod, setOtpMethod] = useState<"email" | "sms">("email");
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
        setOtpMethod(data.otpMethod);
        setLocationInfo(data);

        console.log("✅ Location detected:", {
          state: data.location.state,
          city: data.location.city,
          theme: data.theme,
          otpMethod: data.otpMethod,
          time: `${data.currentHour}:${String(data.currentMinute).padStart(
            2,
            "0"
          )}`,
          isMorningTime: data.isMorningTime,
        });
      }
    } catch (error) {
      console.error("❌ Location check failed:", error);
      console.log("⚠️ Falling back to email OTP");
      setOtpMethod("email");
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

  // Handle Send OTP
  const handleSendOTP = async () => {
    if (!contact.trim()) {
      toast.error(
        `Please enter your ${otpMethod === "email" ? "email" : "phone number"}`
      );
      return;
    }

    // Validate email
    if (otpMethod === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact)) {
        toast.error("Please enter a valid email address");
        return;
      }

      if (contact.includes("test") || contact.includes("example")) {
        toast.error("Please use a real email address (not test/example)");
        return;
      }
    }

    // Validate phone
    if (otpMethod === "sms") {
      const cleaned = contact.replace(/\D/g, "");
      if (cleaned.length !== 10) {
        toast.error("Please enter a valid 10-digit phone number");
        return;
      }
    }

    setLoading(true);
    try {
      console.log("📤 Sending OTP via", otpMethod, "to:", contact);

      const result = await sendOTPApi(otpMethod, contact);

      if (result.success) {
        toast.success(
          `OTP sent to your ${otpMethod === "email" ? "email" : "phone"}!`
        );
        setCountdown(60);
        setStep("otp");

        if (result.debug?.otp && process.env.NODE_ENV === "development") {
          console.log("🔐 TEST OTP:", result.debug.otp);
          toast.info(`Test OTP: ${result.debug.otp}`, { duration: 10000 });
        }
      } else {
        toast.error(result.error || "Failed to send OTP");
      }
    } catch (error: any) {
      console.error("❌ Send OTP error:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.details ||
        "Failed to send OTP";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
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
    try {
      console.log("🔐 Verifying OTP...");

      const result = await verifyOTPApi(contact, otp);

      if (result.success) {
        toast.success("OTP verified successfully!");

        // Apply theme after OTP login
        if (locationInfo?.theme) {
          console.log("🎨 Applying theme after OTP login:", locationInfo.theme);
          await checkLocationAndApplyTheme();
        }

        await handlegooglesignin();
      } else {
        toast.error(result.error || "Invalid OTP");
      }
    } catch (error: any) {
      console.error("❌ Verify OTP error:", error);
      const errorMsg = error.response?.data?.error || "Invalid OTP";
      toast.error(errorMsg);
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
      </Head>

      {/* Premium Background with Gradient */}
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-[#0f0f0f] dark:via-[#1a1a2e] dark:to-[#16213e] px-4 py-8">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/5 dark:bg-indigo-500/3 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-[480px] mx-auto relative z-10">
          {/* Premium YouTube Logo */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center gap-2 mb-8 group">
              {/* Iconic Red Play Button */}
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform">
                  <div className="w-0 h-0 border-l-[16px] md:border-l-[18px] border-l-white border-y-[10px] md:border-y-[11px] border-y-transparent ml-1"></div>
                </div>
              </div>
              
              {/* YouTube Text with Premium Styling */}
              <div className="flex flex-col">
                <span className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                  YouTube
                </span>
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Sign in to continue to YouTube
            </p>
          </div>

          {/* Premium Login Card with Glass Effect */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 p-8 md:p-12 shadow-2xl shadow-gray-900/10 dark:shadow-black/30">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-700 dark:text-red-400 text-center font-medium">
                {error}
              </div>
            )}

            {/* Step 1: Login Options */}
            {step === "login" && (
              <div className="space-y-6">
                {/* Premium Google Sign-In Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full relative group bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-700 hover:via-blue-800 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  {/* Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  
                  {loading ? (
                    <span className="flex items-center justify-center gap-3 relative z-10">
                      <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full" />
                      <span className="text-base">Signing in...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3 relative z-10">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-base">Continue with Google</span>
                    </span>
                  )}
                </button>

                {/* Premium Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 py-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-sm font-medium text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
                      or verify with OTP
                    </span>
                  </div>
                </div>

                {/* Premium Location Info Card */}
                {locationInfo && (
                  <div className="relative group bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-purple-950/30 rounded-2xl p-5 border border-indigo-200/50 dark:border-indigo-800/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl">{otpMethod === "email" ? "📧" : "📱"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                          {otpMethod === "email" ? "Email OTP" : "SMS OTP"} Verification
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 truncate">
                          <span>📍</span>
                          <span className="font-medium">{locationInfo.location.city}, {locationInfo.location.state}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Premium Contact Input */}
                <div className="space-y-3">
                  <div className="relative group">
                    <Input
                      type={otpMethod === "email" ? "email" : "tel"}
                      placeholder={otpMethod === "email" ? "Email address" : "Phone number"}
                      value={contact}
                      onChange={(e) => {
                        if (otpMethod === "sms") {
                          handlePhoneInput(e.target.value);
                        } else {
                          setContact(e.target.value);
                        }
                      }}
                      className="h-14 px-5 text-base border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                      maxLength={otpMethod === "sms" ? 10 : undefined}
                    />
                    {/* Input Icon */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      {otpMethod === "email" ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 px-1 flex items-center gap-1">
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
                  className="w-full h-13 text-base font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:shadow-none relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  {countdown > 0 ? (
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

                {/* Already Have OTP Link - Premium Style */}
                <button
                  onClick={() => setStep("otp")}
                  className="w-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                >
                  Already have OTP? Enter code →
                </button>
              </div>
            )}

            {/* Step 2: Premium OTP Verification */}
            {step === "otp" && (
              <div className="space-y-6">
                {/* Premium OTP Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl mb-6 shadow-2xl shadow-green-500/30 animate-pulse">
                    <span className="text-4xl">🔐</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Verify Your Identity
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Enter the 6-digit code sent to
                  </p>
                  <p className="font-semibold text-blue-600 dark:text-blue-400 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg inline-block break-all">
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
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtp(value);
                    }}
                    maxLength={6}
                    className="h-20 text-center text-4xl tracking-[0.8em] font-bold border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 transition-all shadow-inner"
                  />
                  {otp.length > 0 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className={`w-3 h-3 rounded-full ${otp.length === 6 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    </div>
                  )}
                </div>

                {/* Premium Verify Button */}
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full h-14 text-base font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 disabled:opacity-50 disabled:shadow-none relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  {loading ? (
                    <span className="relative z-10 flex items-center gap-3 justify-center">
                      <div className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full" />
                      <span>Verifying...</span>
                    </span>
                  ) : (
                    <span className="relative z-10 flex items-center gap-2 justify-center">
                      <span>Verify & Continue</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  )}
                </Button>

                {/* Premium Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep("login")}
                    className="flex-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 py-3 rounded-xl text-sm font-semibold transition-all border border-gray-300 dark:border-gray-600"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSendOTP}
                    disabled={loading || countdown > 0}
                    className="flex-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 py-3 rounded-xl text-sm font-semibold transition-all border border-blue-300 dark:border-blue-700 disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    {countdown > 0 ? `Resend (${countdown}s)` : "Resend Code"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Premium Footer Links */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm">
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              Help Center
            </a>
            <span className="text-gray-400">•</span>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              Privacy Policy
            </a>
            <span className="text-gray-400">•</span>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              Terms of Service
            </a>
          </div>

          {/* Premium Debug Info */}
          {process.env.NODE_ENV === "development" && locationInfo && (
            <div className="mt-8 p-5 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-2xl text-sm shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🧪</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-base">
                  Development Debug Info
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-gray-700 dark:text-gray-300">
                <div className="col-span-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Location</p>
                  <p className="font-semibold">{locationInfo.location.city}, {locationInfo.location.state}</p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Theme</p>
                  <p className="font-semibold capitalize">{locationInfo.theme}</p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">OTP Method</p>
                  <p className="font-semibold uppercase">{otpMethod}</p>
                </div>
                <div className="col-span-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Time (IST)</p>
                  <p className="font-semibold">{locationInfo.currentHour}:{String(locationInfo.currentMinute).padStart(2, "0")}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}