// lib/crossTabCall.ts - COMPLETE CROSS-TAB CALL SYNCHRONIZATION

export interface IncomingCallData {
  from: string;
  name: string;
  roomId: string;
  image: string;
  callId: string;
  timestamp: number;
}

const CALL_STORAGE_KEY = 'youtube_incoming_call';
const CALL_EVENT = 'youtube-incoming-call-event';
const CALL_ACCEPTED_KEY = 'youtube_call_accepted';
const CALL_REJECTED_KEY = 'youtube_call_rejected';

/**
 * Store incoming call data in sessionStorage and broadcast to other tabs
 */
export const storeIncomingCall = (callData: IncomingCallData): void => {
  try {
    const dataWithTimestamp = {
      ...callData,
      timestamp: Date.now()
    };
    
    // Store in sessionStorage (current tab only)
    sessionStorage.setItem(CALL_STORAGE_KEY, JSON.stringify(dataWithTimestamp));
    
    // Store in localStorage to notify other tabs
    localStorage.setItem(CALL_STORAGE_KEY, JSON.stringify(dataWithTimestamp));
    
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent(CALL_EVENT, { detail: dataWithTimestamp }));
    
    console.log('📞 Call stored and broadcasted to all tabs:', callData.name);
  } catch (error) {
    console.error('❌ Error storing incoming call:', error);
  }
};

/**
 * Get incoming call data from storage
 */
export const getIncomingCall = (): IncomingCallData | null => {
  try {
    // Try sessionStorage first (current tab)
    let stored = sessionStorage.getItem(CALL_STORAGE_KEY);
    
    // If not in session, try localStorage (from other tabs)
    if (!stored) {
      stored = localStorage.getItem(CALL_STORAGE_KEY);
    }
    
    if (!stored) return null;
    
    const callData = JSON.parse(stored) as IncomingCallData;
    
    // Check if call is not too old (5 minutes max)
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - callData.timestamp > fiveMinutes) {
      console.log('⏰ Call data expired, clearing');
      clearIncomingCall();
      return null;
    }
    
    return callData;
  } catch (error) {
    console.error('❌ Error getting incoming call:', error);
    return null;
  }
};

/**
 * Clear incoming call from storage
 */
export const clearIncomingCall = (): void => {
  try {
    sessionStorage.removeItem(CALL_STORAGE_KEY);
    localStorage.removeItem(CALL_STORAGE_KEY);
    console.log('✅ Call cleared from storage');
  } catch (error) {
    console.error('❌ Error clearing incoming call:', error);
  }
};

/**
 * Mark call as accepted (notifies other tabs)
 */
export const markCallAccepted = (roomId: string): void => {
  try {
    const data = {
      roomId,
      timestamp: Date.now()
    };
    localStorage.setItem(CALL_ACCEPTED_KEY, JSON.stringify(data));
    
    // Clear after 1 second
    setTimeout(() => {
      localStorage.removeItem(CALL_ACCEPTED_KEY);
    }, 1000);
    
    console.log('✅ Call marked as accepted:', roomId);
  } catch (error) {
    console.error('❌ Error marking call accepted:', error);
  }
};

/**
 * Mark call as rejected (notifies other tabs)
 */
export const markCallRejected = (roomId: string): void => {
  try {
    const data = {
      roomId,
      timestamp: Date.now()
    };
    localStorage.setItem(CALL_REJECTED_KEY, JSON.stringify(data));
    
    // Clear after 1 second
    setTimeout(() => {
      localStorage.removeItem(CALL_REJECTED_KEY);
    }, 1000);
    
    console.log('✅ Call marked as rejected:', roomId);
  } catch (error) {
    console.error('❌ Error marking call rejected:', error);
  }
};

/**
 * Listen for incoming calls across tabs
 */
export const onIncomingCall = (callback: (call: IncomingCallData) => void): (() => void) => {
  // Handler for same-tab events
  const customEventHandler = (event: Event) => {
    const customEvent = event as CustomEvent<IncomingCallData>;
    callback(customEvent.detail);
  };

  // Handler for cross-tab events (localStorage changes)
  const storageHandler = (event: StorageEvent) => {
    try {
      // New incoming call
      if (event.key === CALL_STORAGE_KEY && event.newValue) {
        const callData = JSON.parse(event.newValue) as IncomingCallData;
        console.log('📞 Incoming call detected from another tab:', callData.name);
        callback(callData);
      }
      
      // Call accepted in another tab - dismiss notification
      if (event.key === CALL_ACCEPTED_KEY && event.newValue) {
        const data = JSON.parse(event.newValue);
        console.log('✅ Call accepted in another tab, dismissing');
        clearIncomingCall();
      }
      
      // Call rejected in another tab - dismiss notification
      if (event.key === CALL_REJECTED_KEY && event.newValue) {
        const data = JSON.parse(event.newValue);
        console.log('❌ Call rejected in another tab, dismissing');
        clearIncomingCall();
      }
    } catch (error) {
      console.error('❌ Error parsing storage event:', error);
    }
  };

  // Register listeners
  window.addEventListener(CALL_EVENT, customEventHandler);
  window.addEventListener('storage', storageHandler);

  console.log('👂 Cross-tab call listeners registered');

  // Return cleanup function
  return () => {
    window.removeEventListener(CALL_EVENT, customEventHandler);
    window.removeEventListener('storage', storageHandler);
    console.log('🧹 Cross-tab call listeners cleaned up');
  };
};

/**
 * Check if call is active in any tab
 */
export const isCallActive = (): boolean => {
  try {
    const call = getIncomingCall();
    return call !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Get all call-related storage keys (for debugging)
 */
export const getCallStorageDebugInfo = (): any => {
  try {
    return {
      incomingCall: sessionStorage.getItem(CALL_STORAGE_KEY),
      localStorageCall: localStorage.getItem(CALL_STORAGE_KEY),
      callAccepted: localStorage.getItem(CALL_ACCEPTED_KEY),
      callRejected: localStorage.getItem(CALL_REJECTED_KEY),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('❌ Error getting debug info:', error);
    return null;
  }
};