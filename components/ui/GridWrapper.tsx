import React from 'react';

export default function GridWrapper({ children }: { children: React.ReactNode }) {
  return (
    // `dither-gutter` is currently inert — its CSS is parked (commented out) in
    // app/globals.css. Left in place, along with the z-index/bg-white layering
    // below, so re-enabling the gutter texture is a one-block uncomment there.
    <div className="dither-gutter relative w-full bg-white">
      {/* Main centered container for both grid lines AND content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl bg-white md:border-x md:border-gray-200">
        {/* overflow-x-clip, not overflow-hidden: `hidden` makes this a scroll
            container, which silently kills `position: sticky` on the section
            markers inside. `clip` contains the same horizontal bleed without
            creating one. */}
        <div className="relative z-20 w-full overflow-x-clip">
          {children}
        </div>
      </div>
    </div>
  );
}
