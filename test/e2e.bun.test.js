// test/e2e.bun.test.js
import { describe, test, expect } from 'bun:test';
import createClient from '../index.js';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.API_KEY;
const BASE = process.env.BASE_URL || 'http://localhost:3000';

describe('BoodiBox client integration (conditional)', () => {
  if (!API_KEY || process.env.TEST_INTEGRATION !== 'true') {
    test('skipped', () => {
      console.log('Integration tests skipped. Set API_KEY and TEST_INTEGRATION=true to run.');
      expect(true).toBe(true);
    });
    return;
  }

  const client = createClient({ baseUrl: BASE, apiKey: API_KEY });

  test('upload -> poll -> submit post (integration)', async () => {
    const tiny = path.join(process.cwd(), 'test', 'assets', 'tiny.jpg');
    if (!fs.existsSync(tiny)) throw new Error('test/assets/tiny.jpg missing');

    // Submit with default PUBLIC replyPermission
    const result = await client.submitPostWithFiles({
      body: 'bun integration test ' + Date.now(),
      files: [{ path: tiny }],
      pollOptions: { intervalMs: 1000, timeoutMs: 60000 },
      timeoutMs: 90000
    });

    expect(result).toBeDefined();
    if (result.success !== undefined) expect(result.success).toBeTruthy();
  }, { timeout: 120000 });
});
