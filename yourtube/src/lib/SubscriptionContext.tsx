// ✅ FIXED: Subscription Context - No more Fast Refresh loops
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import axiosInstance from "./axiosinstance";

interface Subscription {
  planType: string;
  planName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  dailyDownloads?: number;
  currentPlan?: string;
  plan?: string;
  watchLimit?: number;
  isUnlimited?: boolean;
}

interface DownloadPermission {
  allowed: boolean;
  reason?: string;
  remainingDownloads?: number | string;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  canDownload: boolean;
  remainingDownloads: number | string;
  watchTimeLimit: number;
  currentPlan: string;
  checkWatchLimit: () => Promise<boolean>;
  checkDownloadPermission: () => Promise<DownloadPermission>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

const isPremiumPlan = (planType: string | undefined): boolean => {
  if (!planType) return false;
  const plan = planType.toUpperCase().trim();
  return ["GOLD", "SILVER", "BRONZE", "PREMIUM", "MONTHLY", "YEARLY"].includes(
    plan
  );
};

// ✅ CRITICAL FIX: Move refs OUTSIDE component
const globalFetchState = {
  hasFetched: false,
  isFetching: false,
};
export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
}) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchTimeLimit, setWatchTimeLimit] = useState(5);
  const [currentPlan, setCurrentPlan] = useState("FREE");

  // ✅ IMPROVED: Enhanced fetchSubscription with abort controller and better error handling
  const fetchSubscription = useCallback(async () => {
    console.log("\n🔄 ===== FETCHING SUBSCRIPTION =====");

    if (globalFetchState.isFetching) {
      console.log("⏸️ Fetch already in progress, skipping");
      return;
    }

    globalFetchState.isFetching = true;

    try {
      if (typeof window === "undefined") {
        console.log("⚠️ Server side - skipping");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      console.log("🔑 Token exists:", !!token);

      if (!token) {
        console.log("⚠️ No token - setting FREE plan");
        const freePlan: Subscription = {
          planType: "free",
          planName: "Free Plan",
          dailyDownloads: 0,
          currentPlan: "FREE",
          plan: "FREE",
          watchLimit: 5,
          isUnlimited: false,
        };
        setSubscription(freePlan);
        setWatchTimeLimit(5);
        setCurrentPlan("FREE");
        setLoading(false);
        globalFetchState.hasFetched = true;
        return;
      }

      console.log("📞 Calling /subscription/current API...");

      // ✅ CRITICAL: Add abort controller to prevent request cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("⏰ Request timeout - aborting");
        controller.abort();
      }, 25000);

      try {
        const response = await axiosInstance.get("/subscription/current", {
          signal: controller.signal,
          timeout: 25000,
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
        });

        clearTimeout(timeoutId);

        console.log("✅ API Response:", response.data);

        if (response.data.success) {
          const currentPlanValue = (
            response.data.currentPlan || "FREE"
          ).toUpperCase();
          const watchLimit =
            response.data.watchTimeLimit !== undefined
              ? response.data.watchTimeLimit
              : 5;

          const planDetails = {
            currentPlan: currentPlanValue,
            watchLimit: watchLimit,
            isUnlimited: watchLimit === -1,
          };

          console.log("✅ Plan details from backend:", planDetails);

          const newSubscription: Subscription = {
            ...response.data.subscription,
            planType: response.data.subscription?.planType || "free",
            dailyDownloads: response.data.subscription?.dailyDownloads || 0,
            currentPlan: currentPlanValue,
            plan: currentPlanValue,
            watchLimit: watchLimit,
            isUnlimited: watchLimit === -1,
          };

          setSubscription(newSubscription);
          setWatchTimeLimit(watchLimit);
          setCurrentPlan(currentPlanValue);

          console.log("✅ Subscription loaded:", {
            plan: currentPlanValue,
            watchLimit: watchLimit,
            isUnlimited: watchLimit === -1,
          });
        } else {
          console.log("⚠️ No active subscription in response");
          const freePlan: Subscription = {
            planType: "free",
            planName: "Free Plan",
            dailyDownloads: 0,
            currentPlan: "FREE",
            plan: "FREE",
            watchLimit: 5,
            isUnlimited: false,
          };
          setSubscription(freePlan);
          setWatchTimeLimit(5);
          setCurrentPlan("FREE");
        }
        globalFetchState.hasFetched = true;
      } catch (fetchError: any) {
        if (fetchError.name === "AbortError") {
          console.error("❌ Request was aborted/timed out");
        } else {
          throw fetchError; // Re-throw to outer catch
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      console.error("❌ Subscription fetch error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Handle 401 unauthorized
      if (error.response?.status === 401) {
        console.log("🔄 Token expired, clearing token...");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("tokenExpired"));
      }

      const freePlan: Subscription = {
        planType: "free",
        planName: "Free Plan",
        dailyDownloads: 0,
        currentPlan: "FREE",
        plan: "FREE",
        watchLimit: 5,
        isUnlimited: false,
      };
      setSubscription(freePlan);
      setWatchTimeLimit(5);
      setCurrentPlan("FREE");
      globalFetchState.hasFetched = true;
    } finally {
      setLoading(false);
      globalFetchState.isFetching = false;
      console.log("🔄 fetchSubscription COMPLETED\n");
    }
  }, []);
  // ✅ Check watch limit function
  const checkWatchLimit = useCallback(async (): Promise<boolean> => {
    try {
      console.log("🎬 Checking watch limit...");
      const response = await axiosInstance.get(
        "/subscription/check-watch-limit"
      );
      console.log("✅ Watch limit check result:", response.data.canWatch);
      return response.data.canWatch;
    } catch (error) {
      console.error("❌ Watch limit check error:", error);
      // Fallback: allow if unlimited or has time remaining
      return watchTimeLimit === -1 || watchTimeLimit > 0;
    }
  }, [watchTimeLimit]);

  // ✅ Check download permission function
  const checkDownloadPermission =
    useCallback(async (): Promise<DownloadPermission> => {
      try {
        console.log("📥 Checking download permission...");

        const userString = localStorage.getItem("user");
        if (!userString) {
          return {
            allowed: false,
            reason: "Please login to download",
            remainingDownloads: 0,
          };
        }

        const user = JSON.parse(userString);
        const userPlanType = subscription?.planType || "free";

        // Premium users get unlimited downloads
        if (isPremiumPlan(userPlanType)) {
          console.log("✅ Premium user - unlimited downloads");
          return {
            allowed: true,
            remainingDownloads: "unlimited",
            reason: undefined,
          };
        }

        // Check eligibility for free users
        const response = await axiosInstance.get(
          `/download/eligibility/${user._id}`
        );

        console.log("✅ Download eligibility:", response.data);

        return {
          allowed: response.data.canDownload,
          remainingDownloads: response.data.isPremium
            ? "unlimited"
            : response.data.maxDownloads - response.data.downloadsToday,
          reason: response.data.canDownload ? undefined : "Daily limit reached",
        };
      } catch (error: any) {
        console.error("❌ Download permission check error:", error);

        // Fallback calculation
        const userPlanType = subscription?.planType || "free";
        const isPremium = isPremiumPlan(userPlanType);
        const dailyDownloads = subscription?.dailyDownloads || 0;
        const allowed = isPremium || dailyDownloads < 1;

        return {
          allowed,
          remainingDownloads: isPremium
            ? "unlimited"
            : Math.max(0, 1 - dailyDownloads),
          reason: allowed ? undefined : "Daily download limit reached",
        };
      }
    }, [subscription?.planType, subscription?.dailyDownloads]);

  // ✅ Manual refresh function
  const refreshSubscription = useCallback(async () => {
    console.log("🔄 Manual refresh requested");
    globalFetchState.hasFetched = false;
    setLoading(true);
    await fetchSubscription();
  }, [fetchSubscription]);
  // ✅ FIXED: Initial fetch (runs ONCE)
  useEffect(() => {
    if (globalFetchState.hasFetched) {
      console.log("✅ Already fetched, skipping");
      return;
    }

    console.log("🎬 SubscriptionContext mounted - scheduling fetch");
    const timer = setTimeout(() => {
      fetchSubscription();
    }, 300);

    return () => {
      console.log("🛑 SubscriptionContext cleanup");
      clearTimeout(timer);
    };
  }, [fetchSubscription]);

  // ✅ FIXED: Storage listeners (won't cause loops)
  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      if (e instanceof StorageEvent && e.key === "token") {
        console.log("📢 Token changed in storage, refetching");
        globalFetchState.hasFetched = false;
        fetchSubscription();
      } else if (e.type === "tokenUpdated") {
        console.log("📢 Token updated event received");
        globalFetchState.hasFetched = false;
        fetchSubscription();
      } else if (e.type === "tokenExpired") {
        console.log("📢 Token expired event received");
        // Set to free plan immediately
        const freePlan: Subscription = {
          planType: "free",
          planName: "Free Plan",
          dailyDownloads: 0,
          currentPlan: "FREE",
          plan: "FREE",
          watchLimit: 5,
          isUnlimited: false,
        };
        setSubscription(freePlan);
        setWatchTimeLimit(5);
        setCurrentPlan("FREE");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("tokenUpdated", handleStorageChange);
    window.addEventListener("tokenExpired", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("tokenUpdated", handleStorageChange);
      window.removeEventListener("tokenExpired", handleStorageChange);
    };
  }, [fetchSubscription]);

  // ✅ Compute derived values inline (stable)
  const userPlanType = subscription?.planType || "free";
  const canDownload =
    isPremiumPlan(userPlanType) || (subscription?.dailyDownloads || 0) < 1;
  const remainingDownloads = isPremiumPlan(userPlanType)
    ? "unlimited"
    : Math.max(0, 1 - (subscription?.dailyDownloads || 0));

  // ✅ CRITICAL FIX: Memoize with STABLE dependencies only
  const contextValue = useMemo(
    () => ({
      subscription,
      loading,
      refreshSubscription,
      canDownload,
      remainingDownloads,
      watchTimeLimit,
      currentPlan,
      checkWatchLimit,
      checkDownloadPermission,
    }),
    [
      subscription,
      loading,
      refreshSubscription,
      canDownload,
      remainingDownloads,
      watchTimeLimit,
      currentPlan,
      checkWatchLimit,
      checkDownloadPermission,
    ]
  );

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};
