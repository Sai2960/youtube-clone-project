// src/components/SubscribeButton.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

interface SubscribeButtonProps {
  channelId: string;
  initialSubscriberCount?: number;
  onSubscriptionChange?: (isSubscribed: boolean, count: number) => void;
  className?: string;
}

const SubscribeButton: React.FC<SubscribeButtonProps> = ({ 
  channelId, 
  initialSubscriberCount = 0,
  onSubscriptionChange,
  className = "" 
}) => {
  const { user } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(initialSubscriberCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Update subscriber count when prop changes
  useEffect(() => {
    console.log('🔄 Initial subscriber count updated:', initialSubscriberCount);
    setSubscriberCount(initialSubscriberCount);
  }, [initialSubscriberCount]);

  // Check subscription status
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || !channelId) {
        console.log("⏭️ Skipping check - no user or channelId");
        setIsCheckingStatus(false);
        return;
      }

      if (user._id === channelId) {
        console.log("⏭️ Skipping check - own channel");
        setIsCheckingStatus(false);
        return;
      }

      try {
        console.log("\n🔍 ===== CHECKING SUBSCRIPTION STATUS =====");
        console.log("   User ID:", user._id);
        console.log("   Channel ID:", channelId);
        
        const token = localStorage.getItem("token");
        console.log("   Token exists:", !!token);

        if (!token) {
          throw new Error("No authentication token");
        }
        
        const response = await axiosInstance.get(
          `/auth/subscription-status/${channelId}`
        );
        
        console.log("✅ Status response:", response.data);
        
        if (response.data.success) {
          const newIsSubscribed = response.data.isSubscribed;
          const newCount = response.data.subscriberCount;
          
          setIsSubscribed(newIsSubscribed);
          setSubscriberCount(newCount);
          
          console.log("📊 Updated state:", {
            isSubscribed: newIsSubscribed,
            subscriberCount: newCount
          });
          
          if (onSubscriptionChange) {
            onSubscriptionChange(newIsSubscribed, newCount);
          }
        }
      } catch (error: any) {
        console.error("❌ Status check error:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        if (error.response?.status === 401) {
          setError("Please log in again");
        }
      } finally {
        setIsCheckingStatus(false);
        console.log("===== STATUS CHECK COMPLETE =====\n");
      }
    };

    checkStatus();
  }, [user, channelId, onSubscriptionChange]);

  const handleSubscribe = async () => {
    if (!user) {
      setError("Please login to subscribe");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isSubscribed 
        ? `/auth/unsubscribe/${channelId}`
        : `/auth/subscribe/${channelId}`;

      console.log("\n📤 ===== SUBSCRIPTION ACTION =====");
      console.log("   Endpoint:", endpoint);
      console.log("   Current state:", isSubscribed ? "SUBSCRIBED" : "NOT SUBSCRIBED");
      console.log("   Action:", isSubscribed ? "UNSUBSCRIBE" : "SUBSCRIBE");

      const response = await axiosInstance.post(endpoint);

      console.log("✅ Action response:", response.data);

      if (response.data.success) {
        const newIsSubscribed = response.data.isSubscribed;
        const newCount = response.data.subscriberCount;
        
        // Update state immediately
        setIsSubscribed(newIsSubscribed);
        setSubscriberCount(newCount);
        
        console.log("🎉 State updated:", {
          isSubscribed: newIsSubscribed,
          subscriberCount: newCount
        });
        
        if (onSubscriptionChange) {
          onSubscriptionChange(newIsSubscribed, newCount);
        }
      }
    } catch (error: any) {
      console.error("❌ Subscription error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      setError(
        error.response?.data?.message || 
        "Failed to update subscription. Please try again."
      );
      
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
      console.log("===== SUBSCRIPTION ACTION COMPLETE =====\n");
    }
  };

  // Don't render if no user or own channel
  if (!user || user._id === channelId) {
    return null;
  }

  // Loading state
  if (isCheckingStatus) {
    return (
      <div className="flex items-center gap-2 min-w-[120px] h-10 px-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSubscribe}
          disabled={isLoading}
          size="default"
          className={`
            min-w-[120px] transition-all duration-200 font-medium rounded-full
            ${isSubscribed 
              ? "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600" 
              : "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg"
            }
            ${isLoading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isSubscribed ? "Unsubscribing..." : "Subscribing..."}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {isSubscribed ? (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Subscribed</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" />
                  <span>Subscribe</span>
                </>
              )}
            </span>
          )}
        </Button>

        {subscriberCount > 0 && (
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
            {subscriberCount.toLocaleString()} 
            {subscriberCount === 1 ? " subscriber" : " subscribers"}
          </span>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md border border-red-200 dark:border-red-800 animate-in fade-in slide-in-from-top-2 duration-300">
          {error}
        </div>
      )}
    </div>
  );
};

export default SubscribeButton;