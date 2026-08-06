// Reserve-before-work idempotency (R-2, fixes D-20). The old pattern checked the key,
// did the work, then saved — two racing requests both passed the check and both executed.
// New protocol, atomic on the `idempotency_keys` primary key:
//   1. beginIdempotency: INSERT { key, status: 0 } — status 0 marks "in flight".
//      - insert wins  → we own the key; proceed with the work.
//      - PK conflict  → someone else owns it: status 0 → 409 in_flight (caller retries);
//                       status > 0 → replay the stored response.
//   2. completeIdempotency: after the work, UPDATE with the final status + response body.
//   3. releaseIdempotency: on a thrown error, delete the reservation so a retry can run.
// Replay stores the full body in `response_body` (requires the ALTER TABLE in the R-2 SQL
// note — until it is applied, completeIdempotency degrades to hash-only, as before).

import { json, errorJson } from './errors.ts';

type IdempotencyRow = {
  key: string;
  status: number;
  response_hash: string;
  response_ref: string | null;
  response_body?: unknown;
};

export async function beginIdempotency(
  db: any,
  key: string | null,
  headers: Record<string, string>,
): Promise<{ replay: Response | null }> {
  if (!key) return { replay: null };

  const { error: insertError } = await db.database
    .from('idempotency_keys')
    .insert([{ key, status: 0, response_hash: '' }]);

  if (!insertError) return { replay: null }; // reservation won — caller does the work

  const { data } = await db.database
    .from('idempotency_keys')
    .select('*')
    .eq('key', key)
    .single();
  const row = data as IdempotencyRow | null;

  if (!row || row.status === 0) {
    // Another request holds the reservation and has not finished.
    return { replay: errorJson('in_flight', 'A request with this idempotency key is still processing', 409, headers) };
  }

  if (row.response_body !== undefined && row.response_body !== null) {
    return { replay: json(row.response_body, row.status, headers) };
  }
  // Row written before response_body existed — legacy replay shape.
  return {
    replay: json(
      { success: true, idempotent: true, response_hash: row.response_hash, response_ref: row.response_ref },
      row.status,
      headers,
    ),
  };
}

export async function completeIdempotency(db: any, key: string | null, status: number, payload: unknown): Promise<void> {
  if (!key) return;
  const bodyText = JSON.stringify(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bodyText));
  const responseHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { error } = await db.database
    .from('idempotency_keys')
    .update({ status, response_hash: responseHash, response_body: payload })
    .eq('key', key);
  if (error) {
    // Most likely the response_body column is not applied yet — keep the old hash-only record.
    const { error: fallbackError } = await db.database
      .from('idempotency_keys')
      .update({ status, response_hash: responseHash })
      .eq('key', key);
    if (fallbackError) console.error('[idempotency] complete failed:', fallbackError);
  }
}

export async function releaseIdempotency(db: any, key: string | null): Promise<void> {
  if (!key) return;
  const { error } = await db.database.from('idempotency_keys').delete().eq('key', key);
  if (error) console.error('[idempotency] release failed:', error);
}
