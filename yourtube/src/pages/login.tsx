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

      {/* Premium Background with Animated Gradient Mesh */}
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-[#0a0a0a] dark:via-[#0f0f23] dark:to-[#1a1a2e]">
        
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large Gradient Orb 1 */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/30 via-purple-400/20 to-pink-400/10 dark:from-blue-600/20 dark:via-purple-600/15 dark:to-pink-600/10 rounded-full blur-3xl animate-float-slow"></div>
          
          {/* Large Gradient Orb 2 */}
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tl from-indigo-400/30 via-blue-400/20 to-cyan-400/10 dark:from-indigo-600/20 dark:via-blue-600/15 dark:to-cyan-600/10 rounded-full blur-3xl animate-float-slower"></div>
          
          {/* Medium Orb 3 */}
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-br from-purple-400/20 via-pink-400/15 to-red-400/10 dark:from-purple-600/15 dark:via-pink-600/10 dark:to-red-600/8 rounded-full blur-3xl animate-float"></div>
          
          {/* Medium Orb 4 */}
          <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-gradient-to-tr from-cyan-400/20 via-teal-400/15 to-emerald-400/10 dark:from-cyan-600/15 dark:via-teal-600/10 dark:to-emerald-600/8 rounded-full blur-3xl animate-float-slow"></div>
          
          {/* Small Accent Orbs */}
          <div className="absolute top-20 right-1/3 w-48 h-48 bg-gradient-to-br from-yellow-400/15 to-orange-400/10 dark:from-yellow-600/10 dark:to-orange-600/8 rounded-full blur-2xl animate-pulse-slow"></div>
          <div className="absolute bottom-32 left-1/3 w-56 h-56 bg-gradient-to-tl from-rose-400/15 to-pink-400/10 dark:from-rose-600/10 dark:to-pink-600/8 rounded-full blur-2xl animate-pulse-slower"></div>
        </div>

        {/* Subtle Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40 dark:opacity-20"></div>

        {/* Content Container */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 pb-safe sm:py-12">
          <div className="w-full max-w-[440px] lg:max-w-[480px] pb-8 sm:pb-0">
            
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
            <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl border border-gray-200/60 dark:border-gray-700/60 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-gray-900/10 dark:shadow-black/40">
              
              {/* Subtle Inner Glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 via-transparent to-transparent dark:from-white/5 pointer-events-none"></div>
              
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
                          <span className="text-sm sm:text-base">Signing in...</span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-3 relative z-10">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
                            <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="text-sm sm:text-base">Continue with Google</span>
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
                      <div className="relative group bg-gradient-to-br from-indigo-50/80 via-blue-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:via-blue-950/40 dark:to-purple-950/40 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-indigo-200/60 dark:border-indigo-800/60 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                        {/* Animated Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                          <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-xl sm:text-2xl">{otpMethod === "email" ? "📧" : "📱"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base mb-0.5 sm:mb-1">
                              {otpMethod === "email" ? "Email OTP" : "SMS OTP"} Verification
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 truncate">
                              <span>📍</span>
                              <span className="font-medium">{locationInfo.location.city}, {locationInfo.location.state}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Premium Contact Input */}
                    <div className="space-y-2 sm:space-y-3">
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
                          className="h-12 sm:h-14 px-4 sm:px-5 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 pr-12"
                          maxLength={otpMethod === "sms" ? 10 : undefined}
                        />
                        {/* Input Icon */}
                        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
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
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                          const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setOtp(value);
                        }}
                        maxLength={6}
                        className="h-16 sm:h-20 text-center text-2xl sm:text-4xl tracking-[0.5em] sm:tracking-[0.8em] font-bold border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 transition-all shadow-inner backdrop-blur-sm"
                      />
                      {otp.length > 0 && (
                        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${otp.length === 6 ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-400'}`}></div>
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
                        className="flex-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 backdrop-blur-sm py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all border border-gray-300 dark:border-gray-600 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleSendOTP}
                        disabled={loading || countdown > 0}
                        className="flex-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/30 backdrop-blur-sm py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all border border-blue-300 dark:border-blue-700 disabled:opacity-50 disabled:hover:bg-transparent transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {countdown > 0 ? `Resend (${countdown}s)` : "Resend Code"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Footer Links */}
            <div className="mt-8 sm:mt-10 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors">
                Help Center
              </a>
              <span className="text-gray-400">•</span>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors">
                Privacy Policy
              </a>
              <span className="text-gray-400">•</span>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors">
                Terms of Service
              </a>
            </div>

            {/* Premium Debug Info */}
            {process.env.NODE_ENV === "development" && locationInfo && (
              <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-gradient-to-br from-amber-50/90 via-yellow-50/90 to-orange-50/90 dark:from-amber-950/50 dark:via-yellow-950/50 dark:to-orange-950/50 backdrop-blur-sm border-2 border-amber-200 dark:border-amber-800 rounded-2xl text-xs sm:text-sm shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm sm:text-base">🧪</span>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                    Development Debug Info
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-gray-700 dark:text-gray-300">
                  <div className="col-span-2 p-2.5 sm:p-3 bg-white/60 dark:bg-black/30 backdrop-blur-sm rounded-xl">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Location</p>
                    <p className="font-bold text-sm">{locationInfo.location.city}, {locationInfo.location.state}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white/60 dark:bg-black/30 backdrop-blur-sm rounded-xl">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Theme</p>
                    <p className="font-bold text-sm capitalize">{locationInfo.theme}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white/60 dark:bg-black/30 backdrop-blur-sm rounded-xl">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">OTP Method</p>
                    <p className="font-bold text-sm uppercase">{otpMethod}</p>
                  </div>
                  <div className="col-span-2 p-2.5 sm:p-3 bg-white/60 dark:bg-black/30 backdrop-blur-sm rounded-xl">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Time (IST)</p>
                    <p className="font-bold text-sm">{locationInfo.currentHour}:{String(locationInfo.currentMinute).padStart(2, "0")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Ensure full height on mobile devices */
        @supports (-webkit-touch-callout: none) {
          /* iOS specific */
          .min-h-screen {
            min-height: -webkit-fill-available;
          }
        }

        @supports (height: 100dvh) {
          .min-h-\\[100dvh\\] {
            min-height: 100dvh;
          }
        }

        /* Safe area padding for devices with notches/home indicators */
        .pb-safe {
          padding-bottom: max(2rem, env(safe-area-inset-bottom));
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 40px) scale(1.05); }
        }
        
        @keyframes float-slower {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, -50px) scale(1.08); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }

        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 25s ease-in-out infinite;
        }
        
        .animate-float-slower {
          animation: float-slower 30s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        
        .animate-pulse-slower {
          animation: pulse-slower 10s ease-in-out infinite;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}