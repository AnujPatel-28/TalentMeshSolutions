import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import { sanityClient } from './client';

const { projectId, dataset } = sanityClient.config();

const builder = projectId && dataset ? createImageUrlBuilder({ projectId, dataset }) : null;

export function urlForImage(source: SanityImageSource) {
  return builder?.image(source) ?? null;
}
