import { describe, expect, test } from 'bun:test';
import createClient from '../index.js';

const API_KEY = process.env.API_KEY;
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const USERNAME = process.env.TEST_USERNAME || 'me';
const HASHTAG = process.env.TEST_HASHTAG || 'javascript';

describe('BoodiBox read APIs against local server', () => {
  if (!API_KEY || process.env.TEST_INTEGRATION !== 'true') {
    test('skipped', () => {
      console.log('Read API integration tests skipped. Set API_KEY and TEST_INTEGRATION=true.');
      expect(true).toBe(true);
    });
    return;
  }

  const client = createClient({ baseUrl: BASE, apiKey: API_KEY });

  test('timeline, own posts, user posts, hashtag posts, blocks, and mutes', async () => {
    await expect(client.getTimeline({ maxResults: 5 })).resolves.toBeDefined();
    await expect(client.getMyPosts({ maxResults: 5 })).resolves.toBeDefined();
    await expect(client.getUserPosts(USERNAME, { maxResults: 5 })).resolves.toBeDefined();
    await expect(client.getHashtagPosts({ tag: HASHTAG, order: 'date', maxResults: 5 })).resolves.toBeDefined();
    await expect(client.getBlocks({ maxResults: 5 })).resolves.toBeDefined();
    await expect(client.getMutes({ maxResults: 5 })).resolves.toBeDefined();
  }, { timeout: 120000 });
});
