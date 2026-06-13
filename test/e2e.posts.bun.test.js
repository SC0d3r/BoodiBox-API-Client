import { describe, expect, test } from 'bun:test';
import createClient from '../index.js';

const API_KEY = process.env.API_KEY;
const BASE = process.env.BASE_URL || 'http://localhost:3000';

function getCreatedPostId(result) {
  return result?.data?.id || result?.data?.post?.id || result?.id;
}

describe('BoodiBox post APIs against local server', () => {
  if (!API_KEY || process.env.TEST_INTEGRATION !== 'true') {
    test('skipped', () => {
      console.log('Post API integration tests skipped. Set API_KEY and TEST_INTEGRATION=true.');
      expect(true).toBe(true);
    });
    return;
  }

  const client = createClient({ baseUrl: BASE, apiKey: API_KEY });

  test('create, read, context, interact, reply, and delete', async () => {
    const created = await client.submitPost({
      body: 'post api integration test ' + Date.now(),
      replyPermission: 'PUBLIC'
    });
    const postId = getCreatedPostId(created);
    expect(postId).toBeTruthy();

    await expect(client.getPost(postId)).resolves.toBeDefined();
    await expect(client.getPostContext(postId)).resolves.toBeDefined();
    await expect(client.likePost(postId)).resolves.toBeDefined();
    await expect(client.unlikePost(postId)).resolves.toBeDefined();
    await expect(client.repostPost(postId)).resolves.toBeDefined();
    await expect(client.undoRepost(postId)).resolves.toBeDefined();
    await expect(client.replyToPost(postId, { body: 'reply integration test', medias: [] })).resolves.toBeDefined();
    await expect(client.deletePost(postId)).resolves.toBeDefined();
  }, { timeout: 120000 });
});
