import crypto from 'crypto';

/**
 * Generate a random cryptographically secure hex token and its SHA-256 hash.
 */
export function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(raw);
  return { raw, hash };
}

/**
 * Return the SHA-256 hash of a raw token.
 */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
