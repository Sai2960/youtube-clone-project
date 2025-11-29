// pages/watchlater/index.tsx - FIXED FOR MOBILE
import WatchLaterContent from "@/components/WatchLaterContent";
import { Suspense } from "react";

export default function WatchLaterPage() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0f0f0f] overflow-x-hidden">
      <main className="w-full overflow-x-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-red-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading watch later...</p>
            </div>
          </div>
        }>
          <WatchLaterContent />
        </Suspense>
      </main>
    </div>
  );
}