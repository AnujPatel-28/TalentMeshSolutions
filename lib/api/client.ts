/**
 * TalentMesh API Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses internal Next.js API routes. Auth is handled by InsForge session cookies.
 */

const API_BASE = '/api';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }

  return response.json();
}
