'use client';
import Image, { type ImageProps, type ImageLoaderProps } from 'next/image';

// Sanity already provides resizing, format negotiation and a global image CDN.
// A custom loader retains Next's responsive srcset without double optimization.
function sanityLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  url.searchParams.set('w', String(width));
  url.searchParams.set('q', String(quality || 80));
  url.searchParams.set('auto', 'format');
  return url.toString();
}
export default function BlogImage(props: ImageProps) {
  return <Image {...props} loader={sanityLoader} />;
}
