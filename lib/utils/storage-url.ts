/**
 * Resolves a storage path/key to a browser-ready proxied URL.
 * Returns absolute URLs as-is for backward compatibility.
 */
export function getPublicStorageUrl(bucketName: string, pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '';

  // 1. Convert absolute InsForge URLs to relative browser proxy paths
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    if (insforgeUrl && pathOrUrl.startsWith(insforgeUrl)) {
      return pathOrUrl.replace(insforgeUrl, '/api/v1/remote');
    }
    return pathOrUrl;
  }

  // 2. Resolve relative path/key for browser proxy
  return `/api/v1/remote/api/storage/buckets/${bucketName}/objects/${encodeURIComponent(pathOrUrl)}`;
}

/**
 * Resolves a storage path/key to a server-side backend URL.
 * Returns absolute URLs as-is for backward compatibility.
 */
export function getServerStorageUrl(bucketName: string, pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '';

  // 1. Backward Compatibility: return absolute URLs directly
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }

  // 2. Resolve relative path/key using direct backend base URL
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || '';
  return `${baseUrl}/api/storage/buckets/${bucketName}/objects/${encodeURIComponent(pathOrUrl)}`;
}
