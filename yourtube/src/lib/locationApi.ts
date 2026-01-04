// youtube/src/lib/locationApi.ts - FIXED VERSION
import axios from "axios";
import { applyTheme } from "./theme";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://youtube-clone-project-production.up.railway.app";

export interface LocationData {
  success: boolean;
  location: {
    state: string;
    city: string;
    country: string;
    timezone: string;
    ip: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  theme: "light" | "dark";
  otpMethod: "email" | "sms";
  isSouthIndia: boolean;
  currentHour: number;
  currentMinute: number;
  isMorningTime: boolean;
  detectionMethod: string;
  timestamp: string;
}

/**
 * 🌍 Fetch location and automatically apply theme
 */
export async function checkLocationAndApplyTheme(): Promise<LocationData | null> {
  try {
    console.log("🌍 Checking location and theme...");

    const response = await axios.get<LocationData>(
      `${API_URL}/api/location/check-location`
    );

    const data = response.data;

    console.log("✅ Location data received:", {
      state: data.location.state,
      city: data.location.city,
      theme: data.theme,
      otpMethod: data.otpMethod,
      currentTime: `${data.currentHour}:${data.currentMinute}`,
      isMorningTime: data.isMorningTime,
      isSouthIndia: data.isSouthIndia,
    });

    console.log("🎨 Applying location-based theme:", data.theme);
    applyTheme(data.theme);

    return data;
  } catch (error) {
    console.error("❌ Location check failed:", error);
    console.log("⚠️ Using fallback dark theme");
    applyTheme("dark");
    return null;
  }
}

/**
 * 📧 Send OTP - FIXED VERSION
 */
export async function sendOTP(
  method: "email" | "sms",
  contact: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  debug?: any;
}> {
  try {
    console.log("═══════════════════════════════════════");
    console.log("📤 SEND OTP - LOCATIONAPI.TS");
    console.log("   Method:", method);
    console.log("   Contact:", contact);
    console.log("   API URL:", API_URL);
    console.log("═══════════════════════════════════════");

    const endpoint =
      method === "email"
        ? `${API_URL}/api/otp/send-email-otp`
        : `${API_URL}/api/otp/send-sms-otp`;

    const payload =
      method === "email" ? { email: contact } : { phoneNumber: contact };

    console.log("📡 Making request to:", endpoint);
    console.log("📦 Payload:", payload);

    const response = await axios.post(endpoint, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    console.log("═══════════════════════════════════════");
    console.log("✅ OTP RESPONSE RECEIVED");
    console.log("   Status:", response.status);
    console.log("   Data:", response.data);
    console.log("═══════════════════════════════════════");

    return response.data;
  } catch (error: any) {
    console.log("═══════════════════════════════════════");
    console.error("❌ SEND OTP ERROR - LOCATIONAPI.TS");
    console.error("   Error Message:", error.message);
    console.error("   Response Status:", error.response?.status);
    console.error("   Response Data:", error.response?.data);
    console.error("   Full Error:", error);
    console.log("═══════════════════════════════════════");

    return {
      success: false,
      error:
        error.response?.data?.error || error.message || "Failed to send OTP",
    };
  }
}

/**
 * 🔐 Verify OTP - FIXED VERSION
 */
export async function verifyOTP(
  contact: string,
  otp: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log("═══════════════════════════════════════");
    console.log("🔐 VERIFY OTP - LOCATIONAPI.TS");
    console.log("   Contact:", contact);
    console.log("   OTP:", otp.substring(0, 2) + "****");
    console.log("═══════════════════════════════════════");

    const response = await axios.post(
      `${API_URL}/api/otp/verify-otp`,
      {
        contact,
        otp,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("═══════════════════════════════════════");
    console.log("✅ VERIFY OTP RESPONSE");
    console.log("   Status:", response.status);
    console.log("   Data:", response.data);
    console.log("═══════════════════════════════════════");

    return response.data;
  } catch (error: any) {
    console.log("═══════════════════════════════════════");
    console.error("❌ VERIFY OTP ERROR - LOCATIONAPI.TS");
    console.error("   Error Message:", error.message);
    console.error("   Response Status:", error.response?.status);
    console.error("   Response Data:", error.response?.data);
    console.log("═══════════════════════════════════════");

    return {
      success: false,
      error:
        error.response?.data?.error ||
        error.message ||
        "OTP verification failed",
    };
  }
}

/**
 * 🧪 Test all location endpoints (for debugging)
 */
export async function testLocationEndpoints() {
  console.log("🧪 Testing location endpoints...\n");

  try {
    console.log("Test 1: Current location");
    const location = await axios.get(`${API_URL}/api/location/check-location`);
    console.log("✅ Result:", location.data);

    console.log("\nTest 2: Tamil Nadu at 11 AM");
    const tamilNadu = await axios.get(
      `${API_URL}/api/location/test-theme?state=Tamil Nadu&hour=11`
    );
    console.log("✅ Result:", tamilNadu.data);

    console.log("\nTest 3: Maharashtra at 11 AM");
    const maharashtra = await axios.get(
      `${API_URL}/api/location/test-theme?state=Maharashtra&hour=11`
    );
    console.log("✅ Result:", maharashtra.data);

    console.log("\nTest 4: Kerala at 3 PM (afternoon)");
    const kerala = await axios.get(
      `${API_URL}/api/location/test-theme?state=Kerala&hour=15`
    );
    console.log("✅ Result:", kerala.data);

    console.log("\n✅ All tests passed!");

    return true;
  } catch (error) {
    console.error("❌ Test failed:", error);
    return false;
  }
}

// Export for use in browser console
if (typeof window !== "undefined") {
  (window as any).testLocationEndpoints = testLocationEndpoints;
  (window as any).checkLocationAndApplyTheme = checkLocationAndApplyTheme;
}
