// server/utils/locationDetector.js
import geoip from "geoip-lite";
import axios from "axios";

const SOUTH_INDIAN_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  "TN",
  "KL",
  "KA",
  "AP",
  "TS",
  "TG",
];

/**
 * 🌍 MULTI-METHOD LOCATION DETECTOR
 * Tries multiple methods to get accurate location
 */
export const detectLocation = async (req) => {
  try {
    // 1️⃣ Get IP Address (try multiple sources)
    let ip = getClientIP(req);

    console.log("🔍 Detecting location for IP:", ip);

    // 2️⃣ Try Local GeoIP Database First (Fastest)
    let locationData = detectViaGeoIP(ip);

    // 3️⃣ If localhost or GeoIP fails, try external APIs
    if (!locationData || ip === "127.0.0.1" || ip.startsWith("192.168")) {
      console.log("🌐 Localhost or GeoIP failed, trying external API...");
      locationData = await detectViaExternalAPI(ip);
    }

    // 4️⃣ Fallback to default
    if (!locationData) {
      console.log("⚠️ All methods failed, using default location");
      locationData = getDefaultLocation();
    }

    console.log("✅ Final detected location:", locationData);
    return locationData;
  } catch (error) {
    console.error("❌ Location detection error:", error);
    return getDefaultLocation();
  }
};

/**
 * 🔍 Extract Client IP from Request
 */
const getClientIP = (req) => {
  // Try multiple headers for IP detection
  let ip =
    req.headers["cf-connecting-ip"] || // Cloudflare
    req.headers["x-real-ip"] || // Nginx
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || // Proxy
    req.connection?.remoteAddress || // Direct connection
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1";

  // Clean IPv6 prefix
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");

  return ip;
};

/**
 * 📍 Method 1: GeoIP-Lite (Local Database)
 */
const detectViaGeoIP = (ip) => {
  try {
    // Skip for localhost
    if (ip === "127.0.0.1" || ip.startsWith("192.168") || ip === "::1") {
      return null;
    }

    const geo = geoip.lookup(ip);

    if (geo && geo.country === "IN") {
      console.log("✅ GeoIP Lookup Success:", geo);

      return {
        ip,
        state: geo.region || "Unknown",
        city: geo.city || "Unknown",
        country: geo.country,
        timezone: geo.timezone || "Asia/Kolkata",
        latitude: geo.ll?.[0] || null,
        longitude: geo.ll?.[1] || null,
        method: "geoip-lite",
      };
    }

    return null;
  } catch (error) {
    console.error("❌ GeoIP lookup error:", error);
    return null;
  }
};

/**
 * 🌐 Method 2: External IP-API Service (Free)
 */
const detectViaExternalAPI = async (ip) => {
  try {
    // Use configurable API endpoint
    const apiUrl = process.env.IP_API_URL || "http://ip-api.com/json";

    const response = await axios.get(`${apiUrl}/${ip}`, {
      timeout: parseInt(process.env.IP_API_TIMEOUT || "5000"),
      params: {
        fields:
          "status,country,countryCode,region,regionName,city,timezone,lat,lon,query",
      },
    });

    const data = response.data;

    if (data.status === "success" && data.countryCode === "IN") {
      console.log("✅ IP-API Success:", data);

      return {
        ip: data.query,
        state: data.regionName || data.region,
        city: data.city,
        country: data.countryCode,
        timezone: data.timezone || "Asia/Kolkata",
        latitude: data.lat,
        longitude: data.lon,
        method: "ip-api",
      };
    }

    return null;
  } catch (error) {
    console.error("❌ External API error:", error.message);
    return null;
  }
};

/**
 * 🏠 Default Location (Configurable)
 */
const getDefaultLocation = () => {
  console.log("⚠️ Using default location");

  // ✅ CRITICAL: Check TEST_GEO_STATE for development testing
  const testState = process.env.TEST_GEO_STATE;
  const defaultState = testState || process.env.DEFAULT_STATE || "Maharashtra";

  console.log("🧪 Test state from env:", testState);
  console.log("📍 Using state:", defaultState);

  return {
    ip: "127.0.0.1",
    state: defaultState,
    city: process.env.DEFAULT_CITY || "Mumbai",
    country: process.env.DEFAULT_COUNTRY || "IN",
    timezone: process.env.DEFAULT_TIMEZONE || "Asia/Kolkata",
    latitude: parseFloat(process.env.DEFAULT_LATITUDE || "19.0760"),
    longitude: parseFloat(process.env.DEFAULT_LONGITUDE || "72.8777"),
    method: testState ? "test-env" : "default",
  };
};

/**
 * ✅ Check if location is in South India
 */
export const isSouthIndianState = (state) => {
  if (!state) return false;

  return SOUTH_INDIAN_STATES.some(
    (s) =>
      state.toLowerCase().includes(s.toLowerCase()) ||
      s.toLowerCase().includes(state.toLowerCase())
  );
};

/**
 * 🎨 Determine Theme based on location and time
 */
export const determineTheme = (state) => {
  const isSouth = isSouthIndianState(state);
  const currentHour = new Date().getHours();
  const morningStart = parseInt(process.env.LIGHT_THEME_START_HOUR || "10");
  const morningEnd = parseInt(process.env.LIGHT_THEME_END_HOUR || "12");
  const isMorningTime = currentHour >= morningStart && currentHour < morningEnd;

  // Light theme ONLY for South India during morning hours
  if (isSouth && isMorningTime) {
    return "light";
  }

  return "dark";
};

/**
 * 📱 Determine OTP Method based on location
 */
export const determineOtpMethod = (state) => {
  const isSouth = isSouthIndianState(state);

  // Email OTP for South India, SMS for others
  return isSouth ? "email" : "sms";
};
