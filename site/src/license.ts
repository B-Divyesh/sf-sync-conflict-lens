const SLUG = 'sync-conflict-lens';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${TOKEN_KEY}:verdict`;
const DAY = 86_400_000;

interface CachedVerdict { valid: boolean; checkedAt: number; reason: string }
interface VerifyResponse { valid: boolean; reason: string; expires_at?: string | null }

function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* The free app remains available. */ }
}

export function billingBase(): string {
  const production = location.hostname === 'sync-conflict-lens.sociobot.in';
  return production ? 'https://api.sociobot.in' : 'https://pilot-api.sociobot.in';
}

export function checkoutUrl(): string {
  return `${billingBase()}/api/v1/products/${SLUG}/checkout`;
}

export function captureReturnedLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  storageSet(TOKEN_KEY, token);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function restoreLicense(token: string): void {
  storageSet(TOKEN_KEY, token.trim());
  try { localStorage.removeItem(VERDICT_KEY); } catch { /* noop */ }
}

export function cachedLicenseState(): { token: string | null; unlocked: boolean; stale: boolean; reason?: string } {
  const token = storageGet(TOKEN_KEY);
  if (!token) return { token: null, unlocked: false, stale: true };
  try {
    const verdict = JSON.parse(storageGet(VERDICT_KEY) ?? 'null') as CachedVerdict | null;
    if (!verdict) return { token, unlocked: false, stale: true };
    return { token, unlocked: verdict.valid, stale: Date.now() - verdict.checkedAt > DAY, reason: verdict.reason };
  } catch { return { token, unlocked: false, stale: true }; }
}

export async function verifyLicense(force = false): Promise<VerifyResponse | null> {
  const cached = cachedLicenseState();
  if (!cached.token) return null;
  if (!force && !cached.stale) return { valid: cached.unlocked, reason: cached.reason ?? 'ok' };
  try {
    const response = await fetch(`${billingBase()}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(cached.token)}`, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const verdict = await response.json() as VerifyResponse;
    storageSet(VERDICT_KEY, JSON.stringify({ valid: verdict.valid, reason: verdict.reason, checkedAt: Date.now() }));
    return verdict;
  } catch { return null; }
}
