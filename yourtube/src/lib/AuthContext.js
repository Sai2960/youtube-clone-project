// lib/AuthContext.tsx - SECURE VERSION

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, createContext, useEffect, useContext, useRef, useMemo } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { applyTheme } from './theme';
import { disconnectSocket } from './socket';

// ✅ ADD THIS
const DEFAULT_AVATAR = process.env.NEXT_PUBLIC_DEFAULT_AVATAR || '/images/default-avatar.png';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  
  const hasInitializedRef = useRef(false);
  const authUnsubscribeRef = useRef(null);

  const login = (userdata, token, theme = null, location = null, otpMethod = 'sms') => {
  console.log('🔐 Login called');
  console.log('📦 Received token (first 50 chars):', token?.substring(0, 50) + '...'); // ADD THIS
  
  const enrichedUser = {
    ...userdata,
    theme: theme || userdata.theme || localStorage.getItem('theme') || 'dark',
    location: location || null,
    preferredOtpMethod: otpMethod || 'sms'
  };
  
  setUser(enrichedUser);
  localStorage.setItem("user", JSON.stringify(enrichedUser));
  
  if (theme || userdata.theme) {
    console.log('🎨 Applying user theme IMMEDIATELY:', enrichedUser.theme);
    applyTheme(enrichedUser.theme);
  }
  
  if (token) {
    console.log('💾 Saving NEW token to localStorage'); // ADD THIS
    console.log('🔑 Token starts with:', token.substring(0, 30)); // ADD THIS
    localStorage.setItem("token", token);
    window.dispatchEvent(new Event('tokenUpdated'));
  } else {
    console.error('⚠️ NO TOKEN PROVIDED TO LOGIN FUNCTION!'); // ADD THIS
  }
  
  setError(null);
};

  const updateUser = (userData) => {
    console.log('🔄 Updating user data:', userData);
    
    setUser(currentUser => {
      const updatedUser = {
        ...currentUser,
        ...userData,
        _id: userData._id || currentUser?._id,
        email: userData.email || currentUser?.email,
      };
      
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      if (userData.theme && userData.theme !== currentUser?.theme) {
        console.log('🎨 User theme changed, applying IMMEDIATELY:', userData.theme);
        applyTheme(userData.theme);
      }
      
      return updatedUser;
    });
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user',
      newValue: JSON.stringify(userData),
      url: window.location.href
    }));
  };

  const logout = async () => {
    console.log('🚪 Logging out...');
    
    setUser(null);
    setError(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    
    disconnectSocket();
    
    window.dispatchEvent(new Event('tokenUpdated'));
    
    try {
      await signOut(auth);
      console.log('✅ Firebase sign out successful');
    } catch (error) {
      console.error("❌ Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      setError(null);
      console.log('🔵 Initiating Google Sign-In...');
      
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      
      // ✅ FIXED: Use constant instead of hardcoded URL
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || DEFAULT_AVATAR,
      };
      
      const response = await axiosInstance.post("/auth/login", payload);
      
      const userData = response.data.result || response.data.user || response.data;
      const theme = response.data.theme || userData.theme || null;
      const location = response.data.location || userData.location || null;
      const otpMethod = response.data.otpMethod || userData.preferredOtpMethod || 'sms';
      
      login(userData, response.data.token, theme, location, otpMethod);
      console.log('✅ Login complete');
      
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        
        if (status === 500) {
          errorMessage = 'Server error. Please check backend logs.';
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please try again.';
        } else {
          errorMessage = serverMessage || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Check if backend is running.';
      } else {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    if (hasInitializedRef.current) {
      console.log('✅ Auth already initialized, skipping');
      return;
    }
    
    console.log('🔍 Setting up Firebase auth observer');
    hasInitializedRef.current = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        console.log('👤 Firebase user detected:', firebaseuser.email);
        
        try {
          const storedUser = localStorage.getItem("user");
          const storedToken = localStorage.getItem("token");
          
          if (storedUser && storedToken) {
            console.log('✅ Using stored user data');
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsInitializing(false);
            return;
          }
          
          console.log('🔄 No local data found, fetching from backend...');
          
          // ✅ FIXED: Use constant instead of hardcoded URL
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || DEFAULT_AVATAR,
          };
          
          const response = await axiosInstance.post("/auth/login", payload);
          
          const userData = response.data.result || response.data.user || response.data;
          const theme = response.data.theme || userData.theme || null;
          const location = response.data.location || userData.location || null;
          const otpMethod = response.data.otpMethod || userData.preferredOtpMethod || 'sms';
          
          login(userData, response.data.token, theme, location, otpMethod);
          
        } catch (error) {
          console.error('❌ Auto-login error:', error);
          await logout();
        }
      } else {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");
        
        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          window.dispatchEvent(new Event('tokenUpdated'));
        } else {
          await logout();
        }
      }
      
      setIsInitializing(false);
    });
    
    authUnsubscribeRef.current = unsubscribe;
    
    return () => {
      console.log('🧹 Cleaning up Firebase auth observer');
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
      }
    };
  }, []);

  const contextValue = useMemo(() => ({
    user,
    login,
    logout,
    handlegooglesignin,
    updateUser,
    error,
    isInitializing
  }), [user, error, isInitializing]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <div className="text-white text-lg">Initializing...</div>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};