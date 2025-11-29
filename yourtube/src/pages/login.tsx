// youtube/src/pages/login.tsx - COMPLETE MERGED VERSION WITH ALL FEATURES

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ✅ Import both locationApi functions AND axios for fallback
import { 
  checkLocationAndApplyTheme, 
  sendOTP as sendOTPApi, 
  verifyOTP as verifyOTPApi 
} from '@/lib/locationApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://${"https://youtube-clone-project-q3pd.onrender.com"

}';

export default function LoginPage() {
  const router = useRouter();
  const { user, handlegooglesignin } = useUser();
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [otpMethod, setOtpMethod] = useState<'email' | 'sms'>('email');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [locationInfo, setLocationInfo] = useState<any>(null);

  // ✅ Redirect if logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // ✅ Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ✅ Check location on mount - USES locationApi
  useEffect(() => {
    checkLocation();
  }, []);

  const checkLocation = async () => {
    try {
      console.log('🌍 Checking location and theme...');
      const data = await checkLocationAndApplyTheme();
      
      if (data) {
        setOtpMethod(data.otpMethod);
        setLocationInfo(data);
        
        console.log('✅ Location detected:', {
          state: data.location.state,
          city: data.location.city,
          theme: data.theme,
          otpMethod: data.otpMethod,
          time: `${data.currentHour}:${String(data.currentMinute).padStart(2, '0')}`,
          isMorningTime: data.isMorningTime
        });
      }
    } catch (error) {
      console.error('❌ Location check failed:', error);
      // Fallback to email if location check fails
      console.log('⚠️ Falling back to email OTP');
      setOtpMethod('email');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await handlegooglesignin();
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!contact.trim()) {
      toast.error(`Please enter your ${otpMethod === 'email' ? 'email' : 'phone number'}`);
      return;
    }

    // ✅ Validate email
    if (otpMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact)) {
        toast.error('Please enter a valid email address');
        return;
      }
      
      // Don't allow test/example emails
      if (contact.includes('test') || contact.includes('example')) {
        toast.error('Please use a real email address (not test/example)');
        return;
      }
    }

    // ✅ Validate phone
    if (otpMethod === 'sms') {
      const cleaned = contact.replace(/\D/g, '');
      if (cleaned.length !== 10) {
        toast.error('Please enter a valid 10-digit phone number');
        return;
      }
    }

    setLoading(true);
    try {
      console.log('📤 Sending OTP via', otpMethod, 'to:', contact);
      
      // ✅ Use locationApi function
      const result = await sendOTPApi(otpMethod, contact);
      
      if (result.success) {
        toast.success(`OTP sent to your ${otpMethod === 'email' ? 'email' : 'phone'}!`);
        setCountdown(60);
        setStep('otp'); // ✅ Auto-advance to OTP step
        
        // Show test OTP in development
        if (result.debug?.otp && process.env.NODE_ENV === 'development') {
          console.log('🔐 TEST OTP:', result.debug.otp);
          toast.info(`Test OTP: ${result.debug.otp}`, { duration: 10000 });
        }
      } else {
        toast.error(result.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('❌ Send OTP error:', error);
      const errorMsg = error.response?.data?.error || 
                       error.response?.data?.details || 
                       'Failed to send OTP';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      toast.error('Please enter OTP');
      return;
    }

    if (otp.length !== 6) {
      toast.error('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Verifying OTP...');
      
      // ✅ Use locationApi function
      const result = await verifyOTPApi(contact, otp);
      
      if (result.success) {
        toast.success('OTP verified successfully!');
        
        // ✅ Now proceed with actual Google sign-in
        await handlegooglesignin();
        
      } else {
        toast.error(result.error || 'Invalid OTP');
      }
    } catch (error: any) {
      console.error('❌ Verify OTP error:', error);
      const errorMsg = error.response?.data?.error || 'Invalid OTP';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle phone number input formatting
  const handlePhoneInput = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    setContact(cleaned);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-red-500 rounded-full mb-4">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to continue to YouTube Clone
            </p>
          </div>

          {/* Step 1: Login Options */}
          {step === 'login' && (
            <div className="space-y-4">
              {/* Google Sign-In */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 h-12 text-lg font-medium"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-gray-600 border-t-transparent rounded-full" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </span>
                )}
              </Button>

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

              {/* ✅ Enhanced Location Info Card with all details */}
              {locationInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {otpMethod === 'email' ? '📧' : '📱'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {otpMethod === 'email' ? 'Email OTP' : 'SMS OTP'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        📍 {locationInfo.location.city}, {locationInfo.location.state}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        ⏰ {locationInfo.currentHour}:{String(locationInfo.currentMinute).padStart(2, '0')} IST
                        {locationInfo.isMorningTime && ' (Morning - Light Theme)'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ Fallback OTP Method Display (when locationInfo not available) */}
              {!locationInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-2xl">
                      {otpMethod === 'email' ? '📧' : '📱'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {otpMethod === 'email' ? 'Email OTP' : 'SMS OTP'}
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
                  type={otpMethod === 'email' ? 'email' : 'tel'}
                  placeholder={
                    otpMethod === 'email' 
                      ? 'Enter your email (use real email)' 
                      : 'Enter 10-digit phone (e.g., 9876543210)'
                  }
                  value={contact}
                  onChange={(e) => {
                    if (otpMethod === 'sms') {
                      handlePhoneInput(e.target.value);
                    } else {
                      setContact(e.target.value);
                    }
                  }}
                  className="h-12 text-lg"
                  maxLength={otpMethod === 'sms' ? 10 : undefined}
                />
                {otpMethod === 'sms' && (
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    💡 Enter 10 digits only (e.g., 9876543210)
                  </p>
                )}
                {otpMethod === 'email' && (
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    ⚠️ Don't use test@example.com - use your real email
                  </p>
                )}
              </div>

              <Button
                onClick={handleSendOTP}
                disabled={loading || countdown > 0}
                className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700"
              >
                {countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : loading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </span>
                ) : (
                  'Send OTP'
                )}
              </Button>

              <Button
                onClick={() => setStep('otp')}
                variant="ghost"
                className="w-full"
              >
                Already have OTP? Click here
              </Button>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🔐</div>
                <h2 className="text-2xl font-bold mb-2">Enter OTP</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  We sent a 6-digit code to
                </p>
                <p className="font-medium text-blue-600 dark:text-blue-400 mt-1">
                  {contact || 'your contact'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Check server console for OTP in development mode
                </p>
              </div>

              {/* OTP Input */}
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                }}
                maxLength={6}
                className="h-14 text-center text-2xl tracking-widest font-mono"
              />

              <Button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full h-12 text-lg font-medium bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Verifying...
                  </span>
                ) : (
                  'Verify OTP'
                )}
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep('login')}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSendOTP}
                  disabled={loading || countdown > 0}
                  variant="outline"
                  className="flex-1"
                >
                  {countdown > 0 ? `Resend (${countdown}s)` : 'Resend OTP'}
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              By continuing, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* ✅ Enhanced Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && locationInfo && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
            <p className="font-bold mb-2">🧪 Debug Info:</p>
            <p>🌐 API URL: {API_URL}</p>
            <p>📍 State: {locationInfo.location.state}</p>
            <p>🏙️ City: {locationInfo.location.city}</p>
            <p>🎨 Theme: {locationInfo.theme}</p>
            <p>📧 OTP Method: {otpMethod}</p>
            <p>⏰ Time: {locationInfo.currentHour}:{String(locationInfo.currentMinute).padStart(2, '0')} IST</p>
            <p>🌅 Morning (10-12): {locationInfo.isMorningTime ? 'Yes' : 'No'}</p>
            <p>🌴 South India: {locationInfo.isSouthIndia ? 'Yes' : 'No'}</p>
            <p>📞 Contact: {contact || 'Not set'}</p>
            <p>🔢 Step: {step}</p>
            <p className="text-xs mt-2 text-gray-600">
              Check server console for OTP code
            </p>
          </div>
        )}

        {/* ✅ Basic Debug Info when locationInfo not loaded */}
        {process.env.NODE_ENV === 'development' && !locationInfo && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
            <p className="font-bold mb-2">🧪 Debug Info:</p>
            <p>🌐 API URL: {API_URL}</p>
            <p>📧 OTP Method: {otpMethod}</p>
            <p>📞 Contact: {contact || 'Not set'}</p>
            <p>🔢 Step: {step}</p>
            <p className="text-xs mt-2 text-gray-600">
              Location info loading... Check console for logs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}