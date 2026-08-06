import { createClient, type SanityClient } from 'next-sanity';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

// No Studio project configured yet — createClient() throws on an empty projectId, which
// would break the build. Fall back to a stub that resolves to nothing instead, so pages
// render their static fallback content until NEXT_PUBLIC_SANITY_PROJECT_ID is set.
const stubClient = {
  fetch: async () => null,
  config: () => ({ projectId: undefined, dataset }),
} as unknown as SanityClient;

export const sanityClient: SanityClient = projectId
  ? createClient({ projectId, dataset, apiVersion: '2026-01-01', useCdn: false })
  : stubClient;
