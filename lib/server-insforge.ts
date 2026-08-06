import 'server-only';

import { createClient } from '@insforge/sdk';
import { cookies, headers } from 'next/headers';

export async function getServerInsforgeClient() {
  const cookieStore = await cookies();
  const headersList = await headers();
  // Same token lookup order as getServerUser() (lib/server-auth.ts): a request authenticated by
  // the x-access-token header passes withApi but would otherwise get a null client here.
  const token = headersList.get('x-access-token') || cookieStore.get('tm_access_token')?.value;

  if (!token) {
    return null;
  }

  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    edgeFunctionToken: token,
    isServerMode: true,
  });
}
