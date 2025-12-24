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

      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0f0f0f] px-4 py-8">
        <div className="w-full max-w-[450px]">
          {/* YouTube Logo - Authentic Style */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1 mb-6">
              <svg className="w-[90px] h-[62px] md:w-[100px] md:h-[70px]" viewBox="0 0 90 20" fill="none">
                <g>
                  {/* Red Play Button */}
                  <path
                    d="M8.5 0C3.80558 0 0 3.80558 0 8.5C0 13.1944 3.80558 17 8.5 17C13.1944 17 17 13.1944 17 8.5C17 3.80558 13.1944 0 8.5 0Z"
                    fill="#FF0000"
                  />
                  <path
                    d="M7 5.5L7 11.5L12 8.5L7 5.5Z"
                    fill="white"
                  />
                  {/* YouTube Text */}
                  <path
                    d="M27.9727 2.90039L24.9297 12.0273L21.8867 2.90039H18.9297L23.4297 16.0004H26.4297L30.9297 2.90039H27.9727Z"
                    fill="currentColor"
                    className="text-black dark:text-white"
                  />
                  <path
                    d="M39.5 7.40039C39.5 5.30039 37.8 3.60039 35.7 3.60039C33.6 3.60039 31.9 5.30039 31.9 7.40039V11.6004C31.9 13.7004 33.6 15.4004 35.7 15.4004C37.8 15.4004 39.5 13.7004 39.5 11.6004V7.40039ZM36.5 11.4004C36.5 12.0004 36.1 12.4004 35.7 12.4004C35.3 12.4004 34.9 12.0004 34.9 11.4004V7.60039C34.9 7.00039 35.3 6.60039 35.7 6.60039C36.1 6.60039 36.5 7.00039 36.5 7.60039V11.4004Z"
                    fill="currentColor"
                    className="text-black dark:text-white"
                  />
                  <path
                    d="M51.5 3.90039H48.5V10.9004C48.5 11.5004 48.1 11.9004 47.7 11.9004C47.3 11.9004 46.9 11.5004 46.9 10.9004V3.90039H43.9V11.1004C43.9 13.2004 45.6 14.9004 47.7 14.9004C49.8 14.9004 51.5 13.2004 51.5 11.1004V3.90039Z"
                    fill="currentColor"
                    className="text-black dark:text-white"
                  />
                  <path
                    d="M61.5 3.90039H54.5V15.4004H57.5V11.4004H61.5V8.40039H57.5V6.90039H61.5V3.90039Z"
                    fill="currentColor"
                    className="text-black dark:text-white"
                  />
                  <path
                    d="M69.5 3.90039H66.5V10.9004C66.5 11.5004 66.1 11.9004 65.7 11.9004C65.3 11.9004 64.9 11.5004 64.9 10.9004V3.90039H61.9V11.1004C61.9 13.2004 63.6 14.9004 65.7 14.9004C67.8 14.9004 69.5 13.2004 69.5 11.1004V3.90039Z"
                    fill="currentColor"
                    className="text-black dark:text-white"
                  />
                  <path
                    d="M79.5 7.40039C79.5 5.30039 77.8 3.60039 75.7 3.60039H71.5V15.4004H74.5V11.4004H75.7C77.8 11.4004 79.5 9.70039 79.5 7.60039V7.40039ZM76.5 7.60039C76.5 8.20039 76.1 8.60039 75.7 8.60039H74.5V6.60039H75.7C76.1 6.60039 76.5 7.00039 76.5 7.60039Z"
                    fill="currentColor"
                    className="text-black dark:text-white"
                  />
                  <path
                    d="M87.5 10.4004H84.5V8.40039H87.5V5.40039H84.5V3.90039H87.5V0.900391H81.5V15.4004H87.5V12.4004V10.4004Z"
                    fill="currentColor"
                    className="text-black dark:text-white"
                  />
                </g>
              </svg>
            </div>
            <h1 className="text-2xl font-normal text-[#030303] dark:text-[#f1f1f1] mb-2">
              Sign in
            </h1>
            <p className="text-[15px] text-[#5f6368] dark:text-[#aaa]">
              to continue to YouTube
            </p>
          </div>

          {/* Login Card - Clean Material Design */}
          <div className="bg-white dark:bg-[#282828] rounded-lg border border-[#dadce0] dark:border-[#3e3e3e] p-10 shadow-sm">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-[#fce8e6] dark:bg-[#5f2120] border border-[#f5c6cb] dark:border-[#9c4543] rounded text-sm text-[#d93025] dark:text-[#f28b82] text-center">
                {error}
              </div>
            )}

            {/* Step 1: Login Options */}
            {step === "login" && (
              <div className="space-y-6">
                {/* Google Sign-In Button - Material Design */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-[#1a73e8] hover:bg-[#1765cc] active:bg-[#1557b0] text-white font-medium py-3 px-6 rounded transition-all duration-150 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1a73e8]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                      Continue with Google
                    </span>
                  )}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#dadce0] dark:border-[#3e3e3e]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white dark:bg-[#282828] text-[#5f6368] dark:text-[#aaa]">
                      or
                    </span>
                  </div>
                </div>

                {/* Location Info - Subtle Card */}
                {locationInfo && (
                  <div className="bg-[#f8f9fa] dark:bg-[#3e3e3e] rounded-lg p-4 border border-[#e8eaed] dark:border-[#5e5e5e]">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {otpMethod === "email" ? "📧" : "📱"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#202124] dark:text-[#e8eaed] text-sm">
                          {otpMethod === "email" ? "Email OTP" : "SMS OTP"} Verification
                        </p>
                        <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1 truncate">
                          📍 {locationInfo.location.city}, {locationInfo.location.state}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Input */}
                <div className="space-y-2">
                  <Input
                    type={otpMethod === "email" ? "email" : "tel"}
                    placeholder={
                      otpMethod === "email"
                        ? "Email address"
                        : "Phone number"
                    }
                    value={contact}
                    onChange={(e) => {
                      if (otpMethod === "sms") {
                        handlePhoneInput(e.target.value);
                      } else {
                        setContact(e.target.value);
                      }
                    }}
                    className="h-14 px-4 text-base border-[#dadce0] dark:border-[#5e5e5e] rounded bg-white dark:bg-[#3e3e3e] text-[#202124] dark:text-[#e8eaed] focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-2 focus:ring-[#1a73e8]/20 dark:focus:ring-[#8ab4f8]/20"
                    maxLength={otpMethod === "sms" ? 10 : undefined}
                  />
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] px-1">
                    {otpMethod === "sms"
                      ? "Enter 10-digit number without country code"
                      : "Use your active email address"}
                  </p>
                </div>

                {/* Send OTP Button */}
                <Button
                  onClick={handleSendOTP}
                  disabled={loading || countdown > 0}
                  className="w-full h-11 text-[15px] font-medium bg-[#1a73e8] hover:bg-[#1765cc] text-white rounded transition-all disabled:opacity-50 disabled:hover:bg-[#1a73e8]"
                >
                  {countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Sending...
                    </span>
                  ) : (
                    "Send OTP"
                  )}
                </Button>

                {/* Already Have OTP Link */}
                <button
                  onClick={() => setStep("otp")}
                  className="w-full text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#f8f9fa] dark:hover:bg-[#3e3e3e] py-2 rounded text-sm font-medium transition-colors"
                >
                  Already have OTP?
                </button>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === "otp" && (
              <div className="space-y-6">
                {/* OTP Header */}
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🔐</div>
                  <h2 className="text-xl font-normal text-[#202124] dark:text-[#e8eaed] mb-2">
                    Verify it's you
                  </h2>
                  <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
                    Enter the code sent to
                  </p>
                  <p className="font-medium text-[#202124] dark:text-[#e8eaed] mt-1 break-all">
                    {contact}
                  </p>
                </div>

                {/* OTP Input */}
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                  }}
                  maxLength={6}
                  className="h-16 text-center text-3xl tracking-[0.5em] font-mono border-[#dadce0] dark:border-[#5e5e5e] rounded bg-white dark:bg-[#3e3e3e] text-[#202124] dark:text-[#e8eaed] focus:border-[#1a73e8] dark:focus:border-[#8ab4f8]"
                />

                {/* Verify Button */}
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full h-11 text-[15px] font-medium bg-[#1a73e8] hover:bg-[#1765cc] text-white rounded transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify"
                  )}
                </Button>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("login")}
                    className="flex-1 text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#f8f9fa] dark:hover:bg-[#3e3e3e] py-2 rounded text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSendOTP}
                    disabled={loading || countdown > 0}
                    className="flex-1 text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#f8f9fa] dark:hover:bg-[#3e3e3e] py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    {countdown > 0 ? `Resend (${countdown}s)` : "Resend code"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
            <a href="#" className="hover:text-[#202124] dark:hover:text-[#e8eaed]">
              Help
            </a>
            <a href="#" className="hover:text-[#202124] dark:hover:text-[#e8eaed]">
              Privacy
            </a>
            <a href="#" className="hover:text-[#202124] dark:hover:text-[#e8eaed]">
              Terms
            </a>
          </div>

          {/* Debug Info */}
          {process.env.NODE_ENV === "development" && locationInfo && (
            <div className="mt-6 p-4 bg-[#fff4e5] dark:bg-[#3e2723] border border-[#ffd180] dark:border-[#5d4037] rounded-lg text-xs">
              <p className="font-bold mb-2 text-[#202124] dark:text-[#e8eaed]">
                🧪 Debug Info
              </p>
              <div className="space-y-1 text-[#5f6368] dark:text-[#9aa0a6] font-mono">
                <p>Location: {locationInfo.location.city}, {locationInfo.location.state}</p>
                <p>Theme: {locationInfo.theme}</p>
                <p>OTP: {otpMethod}</p>
                <p>Time: {locationInfo.currentHour}:{String(locationInfo.currentMinute).padStart(2, "0")} IST</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}