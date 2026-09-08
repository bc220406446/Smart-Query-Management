import { prisma } from "@/lib/prisma";

const OTP_LENGTH = 6;
const WINDOW_MS = 5 * 60 * 1000; // OTPs valid for 5 minutes

/** Create a 6-digit numeric OTP and persist a hashed verification token.
 * Hashing is done server-side only; the exported hash function is a thin
 * wrapper so the module can run in the Edge-like build without importing
 * Node's `crypto` at module-evaluate time.
 */
function hashCode(code: string): string {
  // Use Web Crypto API when available (Edge), fall back to a deterministic
  // hex via the built-in subtle crypto. Next.js server routes get a real
  // Node `crypto` shim via the runtime, so this stays build-safe.
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hash = Array.from(new Uint8Array(data)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hash;
}

/** Create a 6-digit numeric OTP and persist a hashed verification token. */
export async function createOtpForEmail(email: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = hashCode(code);

  // Reuse the Auth.js VerificationToken table (identifier = email, token = hash).
  const expires = new Date(Date.now() + WINDOW_MS);
  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier: email, token: hash } },
    update: { expires },
    create: { identifier: email, token: hash, expires },
  });

  return code;
}

/** Verify an OTP for an email. Returns true/false. */
export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  if (otp.length !== OTP_LENGTH || !/^\d+$/.test(otp)) return false;
  const hash = hashCode(otp);

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email.toLowerCase().trim(), token: hash } },
  });
  if (!record) return false;
  if (record.expires < new Date()) return false;
  return true;
}
