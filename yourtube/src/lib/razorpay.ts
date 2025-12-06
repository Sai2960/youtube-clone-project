/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/lib/razorpay.ts
import { useState } from 'react';

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface CreateOrderRequest {
  userId: string;
  planId: string;
}

export interface CreateOrderResponse {
  success: boolean;
  order: {
    id: string;
    amount: number;
    currency: string;
    planDetails: {
      name: string;
      price: number;
      duration: number;
      features: any;
    };
  };
  message?: string;
}

export interface VerifyPaymentRequest {
  userId: string;
  planId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  subscription?: any;
}

// Razorpay configuration with environment variables
export const RAZORPAY_CONFIG = {
  TEST_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
  // Secret key should NEVER be used on frontend - only on backend
};

// Razorpay utility functions
export class RazorpayService {
  private static isScriptLoaded = false;

  // Load Razorpay script
  static loadScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isScriptLoaded || window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => {
        this.isScriptLoaded = true;
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        resolve(false);
      };
      
      document.body.appendChild(script);
    });
  }

  // Create payment order
  static async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const response = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create order error:', error);
      throw new Error('Failed to create payment order');
    }
  }

  // Verify payment
  static async verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    try {
      const response = await fetch('/api/subscription/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Verify payment error:', error);
      throw new Error('Failed to verify payment');
    }
  }

  // Initialize payment with your Razorpay keys
  static async initializePayment(
    userId: string,
    planId: string,
    onSuccess: (subscription: any) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      // Load Razorpay script if not loaded
      const isLoaded = await this.loadScript();
      if (!isLoaded) {
        throw new Error('Failed to load Razorpay');
      }

      // Create order
      const orderData = await this.createOrder({ userId, planId });
      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // Razorpay options with your test key
      const options: RazorpayOptions = {
        key: RAZORPAY_CONFIG.TEST_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Video Platform Premium',
        description: `Subscription: ${orderData.order.planDetails.name}`,
        order_id: orderData.order.id,
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyResult = await this.verifyPayment({
              userId,
              planId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResult.success) {
              onSuccess(verifyResult.subscription);
            } else {
              onError(verifyResult.message || 'Payment verification failed');
            }
          } catch (error) {
            onError('Payment verification failed');
          }
        },
        prefill: {
          email: 'user@example.com' // You might want to get this from user data
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
          }
        }
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Initialize payment error:', error);
      onError(error instanceof Error ? error.message : 'Payment initialization failed');
    }
  }

  // Get plan details
  static async getPlans() {
    try {
      const response = await fetch('/api/subscription/plans');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Get plans error:', error);
      throw new Error('Failed to fetch plans');
    }
  }

  // Get user subscription
  static async getUserSubscription(userId: string) {
    try {
      const response = await fetch(`/api/subscription/user/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Get subscription error:', error);
      throw new Error('Failed to fetch subscription');
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId: string) {
    try {
      const response = await fetch(`/api/subscription/cancel/${userId}`, {
        method: 'PUT'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw new Error('Failed to cancel subscription');
    }
  }
}

// Hook for using Razorpay in React components
export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initPayment = async (
    userId: string,
    planId: string,
    onSuccess: (subscription: any) => void
  ) => {
    setIsLoading(true);
    setError(null);

    await RazorpayService.initializePayment(
      userId,
      planId,
      (subscription) => {
        setIsLoading(false);
        onSuccess(subscription);
      },
      (errorMessage) => {
        setIsLoading(false);
        setError(errorMessage);
      }
    );
  };

  const createOrder = async (userId: string, planId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await RazorpayService.createOrder({ userId, planId });
      setIsLoading(false);
      return result;
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to create order');
      throw err;
    }
  };

  const verifyPayment = async (request: VerifyPaymentRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await RazorpayService.verifyPayment(request);
      setIsLoading(false);
      return result;
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Payment verification failed');
      throw err;
    }
  };

  return {
    initPayment,
    createOrder,
    verifyPayment,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

// Test card details for development (these are safe to keep as they're Razorpay's test card numbers)
export const TEST_CARD_DETAILS = {
  CARD_NUMBER: '4111 1111 1111 1111',
  EXPIRY_MONTH: '12',
  EXPIRY_YEAR: '25',
  CVV: '123',
  CARDHOLDER_NAME: 'Test User'
};