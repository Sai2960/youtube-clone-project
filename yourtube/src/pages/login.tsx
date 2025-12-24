// src/pages/login.tsx - COMPLETE MERGED VERSION
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
        <title>Sign In - YourTube</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                <Youtube className="w-8 h-8 text-white" fill="white" />
              </div>
              <span className="text-3xl font-bold text-white">YourTube</span>
            </div>
            <p className="text-gray-400 text-lg">Sign in to continue</p>
          </div>
          {/* Login Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Welcome Back
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
              Sign in to watch videos, upload content, and more
            </p>

            {/* Error Message from AuthContext */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm text-center">
                  {error}
                </p>
              </div>
            )}
            {/* Step 1: Login Options */}
            {step === "login" && (
              <div className="space-y-4">
                {/* Google Sign-In Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-gray-600 dark:border-white border-t-transparent rounded-full" />
                      Signing in...
                    </span>
                  ) : (
                    <>
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                      Or verify with OTP
                    </span>
                  </div>
                </div>

                {/* Location Info Card */}
                {locationInfo && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {otpMethod === "email" ? "📧" : "📱"}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {otpMethod === "email" ? "Email OTP" : "SMS OTP"}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          📍 {locationInfo.location.city},{" "}
                          {locationInfo.location.state}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          ⏰ {locationInfo.currentHour}:
                          {String(locationInfo.currentMinute).padStart(2, "0")}{" "}
                          IST
                          {locationInfo.isMorningTime &&
                            " (Morning - Light Theme)"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback OTP Method Display */}
                {!locationInfo && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-2xl">
                        {otpMethod === "email" ? "📧" : "📱"}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {otpMethod === "email" ? "Email OTP" : "SMS OTP"}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Based on your location
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Contact Input */}
                <div>
                  <Input
                    type={otpMethod === "email" ? "email" : "tel"}
                    placeholder={
                      otpMethod === "email"
                        ? "Enter your email (use real email)"
                        : "Enter 10-digit phone (e.g., 9876543210)"
                    }
                    value={contact}
                    onChange={(e) => {
                      if (otpMethod === "sms") {
                        handlePhoneInput(e.target.value);
                      } else {
                        setContact(e.target.value);
                      }
                    }}
                    className="h-12 text-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    maxLength={otpMethod === "sms" ? 10 : undefined}
                  />
                  {otpMethod === "sms" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                      💡 Enter 10 digits only (e.g., 9876543210)
                    </p>
                  )}
                  {otpMethod === "email" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                      ⚠️ Don't use test@example.com - use your real email
                    </p>
                  )}
                </div>
                {/* Send OTP Button */}
                <Button
                  onClick={handleSendOTP}
                  disabled={loading || countdown > 0}
                  className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Sending...
                    </span>
                  ) : (
                    "Send OTP"
                  )}
                </Button>

                {/* Already Have OTP Link */}
                <Button
                  onClick={() => setStep("otp")}
                  variant="ghost"
                  className="w-full dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Already have OTP? Click here
                </Button>

                {/* Features List */}
                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    By signing in, you can:
                  </p>
                  <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-green-600 dark:text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      Watch videos and shorts
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-green-600 dark:text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      Upload your own content
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-green-600 dark:text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      Like, comment, and subscribe
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-green-600 dark:text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      Create your own channel
                    </li>
                  </ul>
                </div>
              </div>
            )}
            {/* Step 2: OTP Verification */}
            {step === "otp" && (
              <div className="space-y-4">
                {/* OTP Header */}
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🔐</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Enter OTP
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    We sent a 6-digit code to
                  </p>
                  <p className="font-medium text-blue-600 dark:text-blue-400 mt-1">
                    {contact || "your contact"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Check server console for OTP in development mode
                  </p>
                </div>

                {/* OTP Input */}
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                  }}
                  maxLength={6}
                  className="h-14 text-center text-2xl tracking-widest font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />

                {/* Verify OTP Button */}
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 text-lg font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>

                {/* Back and Resend Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setStep("login")}
                    variant="outline"
                    className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSendOTP}
                    disabled={loading || countdown > 0}
                    variant="outline"
                    className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {countdown > 0 ? `Resend (${countdown}s)` : "Resend OTP"}
                  </Button>
                </div>
              </div>
            )}
            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                By continuing, you agree to our{" "}
                <a
                  href="#"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === "development" && locationInfo && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
              <p className="font-bold mb-2 text-gray-900 dark:text-white">
                🧪 Debug Info:
              </p>
              <div className="space-y-1 text-gray-700 dark:text-gray-300">
                <p>🌐 API URL: {API_URL}</p>
                <p>📍 State: {locationInfo.location.state}</p>
                <p>🏙️ City: {locationInfo.location.city}</p>
                <p>🎨 Theme: {locationInfo.theme}</p>
                <p>📧 OTP Method: {otpMethod}</p>
                <p>
                  ⏰ Time: {locationInfo.currentHour}:
                  {String(locationInfo.currentMinute).padStart(2, "0")} IST
                </p>
                <p>
                  🌅 Morning (10-12):{" "}
                  {locationInfo.isMorningTime ? "Yes" : "No"}
                </p>
                <p>
                  🌴 South India: {locationInfo.isSouthIndia ? "Yes" : "No"}
                </p>
                <p>📞 Contact: {contact || "Not set"}</p>
                <p>🔢 Step: {step}</p>
                <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                  Check server console for OTP code
                </p>
              </div>
            </div>
          )}

          {/* Basic Debug Info when locationInfo not loaded */}
          {process.env.NODE_ENV === "development" && !locationInfo && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
              <p className="font-bold mb-2 text-gray-900 dark:text-white">
                🧪 Debug Info:
              </p>
              <div className="space-y-1 text-gray-700 dark:text-gray-300">
                <p>🌐 API URL: {API_URL}</p>
                <p>📧 OTP Method: {otpMethod}</p>
                <p>📞 Contact: {contact || "Not set"}</p>
                <p>🔢 Step: {step}</p>
                <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                  Location info loading... Check console for logs
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
