/** Local display names, not unique multiplayer identities. */
export function normalisePlayerName(value: string): string | null {
  if (/[\p{Cc}\p{Cf}]/u.test(value)) return null;
  const name = value.trim().replace(/\s+/gu, ' ');
  return Array.from(name).length >= 1 && Array.from(name).length <= 16 ? name : null;
}

/** Empty is the migration sentinel: ask once without discarding old progress. */
export function validSavedPlayerName(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || normalisePlayerName(value) === value);
}
