import { insforgeAdmin } from '../insforge-admin';
import crypto from 'crypto';

export interface Subscriber {
  id: string;
  email: string;
  status: 'pending' | 'confirmed' | 'unsubscribed';
  source: string;
  interests: string[] | null;
  confirmation_token_hash: string | null;
  confirmation_token_expires_at: string | null;
  confirmation_email_sent_at: string | null;
  confirmed_at: string | null;
  unsubscribe_token: string;
  last_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
  user_agent: string | null;
}

function getAdminClient() {
  if (!insforgeAdmin) {
    throw new Error('Database service key is not configured.');
  }
  return insforgeAdmin;
}

/**
 * Normalizes email by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Finds a subscriber by email.
 */
export async function findSubscriberByEmail(email: string): Promise<Subscriber | null> {
  const db = getAdminClient();
  const normalized = normalizeEmail(email);

  const { data, error } = await db.database
    .from('newsletter_subscribers')
    .select('*')
    .eq('email', normalized)
    .maybeSingle();

  if (error) {
    console.error(`[Newsletter DB] Error finding subscriber by email ${normalized}:`, error.message);
    throw error;
  }

  return data as Subscriber | null;
}

/**
 * Creates or updates a subscriber in the pending state.
 */
export async function createOrUpdatePendingSubscriber(params: {
  email: string;
  confirmationTokenHash: string;
  confirmationTokenExpiresAt: Date;
  unsubscribeToken: string;
  source: string;
  userAgent?: string | null;
}): Promise<Subscriber> {
  const db = getAdminClient();
  const normalized = normalizeEmail(params.email);
  const nowStr = new Date().toISOString();

  // Check if subscriber already exists
  const existing = await findSubscriberByEmail(normalized);

  if (existing) {
    // If they are already confirmed, we don't downgrade their status to pending.
    // We just return the existing record (business logic handles this).
    if (existing.status === 'confirmed') {
      return existing;
    }

    // Otherwise (pending or unsubscribed), we refresh their confirmation details and set status back to pending.
    const { data, error } = await db.database
      .from('newsletter_subscribers')
      .update({
        status: 'pending',
        confirmation_token_hash: params.confirmationTokenHash,
        confirmation_token_expires_at: params.confirmationTokenExpiresAt.toISOString(),
        confirmation_email_sent_at: nowStr,
        source: params.source,
        user_agent: params.userAgent || existing.user_agent,
        updated_at: nowStr,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[Newsletter DB] Error updating pending subscriber:', error.message);
      throw error;
    }
    return data as Subscriber;
  }

  // Create new subscriber
  const { data, error } = await db.database
    .from('newsletter_subscribers')
    .insert([{
      email: normalized,
      status: 'pending',
      source: params.source,
      confirmation_token_hash: params.confirmationTokenHash,
      confirmation_token_expires_at: params.confirmationTokenExpiresAt.toISOString(),
      confirmation_email_sent_at: nowStr,
      unsubscribe_token: params.unsubscribeToken,
      user_agent: params.userAgent || null,
      created_at: nowStr,
      updated_at: nowStr,
    }])
    .select()
    .single();

  if (error) {
    console.error('[Newsletter DB] Error inserting subscriber:', error.message);
    throw error;
  }

  return data as Subscriber;
}

/**
 * Activates a subscriber by token hash if it is not expired.
 * Returns the updated subscriber, or null if token is expired/invalid.
 */
export async function activateSubscriber(tokenHash: string): Promise<Subscriber | null> {
  const db = getAdminClient();
  const now = new Date();

  // Find the subscriber
  const { data: subscriber, error: findError } = await db.database
    .from('newsletter_subscribers')
    .select('*')
    .eq('confirmation_token_hash', tokenHash)
    .maybeSingle();

  if (findError || !subscriber) {
    return null;
  }

  // Check expiration
  if (subscriber.confirmation_token_expires_at) {
    const expiresAt = new Date(subscriber.confirmation_token_expires_at);
    if (expiresAt < now) {
      console.log(`[Newsletter DB] Token expired for subscriber ${subscriber.email}`);
      return null;
    }
  }

  // Update subscriber status to confirmed
  const { data, error: updateError } = await db.database
    .from('newsletter_subscribers')
    .update({
      status: 'confirmed',
      confirmed_at: now.toISOString(),
      confirmation_token_hash: null, // Clear token hash
      confirmation_token_expires_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', subscriber.id)
    .select()
    .single();

  if (updateError) {
    console.error('[Newsletter DB] Error activating subscriber:', updateError.message);
    throw updateError;
  }

  return data as Subscriber;
}

/**
 * Unsubscribes a user by unsubscribe token.
 * Returns true if successful, false if not found.
 */
export async function unsubscribeByToken(unsubscribeToken: string): Promise<boolean> {
  const db = getAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await db.database
    .from('newsletter_subscribers')
    .update({
      status: 'unsubscribed',
      updated_at: now,
    })
    .eq('unsubscribe_token', unsubscribeToken)
    .select();

  if (error) {
    console.error('[Newsletter DB] Error unsubscribing by token:', error.message);
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}

/**
 * Updates confirmation token and resends confirmation email details in DB.
 */
export async function updateConfirmationToken(email: string, params: {
  confirmationTokenHash: string;
  confirmationTokenExpiresAt: Date;
}): Promise<Subscriber | null> {
  const db = getAdminClient();
  const normalized = normalizeEmail(email);
  const nowStr = new Date().toISOString();

  const { data, error } = await db.database
    .from('newsletter_subscribers')
    .update({
      confirmation_token_hash: params.confirmationTokenHash,
      confirmation_token_expires_at: params.confirmationTokenExpiresAt.toISOString(),
      confirmation_email_sent_at: nowStr,
      updated_at: nowStr,
    })
    .eq('email', normalized)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[Newsletter DB] Error updating confirmation token:', error.message);
    throw error;
  }

  return data as Subscriber | null;
}

/**
 * Database-backed rate limiter by IP address (SHA-256 hashed for privacy).
 * Limits to 5 subscription requests per IP per hour.
 * Returns true if allowed, false if rate limited.
 */
export async function checkIpRateLimit(ipAddress: string): Promise<boolean> {
  const db = getAdminClient();
  const ipHash = crypto.createHash('sha256').update(ipAddress).digest('hex');
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { data: limit, error } = await db.database
    .from('newsletter_rate_limits')
    .select('*')
    .eq('ip_hash', ipHash)
    .maybeSingle();

  if (error) {
    console.error('[Newsletter DB] Error checking rate limit:', error.message);
    return true; // Fail-open to avoid locking out legitimate users on DB issues
  }

  if (!limit) {
    // Insert new rate limit window
    await db.database.from('newsletter_rate_limits').insert([{
      ip_hash: ipHash,
      request_count: 1,
      window_start: now.toISOString(),
    }]);
    return true;
  }

  const windowStart = new Date(limit.window_start);

  if (windowStart < oneHourAgo) {
    // Window expired, reset window and count
    await db.database
      .from('newsletter_rate_limits')
      .update({
        request_count: 1,
        window_start: now.toISOString(),
      })
      .eq('ip_hash', ipHash);
    return true;
  }

  if (limit.request_count >= 5) {
    console.warn(`[Newsletter DB] IP rate limit exceeded for hash ${ipHash}`);
    return false;
  }

  // Increment request count
  await db.database
    .from('newsletter_rate_limits')
    .update({
      request_count: limit.request_count + 1,
    })
    .eq('ip_hash', ipHash);

  return true;
}
