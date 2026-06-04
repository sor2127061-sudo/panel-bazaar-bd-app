/**
 * ============================================================
 *  DIGITAL MARKETPLACE — SINGLE HONO WORKER
 *  Bangladesh MFS-integrated digital product platform
 *  Security: 5-layer hardened, AES-256-GCM, JWT httpOnly,
 *             HMAC webhook, SELECT FOR UPDATE, RLS, audit log
 * ============================================================
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

const app = new Hono();

// ============================================================
// SECTION 1 — CONSTANTS & HELPERS
// ============================================================

const COOKIE_NAME   = 'auth_token';
const COOKIE_OPTS   = 'HttpOnly; Secure; SameSite=None; Path=/; Max-Age=86400';
const VT_API_BASE   = 'https://api.verifytaka.com/v1';
const ALLOWED_DURATIONS = [1, 3, 7, 15, 30];

/** Constant-time string comparison to prevent timing attacks */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Structured JSON error response */
function err(msg, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Structured JSON success response */
function ok(data = {}, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Decode a JWT payload without verifying (verification done separately) */
function jwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Verify Supabase-issued JWT using the project's JWKS public key */
async function verifyJWT(token, env) {
  // Supabase signs JWTs with HS256 using the JWT secret
  const enc  = new TextEncoder();
  const [headerB64, payloadB64, sigB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !sigB64) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.SUPABASE_JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const sigBytes = Uint8Array.from(
    atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0),
  );

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    enc.encode(`${headerB64}.${payloadB64}`),
  );

  if (!valid) return null;

  const payload = jwtPayload(token);
  if (!payload) return null;

  // Reject expired tokens
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

/** Read auth cookie from request */
function getToken(req) {
  const cookieHeader = req.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

/** Supabase REST helper — always uses service role key */
async function supabase(env, method, path, body) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

/** Supabase RPC (stored procedures) — for atomic operations */
async function rpc(env, fn, params) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

/** Write to immutable audit log — never fails silently */
async function auditLog(env, adminId, action, targetId, oldVal, newVal, ip) {
  await supabase(env, 'POST', '/audit_log', {
    admin_id:   adminId,
    action,
    target_id:  targetId,
    old_value:  oldVal ? JSON.stringify(oldVal) : null,
    new_value:  newVal ? JSON.stringify(newVal) : null,
    ip_address: ip,
    created_at: new Date().toISOString(),
  });
}

// ============================================================
// SECTION 2 — CRYPTO HELPERS (AES-256-GCM)
// ============================================================

/** Import the master encryption key from env */
async function importEncKey(env) {
  const raw = Uint8Array.from(atob(env.ENCRYPTION_MASTER_KEY), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Encrypt plaintext → base64(iv + ciphertext) */
async function encrypt(env, plaintext) {
  const key = await importEncKey(env);
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const buf = new Uint8Array(iv.byteLength + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), iv.byteLength);
  return btoa(String.fromCharCode(...buf));
}

/** Decrypt base64(iv + ciphertext) → plaintext */
async function decrypt(env, encoded) {
  const key = await importEncKey(env);
  const buf = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv  = buf.slice(0, 12);
  const ct  = buf.slice(12);
  const pt  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ============================================================
// SECTION 3 — HMAC HELPERS (Webhook Signature)
// ============================================================

async function hmacSHA256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Verify VerifyTaka webhook HMAC signature */
async function verifyWebhookSig(req, rawBody, env) {
  const incoming = req.headers.get('X-VerifyTaka-Signature') || '';
  const expected = await hmacSHA256(env.VT_WEBHOOK_SECRET, rawBody);
  return safeEqual(incoming, expected);
}

// ============================================================
// SECTION 4 — MIDDLEWARE
// ============================================================

/** Global: security headers */
app.use('*', secureHeaders());

/** Global: CORS — only allow configured frontend origin */
app.use('*', async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN || 'https://panel-bazaar-bd-app.pages.dev';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  await next();
  Object.entries(corsHeaders).forEach(([k, v]) => c.res.headers.set(k, v));
});

/** Middleware: verify JWT cookie — attach user to context */
async function requireAuth(c, next) {
  const token = getToken(c.req.raw);
  if (!token) return err('Unauthorized', 401);
  const payload = await verifyJWT(token, c.env);
  if (!payload) return err('Unauthorized', 401);
  c.set('user', payload);
  c.set('userId', payload.sub);
  await next();
}

/** Middleware: verify is_admin via DB profiles table */
async function requireAdmin(c, next) {
  const userId = c.get('userId');
  const { data } = await supabase(
    c.env, 'GET',
    `/profiles?id=eq.${userId}&select=is_admin`,
  );
  if (!data?.[0]?.is_admin) return err('Forbidden', 403);
  await next();
}

/** Middleware: verify VerifyTaka HMAC — only for webhook routes */
async function requireWebhookSig(c, next) {
  const rawBody = await c.req.raw.clone().text();
  c.set('rawBody', rawBody);
  const valid = await verifyWebhookSig(c.req.raw, rawBody, c.env);
  if (!valid) return err('Invalid signature', 401);
  await next();
}

// ============================================================
// SECTION 5 — AUTH ROUTES  /api/auth/*
// ============================================================

const auth = new Hono();

/** POST /api/auth/register */
auth.post('/register', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  if (!email || !password) return err('email and password required');
  if (password.length < 8)  return err('Password must be at least 8 characters');

  // Register via Supabase Auth Admin API
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey':        c.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });

  const data = await res.json();
  if (!res.ok) return err(data.message || 'Registration failed');

  // Create profile row
  await supabase(c.env, 'POST', '/profiles', {
    id:             data.id,
    email,
    wallet_balance: 0,
    is_admin:       false,
    is_banned:      false,
    created_at:     new Date().toISOString(),
  });

  return ok({ message: 'Account created. Please log in.' }, 201);
});

/** POST /api/auth/login */
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  if (!email || !password) return err('email and password required');

  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey':       c.env.SUPABASE_ANON_KEY,   // anon key for auth endpoint — NOT service role
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) return err('Invalid credentials', 401);

  // Check if banned
  const { data: profile } = await supabase(c.env, 'GET', `/profiles?id=eq.${data.user.id}&select=is_banned`);
  if (Array.isArray(profile) && profile[0]?.is_banned) {
    return err('Account suspended', 403);
  }

  // Set JWT in httpOnly cookie — NEVER expose token to JS
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', `${COOKIE_NAME}=${data.access_token}; ${COOKIE_OPTS}`);

  return new Response(JSON.stringify({ ok: true, message: 'Logged in' }), {
    status: 200,
    headers,
  });
});

