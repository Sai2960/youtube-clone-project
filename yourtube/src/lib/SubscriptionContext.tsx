// ✅ FIXED: Subscription Context - No more Fast Refresh loops
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef, useCallback } from 'react';
import axiosInstance from './axiosinstance';

interface Subscription {
  planType: string;
  planName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  dailyDownloads?: number;
  currentPlan?: string;
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

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

const isPremiumPlan = (planType: string | undefined): boolean => {
  if (!planType) return false;
  const plan = planType.toUpperCase().trim();
  return ['GOLD', 'SILVER', 'BRONZE', 'PREMIUM', 'MONTHLY', 'YEARLY'].includes(plan);
};

// ✅ CRITICAL FIX: Move refs OUTSIDE component
const globalFetchState = {
  hasFetched: false,
  isFetching: false,
};

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchTimeLimit, setWatchTimeLimit] = useState(5);
  const [currentPlan, setCurrentPlan] = useState('FREE');

  // ✅ CRITICAL FIX: Use useCallback to stabilize functions
  const fetchSubscription = useCallback(async () => {
    if (globalFetchState.isFetching) {
      console.log('⏸️ Fetch already in progress, skipping');
      return;
    }

    globalFetchState.isFetching = true;
    console.log('🔄 fetchSubscription STARTED');
    
    try {
      if (typeof window === 'undefined') {
        console.log('⚠️ Server side - skipping');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      console.log('🔑 Token exists?', !!token);
      
      if (!token) {
        console.log('⚠️ No token - setting FREE plan');
        const freePlan = {
          planType: 'free',
          planName: 'Free Plan',
          dailyDownloads: 0,
          currentPlan: 'FREE'
        };
        setSubscription(freePlan);
        setWatchTimeLimit(5);
        setCurrentPlan('FREE');
        setLoading(false);
        globalFetchState.hasFetched = true;
        return;
      }

      console.log('📞 Calling /subscription/current API...');
      const response = await axiosInstance.get('/subscription/current');
      console.log('📥 API Response:', response.data);

      if (response.data.success && response.data.subscription) {
        const planType = response.data.subscription.planType || 'free';
        const currentPlanValue = planType.toUpperCase();

        const newSubscription = {
          ...response.data.subscription,
          planType: planType,
          dailyDownloads: response.data.subscription.dailyDownloads || 0,
          currentPlan: currentPlanValue
        };

        setSubscription(newSubscription);
        setWatchTimeLimit(response.data.watchTimeLimit || 5);
        setCurrentPlan(currentPlanValue);

        console.log('✅ Subscription loaded successfully');
      } else {
        console.log('⚠️ No active subscription in response');
        const freePlan = {
          planType: 'free',
          planName: 'Free Plan',
          dailyDownloads: 0,
          currentPlan: 'FREE'
        };
        setSubscription(freePlan);
        setWatchTimeLimit(5);
        setCurrentPlan('FREE');
      }
      
      globalFetchState.hasFetched = true;
    } catch (error: any) {
      console.error('❌ Subscription fetch error:', error);
      
      const freePlan = {
        planType: 'free',
        planName: 'Free Plan',
        dailyDownloads: 0,
        currentPlan: 'FREE'
      };
      setSubscription(freePlan);
      setWatchTimeLimit(5);
      setCurrentPlan('FREE');
      globalFetchState.hasFetched = true;
    } finally {
      setLoading(false);
      globalFetchState.isFetching = false;
      console.log('🔄 fetchSubscription COMPLETED');
    }
  }, []); // ✅ Empty deps - stable function

  // ✅ CRITICAL FIX: Stabilize callback functions
  const checkWatchLimit = useCallback(async (): Promise<boolean> => {
    try {
      const response = await axiosInstance.get('/subscription/check-watch-limit');
      return response.data.canWatch;
    } catch (error) {
      return watchTimeLimit === -1 || watchTimeLimit > 0;
    }
  }, [watchTimeLimit]);

  const checkDownloadPermission = useCallback(async (): Promise<DownloadPermission> => {
    try {
      const userString = localStorage.getItem('user');
      if (!userString) {
        return { 
          allowed: false, 
          reason: 'Please login to download',
          remainingDownloads: 0 
        };
      }
      
      const user = JSON.parse(userString);
      const userPlanType = subscription?.planType || 'free';
      
      if (isPremiumPlan(userPlanType)) {
        return {
          allowed: true,
          remainingDownloads: 'unlimited',
          reason: undefined
        };
      }
      
      const response = await axiosInstance.get(`/download/eligibility/${user._id}`);
      
      return {
        allowed: response.data.canDownload,
        remainingDownloads: response.data.isPremium 
          ? 'unlimited' 
          : response.data.maxDownloads - response.data.downloadsToday,
        reason: response.data.canDownload ? undefined : 'Daily limit reached'
      };
    } catch (error: any) {
      const userPlanType = subscription?.planType || 'free';
      const isPremium = isPremiumPlan(userPlanType);
      const dailyDownloads = subscription?.dailyDownloads || 0;
      const allowed = isPremium || dailyDownloads < 1;
      
      return {
        allowed,
        remainingDownloads: isPremium ? 'unlimited' : Math.max(0, 1 - dailyDownloads),
        reason: allowed ? undefined : 'Daily download limit reached'
      };
    }
  }, [subscription?.planType, subscription?.dailyDownloads]);

  const refreshSubscription = useCallback(async () => {
    console.log('🔄 Manual refresh requested');
    globalFetchState.hasFetched = false;
    setLoading(true);
    await fetchSubscription();
  }, [fetchSubscription]);

  // ✅ FIXED: Initial fetch (runs ONCE)
  useEffect(() => {
    if (globalFetchState.hasFetched) {
      console.log('✅ Already fetched, skipping');
      return;
    }

    console.log('🎬 SubscriptionContext mounted - scheduling fetch');
    const timer = setTimeout(() => {
      fetchSubscription();
    }, 300);

    return () => {
      console.log('🛑 SubscriptionContext cleanup');
      clearTimeout(timer);
    };
  }, [fetchSubscription]);

  // ✅ FIXED: Storage listeners (won't cause loops)
  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      if (e instanceof StorageEvent && e.key === 'token') {
        console.log('📢 Token changed, refetching');
        globalFetchState.hasFetched = false;
        fetchSubscription();
      } else if (e.type === 'tokenUpdated') {
        console.log('📢 Token updated event');
        globalFetchState.hasFetched = false;
        fetchSubscription();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenUpdated', handleStorageChange);
    };
  }, [fetchSubscription]);

  // ✅ CRITICAL FIX: Compute derived values inline
  const userPlanType = subscription?.planType || 'free';
  const canDownload = isPremiumPlan(userPlanType) || (subscription?.dailyDownloads || 0) < 1;
  const remainingDownloads = isPremiumPlan(userPlanType)
    ? 'unlimited'
    : Math.max(0, 1 - (subscription?.dailyDownloads || 0));

  // ✅ CRITICAL FIX: Memoize with STABLE dependencies only
  const contextValue = useMemo(() => ({
    subscription,
    loading,
    refreshSubscription,
    canDownload,
    remainingDownloads,
    watchTimeLimit,
    currentPlan,
    checkWatchLimit,
    checkDownloadPermission
  }), [
    subscription,
    loading,
    refreshSubscription,
    canDownload,
    remainingDownloads,
    watchTimeLimit,
    currentPlan,
    checkWatchLimit,
    checkDownloadPermission
  ]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};