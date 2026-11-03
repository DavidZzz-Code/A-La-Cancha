import test from 'node:test';
import assert from 'node:assert/strict';
import { readAuthConfig } from './config.ts';
test('sin configuración conserva la demo local', () => assert.equal(readAuthConfig(), null));
test('rechaza configuración parcial y claves privadas', () => {
  assert.throws(() => readAuthConfig('https://example.supabase.co'));
  for (const key of ['sb_secret_private', 'eyJhbGciOiJIUzI1NiJ9.legacy.token']) assert.throws(() => readAuthConfig('https://example.supabase.co', key));
});
test('solo admite origen HTTPS y clave publicable', () => {
  for (const url of ['http://example.supabase.co', 'https://user:pass@example.supabase.co', 'https://example.supabase.co/path', 'https://example.supabase.co?key=x']) assert.throws(() => readAuthConfig(url, 'sb_publishable_test'));
  assert.deepEqual(readAuthConfig('https://example.supabase.co/', 'sb_publishable_test'), { url:'https://example.supabase.co', key:'sb_publishable_test' });
});
