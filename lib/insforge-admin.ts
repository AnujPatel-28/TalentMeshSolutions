import { createClient } from '@insforge/sdk';

// Ensure this code is not accidentally imported into a client component bundle
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: lib/insforge-admin.ts cannot be imported on the client. It exposes the service role key.');
}

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceKey = process.env.INSFORGE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('CRITICAL ERROR: Missing environment variable NEXT_PUBLIC_INSFORGE_URL');
}

// Admin client containing the service key, capable of bypassing Row Level Security
// If the service key is missing, we export a proxy that throws only when used,
// OR we export null and handle it in consumers. 
// Given the use case, we'll export the client only if the key exists.
export const insforgeAdmin = serviceKey 
  ? createClient({
      baseUrl: supabaseUrl,
      anonKey: serviceKey, // Passing the service key as the auth header token
    })
  : null;

if (!serviceKey && typeof window === 'undefined') {
  console.warn('⚠️ WARNING: Missing environment variable INSFORGE_SERVICE_KEY. Admin operations will fail.');
}
