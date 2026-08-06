export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F2F3F4]">
      {/* Progress bar skeleton */}
      <div className="fixed top-0 left-0 w-full h-[3px] bg-transparent z-[9999]">
        <div className="h-full w-[40%] bg-gradient-to-r from-[#007BFF] to-[#60a5fa] animate-pulse" />
      </div>

      {/* Hero skeleton */}
      <div className="max-w-[1200px] mx-auto px-4 pt-[6rem] pb-8">
        <div className="rounded-[24px] overflow-hidden min-h-[520px] bg-gray-200 animate-pulse relative">
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="h-4 w-24 bg-gray-300 rounded-full mb-4" />
            <div className="h-10 w-3/4 bg-gray-300 rounded-lg mb-3" />
            <div className="h-10 w-1/2 bg-gray-300 rounded-lg mb-4" />
            <div className="h-4 w-full max-w-md bg-gray-300 rounded mb-6" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-300" />
              <div>
                <div className="h-3 w-24 bg-gray-300 rounded mb-1" />
                <div className="h-3 w-32 bg-gray-300 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + pills skeleton */}
      <div className="max-w-[1200px] mx-auto px-4 py-4">
        <div className="h-12 w-full max-w-md bg-white rounded-[14px] border border-gray-200 mb-4" />
        <div className="flex gap-2 flex-wrap">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-8 w-20 bg-white rounded-full border border-gray-200" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Left column */}
          <div>
            <div className="h-6 w-32 bg-gray-200 rounded mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-4">
              {/* Large card */}
              <div className="rounded-[20px] bg-white border border-gray-100 overflow-hidden">
                <div className="aspect-[16/10] bg-gray-200" />
                <div className="p-5">
                  <div className="h-3 w-16 bg-gray-200 rounded mb-3" />
                  <div className="h-6 w-full bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-full bg-gray-200 rounded mb-4" />
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <div className="w-7 h-7 rounded-full bg-gray-200" />
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
              {/* Stacked cards */}
              <div className="flex flex-col gap-4">
                {[1,2].map(i => (
                  <div key={i} className="flex gap-3 bg-white rounded-[16px] border border-gray-100 p-3">
                    <div className="w-[100px] h-[100px] rounded-[12px] bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 py-1">
                      <div className="h-3 w-14 bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-4">
            <div className="bg-white rounded-[18px] border border-gray-100 p-5">
              <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-start gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="h-3 w-full bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-12 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
