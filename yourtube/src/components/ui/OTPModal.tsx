/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  otpMethod: 'email' | 'sms';
  contact: string;
  onSuccess: () => void;
}

export const OTPModal: React.FC<OTPModalProps> = ({
  isOpen,
  onClose,
  otpMethod,
  contact,
  onSuccess
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [debugOtp, setDebugOtp] = useState(''); // For testing

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = otpMethod === 'email' 
        ? 'http://localhost:5000/api/send-email-otp'
        : 'http://localhost:5000/api/send-sms-otp';
      
      const payload = otpMethod === 'email' 
        ? { email: contact }
        : { phoneNumber: contact };

      console.log('📤 Sending OTP to:', endpoint, payload);

      const response = await axios.post(endpoint, payload);
      
      console.log('✅ OTP Response:', response.data);
      
      if (response.data.success) {
        setOtpSent(true);
        setCountdown(300); // 5 minutes
        setError('');
        
        // For testing - show OTP in console
        if (response.data.debug?.otp) {
          setDebugOtp(response.data.debug.otp);
          console.log('🔢 TEST OTP:', response.data.debug.otp);
        }
      } else {
        setError(response.data.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      console.error('❌ OTP send error:', err);
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('🔐 Verifying OTP:', otp, 'for contact:', contact);

      const response = await axios.post('http://localhost:5000/api/verify-otp', {
        otp,
        contact
      });

      console.log('✅ Verify Response:', response.data);

      if (response.data.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.data.error || 'Invalid OTP');
      }
    } catch (err: any) {
      console.error('❌ Verify error:', err);
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    setOtp('');
    setError('');
    setOtpSent(false);
    setDebugOtp('');
    handleSendOTP();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            OTP Verification
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        {!otpSent ? (
          <>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Well send an OTP to your {otpMethod === 'email' ? 'email' : 'mobile number'}
            </p>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <p className="font-semibold text-gray-900 dark:text-white break-all">
                {contact}
              </p>
            </div>
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Enter the 6-digit OTP sent to your {otpMethod === 'email' ? 'email' : 'mobile'}
            </p>
            
            {/* Debug OTP Display (Remove in production) */}
            {debugOtp && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Test OTP:</strong> {debugOtp}
                </p>
              </div>
            )}

            <input
              type="text"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
              }}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="w-full p-3 border rounded-lg mb-4 text-center text-2xl tracking-widest font-mono text-gray-900 dark:text-white dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {countdown > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                OTP expires in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </p>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors mb-2"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              onClick={handleResendOTP}
              disabled={loading || countdown > 240}
              className="w-full text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed py-2"
            >
              Resend OTP {countdown > 240 && `(wait ${Math.floor((countdown - 240) / 60)}:${((countdown - 240) % 60).toString().padStart(2, '0')})`}
            </button>
          </>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <button
          onClick={onClose}
          className="w-full mt-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};