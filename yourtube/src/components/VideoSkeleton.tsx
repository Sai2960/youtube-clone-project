// youtube/src/components/ui/Skeleton.tsx
export const VideoSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-300 dark:bg-gray-700 aspect-video rounded-lg mb-3" />
    <div className="flex gap-3">
      <div className="w-9 h-9 bg-gray-300 dark:bg-gray-700 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  </div>
);

export const VideoGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
    {[...Array(12)].map((_, i) => (
      <VideoSkeleton key={i} />
    ))}
  </div>
);

// Short skeleton for loading states
export const ShortSkeleton = () => (
  <div className="flex-shrink-0 w-[120px] lg:w-[200px] animate-pulse">
    <div className="aspect-[9/16] bg-gray-300 dark:bg-gray-700 rounded-xl mb-2" />
    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded mb-1 lg:h-4" />
    <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-2/3 lg:h-3" />
  </div>
);

// Page loader for initial loads
export const PageLoader = () => (
  <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
      <p className="text-white text-lg">Loading YouTube Clone...</p>
      <p className="text-gray-400 text-sm mt-2">First load may take a moment</p>
    </div>
  </div>
);