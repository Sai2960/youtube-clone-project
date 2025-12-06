// pages/call/[roomId].tsx - COMPLETE CALL PAGE
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import VideoCall from '@/components/ui/VideoCall';
import { useUser } from '@/lib/AuthContext';
import Head from 'next/head';

const CallPage = () => {
  const router = useRouter();
  const { roomId, callId, remoteName, initiator } = router.query;
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check if we have all required data
    if (mounted && roomId && typeof roomId === 'string') {
      console.log('📞 Call page ready');
      console.log('   Room ID:', roomId);
      console.log('   Call ID:', callId);
      console.log('   Remote Name:', remoteName);
      console.log('   Is Initiator:', initiator === 'true');
      console.log('   User:', user?._id);
      
      setIsReady(true);
    }
  }, [mounted, roomId, callId, remoteName, initiator, user]);

  const handleEndCall = () => {
    console.log('📞 Call ended, redirecting to home');
    
    // Clear any call-related storage
    try {
      sessionStorage.removeItem('youtube_incoming_call');
      localStorage.removeItem('youtube_incoming_call');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
    
    // Redirect to home
    router.push('/');
  };

  // Show loading screen until everything is ready
  if (!mounted || !isReady) {
    return (
      <>
        <Head>
          <title>Preparing Call...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        </Head>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
          <div className="text-center text-white">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl font-semibold">Preparing call...</p>
            <p className="text-sm text-gray-400 mt-2">Setting up video and audio</p>
          </div>
        </div>
      </>
    );
  }

  // Validate user is authenticated
  if (!user?._id) {
    return (
      <>
        <Head>
          <title>Authentication Required</title>
        </Head>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
          <div className="text-center text-white max-w-md">
            <p className="text-xl font-semibold mb-4">Authentication Required</p>
            <p className="text-gray-400 mb-6">Please sign in to make calls</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      </>
    );
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