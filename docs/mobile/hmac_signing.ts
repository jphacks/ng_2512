// Example HMAC signing utility for React Native client
// Uses @noble/hashes to avoid Node's crypto dependency

import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'

const te = new TextEncoder()

function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function buildHmacHeaders(
  method: string,
  path: string,
  body: unknown,
  apiKey: string,
  apiSecret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): Record<string, string> {
  const nonce = `n-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const raw = body ? JSON.stringify(body) : ''
  const bodyHash = hex(sha256(te.encode(raw)))
  const canon = [method.toUpperCase(), path, String(nowSec), nonce, bodyHash].join('\n')
  const sig = hmac(sha256, te.encode(apiSecret), te.encode(canon))
  return {
    'X-Api-Key': apiKey,
    'X-Timestamp': String(nowSec),
    'X-Nonce': nonce,
    'X-Signature': hex(sig),
    'Content-Type': 'application/json',
  }
}

