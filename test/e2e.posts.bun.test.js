import { describe, expect, test } from 'bun:test';
import createClient from '../index.js';

const API_KEY = process.env.API_KEY;
const BASE = process.env.BASE_URL || 'http://localhost:3000';

function getCreatedPostId(result) {
  return result?.data?.id || result?.data?.post?.id || result?.id;
}

function getPosts(result) {
  return result?.data?.posts || result?.data?.replies || result?.posts || result?.replies || (Array.isArray(result?.data) ? result.data : []) || [];
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
    const reply = await client.replyToPost(postId, { body: 'reply integration test', medias: [] });
    const replyId = getCreatedPostId(reply);
    expect(replyId).toBeTruthy();

    const replies = await client.getPostReplies(postId, { order: 'newest', maxResults: 5 });
    const replyPosts = getPosts(replies);
    expect(Array.isArray(replyPosts)).toBe(true);
    expect(replyPosts.some(post => getCreatedPostId(post) === replyId || post?.parentPostID === postId)).toBe(true);

    await expect(client.deletePost(postId)).resolves.toBeDefined();
  }, { timeout: 120000 });
});
