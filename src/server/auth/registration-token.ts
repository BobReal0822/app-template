import { SignJWT, jwtVerify } from 'jose';

function getRegistrationTokenSecret(): Uint8Array {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    console.error('[auth/registration-token] BETTER_AUTH_SECRET is missing');
    throw new Error('Auth configuration error');
  }
  return new TextEncoder().encode(secret);
}

const ISSUER = 'app-register';
const AUDIENCE = 'app-register-complete';
const TTL_SEC = 5 * 60;

export async function issueRegistrationToken(email: string): Promise<string> {
  const secret = getRegistrationTokenSecret();
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SEC}s`)
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export async function verifyRegistrationToken(
  token: string,
): Promise<{ email: string }> {
  const secret = getRegistrationTokenSecret();
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return { email: String(payload.email) };
}
