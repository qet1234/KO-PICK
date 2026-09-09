const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
function load(file, mocks) {
  const filename = path.join(root, file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const m = new Module(filename, module);
  m.filename = filename; m.paths = module.paths;
  m.require = (name) => name in mocks ? mocks[name] : require(name);
  m._compile(code, filename);
  return m.exports;
}
(async () => {
  const storage = new Map();
  const calls = [];
  const session = { user: { id: 'fixture-user', app_metadata: {} } };
  let startUrl;
  const auth = load('mobile/src/lib/auth.ts', {
    'expo-auth-session': { makeRedirectUri: () => 'kopick://auth/callback' },
    'expo-web-browser': { maybeCompleteAuthSession() {}, openAuthSessionAsync: url => { startUrl = url; return new Promise(() => {}); } },
    'expo-crypto': { getRandomBytes: crypto.randomBytes, CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, v) => crypto.createHash('sha256').update(v).digest('hex') },
    'expo-secure-store': { getItemAsync: async k => storage.get(k), setItemAsync: async (k,v) => storage.set(k,v), deleteItemAsync: async k => storage.delete(k) },
    '@/lib/config': { appConfig: { webUrl: 'https://koreapick.duckdns.org', isSupabaseConfigured: true } },
    '@/lib/legal': { PRIVACY_VERSION: 'fixture', TERMS_VERSION: 'fixture' },
    '@/lib/supabase': { supabase: {
      auth: {
        setSession: async () => { throw new Error('Untrusted tokens must never reach setSession'); },
        signInWithOAuth: async ({ options }) => ({ data: { url: options.redirectTo } }),
        exchangeCodeForSession: async code => { calls.push(['pkce', code]); return { data: { session } }; },
        verifyOtp: async input => { calls.push(['otp', input.token_hash]); return { data: { session } }; },
      }, rpc: async () => { calls.push(['consent']); return {}; },
    } },
  });
  await assert.rejects(auth.completeMobileAuthUrl('kopick://auth/callback?access_token=attack&refresh_token=attack'));
  await assert.rejects(auth.completeMobileAuthUrl('kopick://auth/callback?token_hash=attack'));
  await assert.rejects(auth.completeMobileAuthUrl('kopick://auth/callback?code=attack&auth_state=attack'));
  assert.equal(calls.length, 0);
  void auth.signInWithSupabaseOAuth('google');
  await new Promise(setImmediate);
  const state = new URL(startUrl).searchParams.get('auth_state');
  await assert.rejects(auth.completeMobileAuthUrl(`https://evil.invalid/auth/mobile/callback?code=x&auth_state=${state}`));
  await assert.rejects(auth.completeMobileAuthUrl(`kopick://auth/callback?code=x&auth_state=wrong`));
  await assert.rejects(auth.completeMobileAuthUrl(`kopick://auth/callback?code=x&code=y&auth_state=${state}`));
  const url = `kopick://auth/callback?code=valid-code&auth_state=${state}`;
  await Promise.all([auth.completeMobileAuthUrl(url), auth.completeMobileAuthUrl(url)]);
  assert.equal(calls.filter(c => c[0] === 'pkce').length, 1);
  assert.equal(calls.filter(c => c[0] === 'consent').length, 1);
  await assert.rejects(auth.completeMobileAuthUrl(`kopick://auth/callback?code=replay-different-code&auth_state=${state}`));
  void auth.signInWithNaver(); await new Promise(setImmediate);
  const naverUrl = new URL(startUrl);
  const pending = JSON.parse([...storage.values()][0]);
  assert.equal(naverUrl.searchParams.get('challenge'), crypto.createHash('sha256').update(pending.verifier).digest('hex'));
  const oldFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/auth/mobile/exchange');
    assert.equal(JSON.parse(options.body).verifier, pending.verifier);
    return Response.json({ token_hash: 'verified-exchange' });
  };
  await auth.completeMobileAuthUrl(`kopick://auth/callback?mobile_code=${'a'.repeat(64)}&auth_state=${pending.state}`);
  global.fetch = oldFetch;
  assert.equal(calls.filter(c => c[0] === 'otp').length, 1);
  console.log('PASS mobile: unsolicited tokens, missing/mismatched state, foreign URL, duplicate parameters, PKCE success, concurrent callback, replay, Naver verifier binding');

  const { NextRequest } = require('next/server');
  let user = null, allowed = true;
  const inserts = [];
  const route = load('app/api/operations/events/route.ts', {
    '@/utils/admin': { createAdminClient: () => ({ from: () => ({ insert: async row => { inserts.push(row); return {}; } }) }) },
    '@/utils/security-request': {
      requestUser: async () => user,
      operationVisitorId: () => 'a0000000-0000-4000-a000-000000000001',
      consumeLimit: async () => allowed,
      boundedJson: r => r.json(),
    },
  });
  const request = id => new NextRequest('https://koreapick.duckdns.org/api/operations/events', {
    method: 'POST', body: JSON.stringify({ eventType: 'place_card_click', feature: 'places', visitorId: id }),
  });
  assert.equal((await route.POST(request('a'))).status, 401); assert.equal(inserts.length, 0);
  user = { id: 'fixture-user' };
  assert.equal((await route.POST(request('a'))).status, 204);
  assert.equal((await route.POST(request('b'))).status, 204);
  assert.equal(inserts[0].visitor_id, inserts[1].visitor_id);
  allowed = false;
  assert.equal((await route.POST(request('c'))).status, 429); assert.equal(inserts.length, 2);
  const helper = load('utils/security-request.ts', { 'server-only': {}, '@/utils/admin': {}, '@/utils/supabase/server': {} });
  assert.equal(await helper.boundedJson(new Request('https://test.invalid', { method: 'POST', body: 'x'.repeat(9000) })), null);
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-fixture-only';
  const exchange = load('utils/mobile-auth-exchange.ts', {
    'server-only': {}, '@/utils/admin': {}, '@/utils/security-request': helper,
  });
  const cookie = exchange.mobileRequestCookie('oauth-state', 'a'.repeat(64), 'b'.repeat(64));
  assert.equal(exchange.readMobileRequest(cookie, 'oauth-state').appState, 'b'.repeat(64));
  assert.equal(exchange.readMobileRequest(cookie, 'wrong-state'), null);
  assert.equal(exchange.readMobileRequest(cookie + 'x', 'oauth-state'), null);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 1_000_000;
  assert.equal(exchange.readMobileRequest(cookie, 'oauth-state'), null);
  Date.now = originalNow;
  console.log('PASS Naver server: signed request binding, tampering rejection, expiry');
  console.log('PASS telemetry: unauthenticated rejected, caller identity ignored, quota enforced, oversized body rejected');
})();
