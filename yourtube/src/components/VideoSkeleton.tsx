export const VideoSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-700 aspect-video rounded-lg mb-3" />
    <div className="flex gap-3">
      <div className="w-9 h-9 bg-gray-700 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
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