// Edge-runtime compatible (Web Crypto API only — no Buffer, no Node crypto)

export const SESSION_COOKIE = 'awl-admin-session';
const TTL_MS = 60 * 60 * 1000; // 1 hour

interface TokenPayload {
  user: string;
  exp: number;
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromb64url(str: string): ArrayBuffer {
  const pad = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = pad + '='.repeat((4 - (pad.length % 4)) % 4);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signSession(username: string): Promise<string> {
  const payload: TokenPayload = { user: username, exp: Date.now() + TTL_MS };
  const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${b64url(sig)}`;
}

export async function verifySession(token: string): Promise<{ valid: boolean; username?: string }> {
  try {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return { valid: false };
    const payloadB64 = token.slice(0, dot);
    const sigB64 = token.slice(dot + 1);

    const key = await hmacKey();
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromb64url(sigB64),
      new TextEncoder().encode(payloadB64),
    );
    if (!valid) return { valid: false };

    const payload: TokenPayload = JSON.parse(
      new TextDecoder().decode(fromb64url(payloadB64)),
    );
    if (payload.exp < Date.now()) return { valid: false };

    return { valid: true, username: payload.user };
  } catch {
    return { valid: false };
  }
}

export async function requireAdmin(request: Request): Promise<string> {
  const token = parseCookie(request.headers.get('cookie') ?? '', SESSION_COOKIE);
  if (!token) throw unauthorized();
  const result = await verifySession(token);
  if (!result.valid || !result.username) throw unauthorized();
  return result.username;
}

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k.trim() === name) return v.join('=');
  }
  return null;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
