/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/components/PremiumModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Crown, Check, Loader2 } from 'lucide-react';

interface PremiumModalProps {
  userId: string;
  onClose: () => void;
  onSubscribed: () => void;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  duration: string;
  popular?: boolean;  
  savings?: string;
  features: string[];
  limitations: {
    downloadsPerDay: string | number;
    maxQuality: string;
    ads: boolean;
  };
}

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

const PremiumModal: React.FC<PremiumModalProps> = ({ userId, onClose, onSubscribed }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscription/plans');
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    
    try {
      // Create Razorpay order
      const orderResponse = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          planId: selectedPlan
        })
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message);
      }

      // Initialize Razorpay payment
      const options = {
        key: 'razorpayKey', // Your Razorpay Test Key
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Video Platform Premium',
        description: `Subscription: ${orderData.order.planDetails.name}`,
        order_id: orderData.order.id,
        handler: async (response: any) => {
          await verifyPayment(response, selectedPlan);
        },
        prefill: {
          email: 'user@example.com', // You might want to get this from user data
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment initialization error:', error);
      alert('Failed to initialize payment. Please try again.');
      setPaymentLoading(false);
    }
  };

  const verifyPayment = async (paymentResponse: any, planId: string) => {
    try {
      const verifyResponse = await fetch('/api/subscription/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          planId,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature
        })
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        alert('Payment successful! Welcome to Premium! 🎉');
        onSubscribed();
      } else {
        throw new Error(verifyData.message);
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      alert('Payment verification failed. Please contact support.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getSelectedPlanData = () => {
    return plans.find(plan => plan.id === selectedPlan);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="mt-2 text-center">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Upgrade to Premium</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={paymentLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold mb-2">
              Unlock Unlimited Downloads
            </h3>
            <p className="text-gray-600">
              You are  reached your daily download limit. Upgrade to premium for unlimited downloads!
            </p>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`
                  relative border-2 rounded-lg p-6 cursor-pointer transition-all
                  ${selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${plan.popular ? 'ring-2 ring-blue-200' : ''}
                `}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                {plan.savings && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      {plan.savings}
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold">{plan.name}</h4>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">₹{plan.price}</span>
                    {plan.originalPrice && (
                      <span className="text-gray-500 line-through ml-2">
                        ₹{plan.originalPrice}
                      </span>
                    )}
                    <div className="text-gray-600 text-sm">{plan.duration}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Selection indicator */}
                {selectedPlan === plan.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Payment Button */}
          <div className="text-center">
            <button
              onClick={handlePayment}
              disabled={paymentLoading || selectedPlan === 'free'}
              className={`
                px-8 py-3 rounded-lg font-medium text-lg transition-all
                ${selectedPlan === 'free'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-lg'
                }
                ${paymentLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  Processing Payment...
                </>
              ) : (
                <>
                  {selectedPlan === 'free' 
                    ? 'Current Plan' 
                    : `Pay ₹${getSelectedPlanData()?.price} with Razorpay`
                  }
                </>
              )}
            </button>

            {selectedPlan !== 'free' && (
              <p className="text-xs text-gray-500 mt-2">
                💳 Secure payment powered by Razorpay | Test Mode
              </p>
            )}
          </div>

          {/* Features Comparison */}
          <div className="mt-8 pt-6 border-t">
            <h4 className="font-semibold mb-4">Why upgrade to Premium?</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Free Plan</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 1 download per day</li>
                  <li>• Standard quality only</li>
                  <li>• With advertisements</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-600 mb-2">Premium Plan</h5>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Unlimited downloads</li>
                  <li>• HD quality (720p)</li>
                  <li>• Ad-free experience</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test Payment Info */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="font-medium text-yellow-800 mb-2">🧪 Test Payment Information</h5>
            <div className="text-sm text-yellow-700 space-y-1">
              <p><strong>Test Card:</strong> 4111 1111 1111 1111</p>
              <p><strong>Expiry:</strong> Any future date (e.g., 12/25)</p>
              <p><strong>CVV:</strong> Any 3 digits (e.g., 123)</p>
              <p className="text-xs mt-2">This is a test environment. No real money will be charged.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;