import { describe, expect, test } from 'bun:test';
import createClient from '../index.js';

const API_KEY = process.env.API_KEY;
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TARGET_USER = process.env.TEST_TARGET_USER;

describe('BoodiBox user relationship APIs against local server', () => {
  if (!API_KEY || process.env.TEST_INTEGRATION !== 'true' || !TARGET_USER) {
    test('skipped', () => {
      console.log('User relationship integration tests skipped. Set API_KEY, TEST_INTEGRATION=true, and TEST_TARGET_USER.');
      expect(true).toBe(true);
    });
    return;
  }

  const client = createClient({ baseUrl: BASE, apiKey: API_KEY });

  test('lookup, follows, follow/unfollow, and block/unblock', async () => {
    await expect(client.getUser(TARGET_USER)).resolves.toBeDefined();
    await expect(client.getFollows(TARGET_USER, { type: 'followers', maxResults: 5 })).resolves.toBeDefined();
    await expect(client.getFollows(TARGET_USER, { type: 'following', maxResults: 5 })).resolves.toBeDefined();
    await expect(client.followUser(TARGET_USER)).resolves.toBeDefined();
    await expect(client.unfollowUser(TARGET_USER)).resolves.toBeDefined();
    await expect(client.blockUser(TARGET_USER)).resolves.toBeDefined();
    await expect(client.unblockUser(TARGET_USER)).resolves.toBeDefined();
  }, { timeout: 120000 });
});
