const textEncoder = new TextEncoder();

function securitySecret(): string {
  const secret =
    process.env.PERMISSION_CACHE_SECRET ??
    process.env.CRON_SECRET ??
    process.env.APPROVAL_TOKEN_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PERMISSION_CACHE_SECRET is required in production");
    }
    return "dev-only-insecure-permission-cache-secret";
  }

  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signPayload(payload: string): Promise<string> {
  const key = await importHmacKey(securitySecret());
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function verifySignedPayload(
  payload: string,
  signature: string,
): Promise<boolean> {
  try {
    const key = await importHmacKey(securitySecret());
    return crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(fromBase64Url(signature)),
      textEncoder.encode(payload),
    );
  } catch {
    return false;
  }
}
