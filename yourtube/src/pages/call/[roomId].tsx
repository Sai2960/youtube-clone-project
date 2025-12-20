// pages/call/[roomId].tsx - COMPLETE CALL PAGE
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import VideoCall from '@/components/ui/VideoCall';
import { useUser } from '@/lib/AuthContext';
import Head from 'next/head';
import initializeSocket from '@/lib/socket';

const CallPage = () => {
  const router = useRouter();
  const { roomId, callId, remoteName, initiator } = router.query;
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ CRITICAL: Initialize socket when user is available
  useEffect(() => {
    if (user?._id) {
      console.log("🔌 Initializing socket for call page");
      try {
        const socket = initializeSocket(user._id);
        
        // Wait for connection
        const checkConnection = setInterval(() => {
          if (socket.connected) {
            console.log("✅ Socket connected for call");
            setSocketReady(true);
            clearInterval(checkConnection);
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkConnection);
          if (!socket.connected) {
            console.error("❌ Socket connection timeout");
            setSocketReady(true); // Continue anyway
          }
        }, 10000);
      } catch (error) {
        console.error("❌ Socket init error:", error);
        setSocketReady(true); // Continue anyway
      }
    }
  }, [user?._id]);

  useEffect(() => {
    // Check if we have all required data
    if (mounted && roomId && typeof roomId === 'string' && socketReady) {
      console.log('📞 Call page ready');
      console.log('   Room ID:', roomId);
      console.log('   Call ID:', callId);
      console.log('   Remote Name:', remoteName);
      console.log('   Is Initiator:', initiator === 'true');
      console.log('   User:', user?._id);
      console.log('   Socket Ready:', socketReady);
      
      setIsReady(true);
    }
  }, [mounted, roomId, callId, remoteName, initiator, user, socketReady]);

  // Show loading screen until everything is ready
  if (!mounted || !isReady || !socketReady) {
    return (
      <>
        <Head>
          <title>Preparing Call...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        </Head>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
          <div className="text-center text-white">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl font-semibold">
              {!socketReady ? "Connecting to server..." : "Preparing call..."}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {!socketReady ? "Establishing connection" : "Setting up video and audio"}
            </p>
          </div>
        </div>
      </>
    );
  }

  function handleEndCall(): void {
    throw new Error('Function not implemented.');
  }

  return (
    <>
      <Head>
        <title>Video Call - {remoteName || 'Remote User'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>{`
          body {
            overflow: hidden;
            margin: 0;
            padding: 0;
          }
        `}</style>
      </Head>
      
      <div className="fixed inset-0 bg-black z-[9999] overflow-hidden">
        <VideoCall
          roomId={roomId as string}
          isInitiator={initiator === 'true'}
          onEndCall={handleEndCall}
          remotePeerName={(remoteName as string) || 'Remote User'}
          callId={(callId as string) || ''}
        />
      </div>
    </>
  );
};

export default CallPage;