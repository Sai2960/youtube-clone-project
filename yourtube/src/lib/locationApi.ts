// youtube/src/lib/locationApi.ts
import axios from 'axios';
import { applyTheme } from './theme';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
  theme: 'light' | 'dark';
  otpMethod: 'email' | 'sms';
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
    console.log('🌍 Checking location and theme...');
    
    const response = await axios.get<LocationData>(
      `${API_URL}/api/location/check-location`
    );
    
    const data = response.data;
    
    console.log('✅ Location data received:', {
      state: data.location.state,
      city: data.location.city,
      theme: data.theme,
      otpMethod: data.otpMethod,
      currentTime: `${data.currentHour}:${data.currentMinute}`,
      isMorningTime: data.isMorningTime,
      isSouthIndia: data.isSouthIndia
    });
    
    // ✅ Apply theme immediately
    console.log('🎨 Applying location-based theme:', data.theme);
    applyTheme(data.theme);
    
    return data;
    
  } catch (error) {
    console.error('❌ Location check failed:', error);
    
    // Fallback to dark theme
    console.log('⚠️ Using fallback dark theme');
    applyTheme('dark');
    
    return null;
  }
}

/**
 * 📧 Send OTP based on detected method
 */
export async function sendOTP(
  method: 'email' | 'sms', 
  contact: string
): Promise<{ success: boolean; message?: string; error?: string; debug?: any }> {
  try {
    const endpoint = method === 'email' 
      ? '/api/otp/send-email-otp' 
      : '/api/otp/send-sms-otp';
    
    const payload = method === 'email' 
      ? { email: contact } 
      : { phoneNumber: contact };
    
    console.log('📤 Sending OTP:', { endpoint, method, contact });
    
    const response = await axios.post(`${API_URL}${endpoint}`, payload);
    
    console.log('✅ OTP sent successfully');
    
    return response.data;
    
  } catch (error: any) {
    console.error('❌ Send OTP failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 🔐 Verify OTP
 */
export async function verifyOTP(
  contact: string, 
  otp: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log('🔐 Verifying OTP:', { contact, otp: otp.substring(0, 2) + '****' });
    
    const response = await axios.post(`${API_URL}/api/otp/verify-otp`, {
      contact,
      otp
    });
    
    console.log('✅ OTP verified successfully');
    
    return response.data;
    
  } catch (error: any) {
    console.error('❌ OTP verification failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 🧪 Test all location endpoints (for debugging)
 */
export async function testLocationEndpoints() {
  console.log('🧪 Testing location endpoints...\n');
  
  try {
    // Test 1: Check location
    console.log('Test 1: Current location');
    const location = await axios.get(`${API_URL}/api/location/check-location`);
    console.log('✅ Result:', location.data);
    
    // Test 2: Tamil Nadu at 11 AM
    console.log('\nTest 2: Tamil Nadu at 11 AM');
    const tamilNadu = await axios.get(
      `${API_URL}/api/location/test-theme?state=Tamil Nadu&hour=11`
    );
    console.log('✅ Result:', tamilNadu.data);
    
    // Test 3: Maharashtra at 11 AM
    console.log('\nTest 3: Maharashtra at 11 AM');
    const maharashtra = await axios.get(
      `${API_URL}/api/location/test-theme?state=Maharashtra&hour=11`
    );
    console.log('✅ Result:', maharashtra.data);
    
    // Test 4: Kerala at 3 PM
    console.log('\nTest 4: Kerala at 3 PM (afternoon)');
    const kerala = await axios.get(
      `${API_URL}/api/location/test-theme?state=Kerala&hour=15`
    );
    console.log('✅ Result:', kerala.data);
    
    console.log('\n✅ All tests passed!');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testLocationEndpoints = testLocationEndpoints;
  (window as any).checkLocationAndApplyTheme = checkLocationAndApplyTheme;
}