/* eslint-disable @typescript-eslint/no-unused-vars */
import LikedContent from "@/components/LikedContent";
import React, { Suspense } from "react";

const LikedVideosPage = () => {
  return (
    // ✅ FIXED: Complete page wrapper with proper overflow control
    <div className="min-h-screen w-full bg-white dark:bg-[#0f0f0f] overflow-x-hidden">
      <main className="w-full overflow-x-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading liked videos...</p>
            </div>
          </div>
        }>
          <LikedContent />
        </Suspense>
      </main>
    </div>
  );
};

export default LikedVideosPage;