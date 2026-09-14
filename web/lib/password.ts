import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";

function derive(value: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => nodeScrypt(value, salt, 64, (error, key) => error ? reject(error) : resolve(key)));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
