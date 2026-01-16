// pages/watchlater/index.tsx - PREMIUM DELUXE VERSION
import WatchLaterContent from "@/components/WatchLaterContent";
import { Suspense } from "react";
import { GetServerSideProps } from "next";

export default function WatchLaterPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-gray-100 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#141414] overflow-x-hidden">
      <main className="w-full overflow-x-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-[3px] border-transparent border-t-amber-500 border-r-amber-400 mx-auto mb-6 shadow-lg shadow-amber-500/20"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 border border-amber-500/30 mx-auto"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium tracking-wide text-sm uppercase">
                  Loading your collection...
                </p>
              </div>
            </div>
          }
        >
          <WatchLaterContent />
        </Suspense>
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};
