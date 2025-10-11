import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";

export type HmacConfig = {
  apiKey: string;
  apiSecret: string;
};

export type HmacOptions = {
  timestamp?: number;
  nonce?: string;
};

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const buildNonce = (): string => `rn-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const buildHmacHeaders = (
  method: string,
  path: string,
  body: unknown,
  { apiKey, apiSecret }: HmacConfig,
  options: HmacOptions = {}
): Record<string, string> => {
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const nonce = options.nonce ?? buildNonce();
  const rawBody = body != null ? JSON.stringify(body) : "";

  const bodyHash = toHex(sha256(encoder.encode(rawBody)));
  const canonical = encoder.encode([method.toUpperCase(), path, String(timestamp), nonce, bodyHash].join("\n"));
  const signature = toHex(hmac(sha256, encoder.encode(apiSecret), canonical));

  return {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey,
    "X-Timestamp": String(timestamp),
    "X-Nonce": nonce,
    "X-Signature": signature
  };
};

export default buildHmacHeaders;
