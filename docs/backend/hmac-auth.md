# HMAC Auth for /ai/* (SEC.2)

Updated: 2025-09-11

Overview
- Mobile client calls Flask `/ai/*` with API Key + HMAC headers. Prevents tampering, allows ±clock skew, and blocks replays.

Headers
- `X-Api-Key`: issued client key (env: `AI_API_KEY`)
- `X-Timestamp`: epoch seconds (tolerance: `AI_REQUEST_TOLERANCE_SEC`, default 300)
- `X-Nonce`: unique value per request (replay prevention)
- `X-Signature`: hex of HMAC-SHA256 over canonical string using `AI_API_SECRET`

Canonical String
```
METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + NONCE + "\n" + SHA256(body)
```

Server Behavior
- Rejects missing headers, invalid key, out-of-window timestamps, and nonce replays.
- Computes signature over canonical JSON (when body is JSON) or raw bytes; accepts either to avoid trivial formatting drift.
- Applies a per-minute in-memory rate limit (`AI_RATE_LIMIT_PER_MIN`, default 30) and returns 429 with `X-RateLimit-*` headers.

Client Examples (TypeScript / React Native)
```ts
// docs/mobile/hmac_signing.ts (example)
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'

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
  const bodyHash = hex(sha256(new TextEncoder().encode(raw)))
  const canon = [method.toUpperCase(), path, String(nowSec), nonce, bodyHash].join('\n')
  const sig = hmac(sha256, new TextEncoder().encode(apiSecret), new TextEncoder().encode(canon))
  return {
    'X-Api-Key': apiKey,
    'X-Timestamp': String(nowSec),
    'X-Nonce': nonce,
    'X-Signature': hex(sig),
    'Content-Type': 'application/json',
  }
}
```

Client Example (Python)
```py
import time, json, hmac, hashlib

def build_headers(method: str, path: str, body: dict, api_key: str, api_secret: str):
    ts = int(time.time())
    nonce = f"n-{time.time_ns()}"
    raw = json.dumps(body).encode()
    bh = hashlib.sha256(raw).hexdigest()
    canon = "\n".join([method.upper(), path, str(ts), nonce, bh]).encode()
    sig = hmac.new(api_secret.encode(), canon, hashlib.sha256).hexdigest()
    return {
        'X-Api-Key': api_key,
        'X-Timestamp': str(ts),
        'X-Nonce': nonce,
        'X-Signature': sig,
        'Content-Type': 'application/json',
    }
```

Operational Notes
- Secrets are provided via environment or secret manager: `AI_API_KEY`, `AI_API_SECRET`.
- Use a stronger nonce store (e.g., Redis with TTL) in production; in-memory in this repo is sufficient for unit/integration tests.
- Adjust tolerance and rate limit per deployment stage.