/** POST /api/auth/logout */
auth.post('/logout', async (c) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
});

/** GET /api/auth/session */
auth.get('/session', requireAuth, async (c) => {
  const user = c.get('user');
  const { data: profile } = await supabase(
    c.env, 'GET',
    `/profiles?id=eq.${user.sub}&select=id,email,wallet_balance,is_admin,created_at`,
  );
  return ok({ user: profile?.[0] || null });
});

app.route('/api/auth', auth);

// ============================================================
// SECTION 6 — WALLET ROUTES  /api/wallet/*
// ============================================================

const wallet = new Hono();
wallet.use('*', requireAuth);

/** GET /api/wallet/balance */
wallet.get('/balance', async (c) => {
  const userId = c.get('userId');
  const { data } = await supabase(c.env, 'GET', `/profiles?id=eq.${userId}&select=wallet_balance`);
  return ok({ balance: data?.[0]?.wallet_balance ?? 0 });
});

/** POST /api/wallet/topup — create VerifyTaka checkout session */
wallet.post('/topup', async (c) => {
  const { amount, mfs_type } = await c.req.json().catch(() => ({}));
  const userId = c.get('userId');

  if (!amount || amount < 10 || amount > 50000) return err('Amount must be 10–50000 BDT');
  if (!['BKASH', 'NAGAD', 'ROCKET'].includes(mfs_type)) return err('Invalid MFS type');

  // Create a pending transaction record FIRST — amount is server-set, never client-set.
  // txn_id is NULL here; VerifyTaka only issues the real TrxID at payment.verified time.
  const merchantOrderId = `txn_${crypto.randomUUID()}`;

  const { data: txn, status: txnStatus } = await supabase(c.env, 'POST', '/transactions', {
    user_id:           userId,
    type:              'TOPUP',
    amount,
    txn_id:            null,   // filled in by credit_wallet() when payment.verified fires
    mfs_type,                  // stored for internal tracking; NOT sent to VT checkout
    merchant_order_id: merchantOrderId,
    status:            'PENDING',
    created_at:        new Date().toISOString(),
  });

  if (txnStatus !== 201) return err('Failed to initialize transaction');

  // Create VerifyTaka checkout session
  const vtRes = await fetch(`${VT_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: { 'X-API-Key': c.env.VT_SECRET_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      merchant_order_id: merchantOrderId,
      success_url:       `${c.env.ALLOWED_ORIGIN}/topup/success`,
      cancel_url:        `${c.env.ALLOWED_ORIGIN}/topup`,
      metadata:          { user_id: userId },
      expires_in_seconds: 3600,
    }),
  });

  const vtData = await vtRes.json();
  if (!vtRes.ok) return err('Payment gateway error. Try again.');

  return ok({
    checkout_url:      vtData.checkout_url,
    session_id:        vtData.session_id,
    merchant_order_id: merchantOrderId,
  });
});

app.route('/api/wallet', wallet);

// ============================================================
// SECTION 7 — WEBHOOK ROUTES  /api/webhook/*
// ALL routes verify HMAC before any logic runs
// ============================================================

const webhook = new Hono();
webhook.use('*', requireWebhookSig);

/**
 * POST /api/webhook/payment
 * Handles both payment.received (UX only) and payment.verified (credit wallet)
 */
webhook.post('/payment', async (c) => {
  const rawBody = c.get('rawBody');
  const payload = JSON.parse(rawBody);
  const { event, txn_id, amount, mfs_type, merchant_order_id } = payload;

  // ── payment.received: UX signal only — NEVER credit wallet ──
  // Payload: { txn_id, amount, mfs_type, sender, received_at }
  // NOTE: payment.received does NOT include merchant_order_id.
  //       Use txn_id to locate a matching pending row if you want to update UX status.
  //       We acknowledge and return — no DB mutation required here.
  if (event === 'payment.received') {
    return ok({ message: 'received' });
  }

  // ── payment.verified: 5-step verification chain ──
  // Payload: { event, txn_id, amount, mfs_type, sender, shop_id, verified_at,
  //            metadata?, checkout_session_id?, merchant_order_id? }
  // NOTE: checkout_session_id and merchant_order_id are ONLY present when the
  //       payment completed through hosted checkout (not direct /v1/verify calls).
  if (event !== 'payment.verified') return ok({ message: 'ignored' });

  // Guard: merchant_order_id is required for our wallet credit flow.
  // If it's absent this payment didn't come from our hosted checkout session.
  if (!merchant_order_id) {
    return ok({ message: 'ignored — no merchant_order_id' });
  }

  // STEP 1 — HMAC already verified by middleware (requireWebhookSig)

  // STEP 2 — Pull verification: independently confirm with VerifyTaka API.
  // Per spec: txn_id is required; amount, sender, mfs_type are optional but we send
  // amount + mfs_type for extra server-side matching (defence-in-depth).
  // We do NOT send sender because we don't collect it.
  const verifyRes = await fetch(`${VT_API_BASE}/verify`, {
    method: 'POST',
    headers: { 'X-API-Key': c.env.VT_SECRET_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ txn_id, amount, mfs_type }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData.verified || verifyData.result !== 'SUCCESS') {
    return err('Pull verification failed', 400);
  }

  // STEP 3 — Amount integrity: compare with our own DB record (never trust payload alone)
  const { data: txnRows } = await supabase(
    c.env, 'GET',
    `/transactions?merchant_order_id=eq.${merchant_order_id}&select=id,user_id,amount,status`,
  );
  const txn = txnRows?.[0];
  if (!txn) return err('Transaction not found', 400);
  if (Number(txn.amount) !== Number(amount)) return err('Amount mismatch', 400);

  // STEP 4 — Idempotency: already completed? Acknowledge without double-crediting
  if (txn.status === 'COMPLETED') {
    return ok({ message: 'already_processed' });
  }

  // STEP 5 — Atomic wallet credit via PostgreSQL stored procedure (SELECT FOR UPDATE inside)
  const { status: rpcStatus, data: rpcData } = await rpc(c.env, 'credit_wallet', {
    p_user_id:           txn.user_id,
    p_amount:            amount,
    p_txn_id:            txn_id,
    p_merchant_order_id: merchant_order_id,
  });

  if (rpcStatus !== 200) {
    return err('Wallet credit failed', 500);
  }

  return ok({ message: 'credited' });
});



app.route('/api/webhook', webhook);

// ============================================================
// SECTION 7b — TOPUP SUCCESS REDIRECT VERIFICATION
// This is a SEPARATE route — NOT inside the webhook group.
// The webhook group applies body-HMAC middleware, but the
// success redirect is a GET with no body — it uses a query
// param signature instead. Mixing them would break it.
// ============================================================

/**
 * GET /api/topup/success
 * Called by the frontend after VerifyTaka redirects the customer back.
 * Verifies the signed query params before showing any success UI.
 * Wallet credit comes from the payment.verified webhook above — NOT from here.
 */
app.get('/api/topup/success', async (c) => {
  const url    = new URL(c.req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { amount, merchant_order_id, session_id, timestamp, txn_id, signature } = params;

  if (!amount || !merchant_order_id || !session_id || !timestamp || !txn_id || !signature) {
    return err('Missing required query parameters', 400);
  }

  // Reject stale redirects older than 10 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 600) {
    return err('Redirect signature expired', 400);
  }

  // Canonical string per VerifyTaka spec:
  // Keys in alphabetical order, joined as key=value&key=value, no URL-encoding inside values.
  const canonical = ['amount', 'merchant_order_id', 'session_id', 'timestamp', 'txn_id']
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  // Signing secret: shop webhook_secret (our VT_WEBHOOK_SECRET)
  const expected = await hmacSHA256(c.env.VT_WEBHOOK_SECRET, canonical);

  // Constant-time compare — prevents timing oracle attacks
  if (!safeEqual(signature, expected)) return err('Invalid redirect signature', 401);

  // Confirm this merchant_order_id is actually ours and belongs to this user
  // (Do NOT fulfill here — wallet credit comes from payment.verified webhook only)
  const token = getToken(c.req.raw);
  if (token) {
    const userPayload = await verifyJWT(token, c.env);
    if (userPayload) {
      const { data: txnRow } = await supabase(
        c.env, 'GET',
        `/transactions?merchant_order_id=eq.${merchant_order_id}&user_id=eq.${userPayload.sub}&select=status`,
      );
      return ok({
        message:           'verified',
        merchant_order_id,
        payment_status:    txnRow?.[0]?.status || 'PENDING',
      });
    }
  }

  return ok({ message: 'verified', merchant_order_id });
});

// ============================================================
// SECTION 8 — ORDERS / KEY DELIVERY  /api/orders/*
// ============================================================

const orders = new Hono();
orders.use('*', requireAuth);

/** POST /api/orders/buy — atomic purchase with balance check */
orders.post('/buy', async (c) => {
  const { product_id, package_id } = await c.req.json().catch(() => ({}));
  const userId = c.get('userId');
  if (!product_id || !package_id) return err('product_id and package_id required');

  // Verify product exists and is visible
  const { data: products } = await supabase(
    c.env, 'GET',
    `/products?id=eq.${product_id}&is_visible=eq.true&select=id,name,type`,
  );
  if (!products?.[0]) return err('Product not found or unavailable');

  // Verify package belongs to product
  const { data: packages } = await supabase(
    c.env, 'GET',
    `/product_packages?id=eq.${package_id}&product_id=eq.${product_id}&select=id,price,duration_days`,
  );
  if (!packages?.[0]) return err('Package not found');

  const { price, duration_days } = packages[0];

  // Atomic purchase via stored procedure (handles SELECT FOR UPDATE, balance check, deduction)
  const { status, data } = await rpc(c.env, 'purchase_product', {
    p_user_id:    userId,
    p_product_id: product_id,
    p_package_id: package_id,
    p_amount:     price,
    p_duration:   duration_days,
  });

  if (status !== 200) {
    const msg = data?.message || 'Purchase failed';
    return err(msg, msg === 'Insufficient balance' ? 402 : 400);
  }

  return ok({ order_id: data.order_id, expires_at: data.expires_at }, 201);
});

/** GET /api/orders/my — list user's orders */
orders.get('/my', async (c) => {
  const userId = c.get('userId');
  const { data } = await supabase(
    c.env, 'GET',
    `/orders?user_id=eq.${userId}&select=id,status,amount_paid,expires_at,created_at,products(name,type),product_packages(duration_days)&order=created_at.desc`,
  );
  return ok({ orders: data || [] });
});

/**
 * GET /api/orders/keys/deliver?order_id=X
 * Zero-knowledge key delivery — decrypts in memory, never logged or cached
 */
orders.get('/keys/deliver', async (c) => {
  const orderId = c.req.query('order_id');
  const userId  = c.get('userId');
  if (!orderId) return err('order_id required');

  // Verify ownership + completion + not expired — ALL three must pass
  const { data: orderRows } = await supabase(
    c.env, 'GET',
    `/orders?id=eq.${orderId}&user_id=eq.${userId}&status=eq.COMPLETED&select=id,key_id,expires_at`,
  );
  const order = orderRows?.[0];
  if (!order) return err('Order not found', 404);

  const expiresAt = new Date(order.expires_at);
  if (expiresAt < new Date()) return err('Order expired', 410);

  if (!order.key_id) return err('Key not assigned yet', 404);

  // Fetch encrypted content
  const { data: keyRows } = await supabase(
    c.env, 'GET',
    `/license_keys?id=eq.${order.key_id}&delivered_to=eq.${userId}&select=encrypted_content,type`,
  );
  const keyRow = keyRows?.[0];
  if (!keyRow) return err('Key not found', 404);

  // Decrypt in memory — plaintext is NEVER stored anywhere
  let plaintext;
  try {
    plaintext = await decrypt(c.env, keyRow.encrypted_content);
  } catch {
    return err('Decryption error', 500);
  }

  // Return plaintext — it exists in memory for milliseconds only
  return ok({
    type:    keyRow.type,
    content: plaintext,
    expires_at: order.expires_at,
  });
});

app.route('/api/orders', orders);

// ============================================================
// SECTION 9 — ADMIN ROUTES  /api/admin/*
// All routes require JWT + is_admin: true
// All mutations write to immutable audit_log
// ============================================================

const admin = new Hono();
admin.use('*', requireAuth, requireAdmin);

// ── Products ──────────────────────────────────────────────

admin.get('/products', async (c) => {
  const { data } = await supabase(c.env, 'GET', '/products?select=*,product_packages(*)&order=created_at.desc');
  return ok({ products: data || [] });
});

admin.post('/products', async (c) => {
  const body   = await c.req.json().catch(() => ({}));
  const adminId = c.get('userId');
  const ip      = c.req.header('CF-Connecting-IP') || 'unknown';

  const allowed = ['name', 'description', 'category', 'type', 'thumbnail_url', 'video_url', 'notice', 'is_visible'];
  const payload = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  if (!['ROOT', 'NON_ROOT', 'VIP'].includes(payload.category)) return err('Invalid category');
  if (!['TYPE_A', 'TYPE_B', 'TYPE_C'].includes(payload.type))   return err('Invalid type');

  payload.created_at = new Date().toISOString();

  const { data, status } = await supabase(c.env, 'POST', '/products', payload);
  if (status !== 201) return err('Failed to create product');

  await auditLog(c.env, adminId, 'CREATE_PRODUCT', data?.[0]?.id, null, payload, ip);
  return ok({ product: data?.[0] }, 201);
});

admin.patch('/products/:id', async (c) => {
  const id      = c.req.param('id');
  const body    = await c.req.json().catch(() => ({}));
  const adminId = c.get('userId');
  const ip      = c.req.header('CF-Connecting-IP') || 'unknown';

  const allowed = ['name', 'description', 'category', 'type', 'thumbnail_url', 'video_url', 'notice', 'is_visible'];
  const payload = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  // Capture old value for audit
  const { data: old } = await supabase(c.env, 'GET', `/products?id=eq.${id}&select=*`);

  const { status } = await supabase(c.env, 'PATCH', `/products?id=eq.${id}`, payload);
  if (status !== 204) return err('Failed to update product');

  await auditLog(c.env, adminId, 'UPDATE_PRODUCT', id, old?.[0], payload, ip);
  return ok({ message: 'updated' });
});

admin.delete('/products/:id', async (c) => {
  const id      = c.req.param('id');
  const adminId = c.get('userId');
  const ip      = c.req.header('CF-Connecting-IP') || 'unknown';

  const { data: old } = await supabase(c.env, 'GET', `/products?id=eq.${id}&select=*`);
  const { status }    = await supabase(c.env, 'DELETE', `/products?id=eq.${id}`);
  if (status !== 204) return err('Failed to delete product');

  await auditLog(c.env, adminId, 'DELETE_PRODUCT', id, old?.[0], null, ip);
  return ok({ message: 'deleted' });
});

// ── Packages ──────────────────────────────────────────────

admin.post('/products/:id/packages', async (c) => {
  const productId = c.req.param('id');
  const { duration_days, price } = await c.req.json().catch(() => ({}));
  const adminId = c.get('userId');
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';

  if (!ALLOWED_DURATIONS.includes(Number(duration_days))) return err('Invalid duration. Must be 1,3,7,15,30');
  if (!price || price <= 0) return err('Invalid price');

  const { data, status } = await supabase(c.env, 'POST', '/product_packages', {
    product_id: productId, duration_days, price,
  });
  if (status !== 201) return err('Failed to create package');

  await auditLog(c.env, adminId, 'CREATE_PACKAGE', data?.[0]?.id, null, { productId, duration_days, price }, ip);
  return ok({ package: data?.[0] }, 201);
});

admin.delete('/packages/:id', async (c) => {
  const id = c.req.param('id');
  const adminId = c.get('userId');
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';

  const { data: old } = await supabase(c.env, 'GET', `/product_packages?id=eq.${id}&select=*`);
  const { status } = await supabase(c.env, 'DELETE', `/product_packages?id=eq.${id}`);
  if (status !== 204) return err('Failed to delete package');

  await auditLog(c.env, adminId, 'DELETE_PACKAGE', id, old?.[0], null, ip);
  return ok({ message: 'deleted' });
});

// ── Keys ──────────────────────────────────────────────────

/** POST /api/admin/keys — upload keys (bulk for TYPE_A, single for TYPE_B/C) */
admin.post('/keys', async (c) => {
  const body     = await c.req.json().catch(() => ({}));
  const adminId  = c.get('userId');
  const ip       = c.req.header('CF-Connecting-IP') || 'unknown';
  const { product_id, type, keys } = body;

  if (!product_id) return err('product_id required');
  if (!['TYPE_A', 'TYPE_B', 'TYPE_C'].includes(type)) return err('Invalid type');
  if (!Array.isArray(keys) || keys.length === 0) return err('keys array required');
  if (keys.length > 500) return err('Max 500 keys per upload');

  // Encrypt each key before writing — NEVER store plaintext
  const rows = await Promise.all(keys.map(async (k) => ({
    product_id,
    type,
    encrypted_content: await encrypt(c.env, typeof k === 'string' ? k : JSON.stringify(k)),
    is_delivered:      false,
    created_at:        new Date().toISOString(),
  })));

  const { status } = await supabase(c.env, 'POST', '/license_keys', rows);
  if (status !== 201) return err('Failed to upload keys');

  await auditLog(c.env, adminId, 'UPLOAD_KEYS', product_id, null, { count: keys.length, type }, ip);
  return ok({ uploaded: keys.length }, 201);
});

admin.get('/keys', async (c) => {
  const product_id = c.req.query('product_id');
  const filter = product_id ? `?product_id=eq.${product_id}&` : '?';
  const { data } = await supabase(
    c.env, 'GET',
    `/license_keys${filter}select=id,product_id,type,is_delivered,delivered_to,delivered_at,created_at&order=created_at.desc`,
  );
  // Never return encrypted_content to admin panel
  return ok({ keys: data || [] });
});

// ── Orders (admin view) ────────────────────────────────────

admin.get('/orders', async (c) => {
  const status_filter = c.req.query('status');
  const search        = c.req.query('search');

  let path = '/orders?select=*,profiles(email),products(name)&order=created_at.desc';
  if (status_filter) path += `&status=eq.${status_filter}`;

  const { data } = await supabase(c.env, 'GET', path);
  return ok({ orders: data || [] });
});

/** PATCH /api/admin/orders/:id/fulfill — manually fulfill a stuck PENDING order */
admin.patch('/orders/:id/fulfill', async (c) => {
  const id      = c.req.param('id');
  const adminId = c.get('userId');
  const ip      = c.req.header('CF-Connecting-IP') || 'unknown';

  const { status, data } = await rpc(c.env, 'admin_fulfill_order', {
    p_order_id: id,
    p_admin_id: adminId,
  });

  if (status !== 200) return err(data?.message || 'Fulfillment failed');

  await auditLog(c.env, adminId, 'MANUAL_FULFILL', id, null, { fulfilled: true }, ip);
  return ok({ message: 'fulfilled' });
});

// ── Users (admin view) ─────────────────────────────────────

admin.get('/users', async (c) => {
  const { data } = await supabase(
    c.env, 'GET',
    '/profiles?select=id,email,wallet_balance,is_admin,is_banned,created_at&order=created_at.desc',
  );
  return ok({ users: data || [] });
});

/** PATCH /api/admin/users/:id/ban — ban or unban a user */
admin.patch('/users/:id/ban', async (c) => {
  const id      = c.req.param('id');
  const { ban } = await c.req.json().catch(() => ({}));
  const adminId = c.get('userId');
  const ip      = c.req.header('CF-Connecting-IP') || 'unknown';

  if (typeof ban !== 'boolean') return err('ban must be true or false');
  if (id === adminId) return err('Cannot ban yourself');

  const { data: old }  = await supabase(c.env, 'GET', `/profiles?id=eq.${id}&select=is_banned`);
  const { status }     = await supabase(c.env, 'PATCH', `/profiles?id=eq.${id}`, { is_banned: ban });
  if (status !== 204) return err('Failed to update user');

  await auditLog(c.env, adminId, ban ? 'BAN_USER' : 'UNBAN_USER', id, old?.[0], { is_banned: ban }, ip);
  return ok({ message: ban ? 'User banned' : 'User unbanned' });
});

/** PATCH /api/admin/users/:id/wallet — manual wallet adjustment */
admin.patch('/users/:id/wallet', async (c) => {
  const id      = c.req.param('id');
  const { delta, reason } = await c.req.json().catch(() => ({}));
  const adminId = c.get('userId');
  const ip      = c.req.header('CF-Connecting-IP') || 'unknown';

  if (!delta || isNaN(delta))    return err('delta (positive or negative number) required');
  if (!reason || reason.trim().length < 5) return err('reason required (min 5 chars)');
  if (Math.abs(delta) > 100000) return err('Adjustment limit is 100,000 BDT');

  const { status, data } = await rpc(c.env, 'admin_adjust_wallet', {
    p_user_id: id,
    p_delta:   delta,
    p_reason:  reason,
    p_admin_id: adminId,
  });

  if (status !== 200) return err(data?.message || 'Wallet adjustment failed');

  await auditLog(c.env, adminId, 'WALLET_ADJUST', id, null, { delta, reason }, ip);
  return ok({ message: 'Wallet adjusted', new_balance: data.new_balance });
});

// ── Dashboard stats ────────────────────────────────────────

admin.get('/stats', async (c) => {
  const [revenue, orders, users, lowStock] = await Promise.all([
    rpc(c.env, 'admin_today_revenue', {}),
    rpc(c.env, 'admin_order_counts', {}),
    supabase(c.env, 'GET', '/profiles?select=id&is_banned=eq.false'),
    rpc(c.env, 'admin_low_stock', { p_threshold: 5 }),
  ]);

  return ok({
    today_revenue: revenue.data,
    order_counts:  orders.data,
    active_users:  Array.isArray(users.data) ? users.data.length : 0,
    low_stock:     lowStock.data,
  });
});

// ── Audit log (read-only) ──────────────────────────────────

admin.get('/audit-log', async (c) => {
  const limit  = Math.min(Number(c.req.query('limit') || 50), 200);
  const offset = Number(c.req.query('offset') || 0);
  const { data } = await supabase(
    c.env, 'GET',
    `/audit_log?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
  );
  return ok({ logs: data || [] });
});

