// pages/history/index.tsx - PREMIUM DELUXE VERSION
import HistoryContent from "@/components/HistoryContent";
import React, { Suspense } from "react";
import { GetServerSideProps } from "next";

const HistoryPage = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#0a0a0a] overflow-x-hidden">
      <main className="w-full overflow-x-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#0a0a0a]">
              <div className="text-center">
                {/* Premium animated loader */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-gray-200/30 dark:border-gray-700/30"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin"></div>
                  <div
                    className="absolute inset-2 rounded-full border-2 border-transparent border-t-red-400/60 animate-spin"
                    style={{
                      animationDuration: "1.5s",
                      animationDirection: "reverse",
                    }}
                  ></div>
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-red-500/10 to-transparent"></div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-medium tracking-wide">
                  Loading your history
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-light tracking-wider uppercase">
                  Please wait...
                </p>
              </div>
            </div>
          }
        >
          <HistoryContent />
        </Suspense>
      </main>
    </div>
  );
};

// ✅ CRITICAL FIX: Disable static generation for history page
// This prevents the "Cannot find module 'critters'" error during build
export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {}, // Client-side handles user history data
  };
};

export default HistoryPage;
