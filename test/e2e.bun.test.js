import { describe, expect, test } from 'bun:test';
import createClient from '../index.js';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.API_KEY;
const BASE = process.env.BASE_URL || 'http://localhost:3000';

function shouldRunE2E() {
  return Boolean(API_KEY && process.env.TEST_INTEGRATION === 'true');
}

describe('BoodiBox client integration against local server', () => {
  if (!shouldRunE2E()) {
    test('skipped', () => {
      console.log('Integration tests skipped. Start the site locally, then set API_KEY and TEST_INTEGRATION=true.');
      expect(true).toBe(true);
    });
    return;
  }

  const client = createClient({ baseUrl: BASE, apiKey: API_KEY });

  test('upload -> poll -> submit post against real server', async () => {
    const tiny = path.join(process.cwd(), 'test', 'assets', 'tiny.jpg');
    if (!fs.existsSync(tiny)) throw new Error('test/assets/tiny.jpg missing');

    const result = await client.submitPostWithFiles({
      body: 'bun integration test ' + Date.now(),
      files: [{ path: tiny }],
      replyPermission: 'PUBLIC',
      pollOptions: { intervalMs: 1000, timeoutMs: 60000 },
      timeoutMs: 90000
    });

    expect(result).toBeDefined();
    if (result.success !== undefined) expect(result.success).toBeTruthy();
    expect(result.data?.id || result.data?.post?.id || result.id).toBeTruthy();
  }, { timeout: 120000 });
});