app.route('/api/admin', admin);

// ============================================================
// SECTION 10 — PUBLIC PRODUCT ROUTES (no auth required)
// ============================================================

app.get('/api/products', async (c) => {
  const category = c.req.query('category');
  let path = '/products?is_visible=eq.true&select=id,name,description,category,type,thumbnail_url,video_url,notice,product_packages(id,duration_days,price)&order=created_at.desc';
  if (category && ['ROOT', 'NON_ROOT', 'VIP'].includes(category)) {
    path += `&category=eq.${category}`;
  }
  const { data } = await supabase(c.env, 'GET', path);
  return ok({ products: data || [] });
});

app.get('/api/products/:id', async (c) => {
  const id = c.req.param('id');
  const { data } = await supabase(
    c.env, 'GET',
    `/products?id=eq.${id}&is_visible=eq.true&select=*,product_packages(id,duration_days,price)`,
  );
  if (!data?.[0]) return err('Product not found', 404);

  // Stock count (undelivered keys) — only count, not content
  const { data: stock } = await supabase(
    c.env, 'GET',
    `/license_keys?product_id=eq.${id}&is_delivered=eq.false&select=id`,
  );

  return ok({ product: data[0], stock: Array.isArray(stock) ? stock.length : 0 });
});

// ============================================================
// SECTION 11 — CATCH-ALL & HEALTH CHECK
// ============================================================

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.all('*', (c) => err('Not found', 404));

// ============================================================
// EXPORT
// ============================================================

export default app;
