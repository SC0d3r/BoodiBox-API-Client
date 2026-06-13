import { afterEach, describe, expect, test } from 'bun:test';
import createClient from '../index.js';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.API_KEY;
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const realFetch = globalThis.fetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function installMockFetch() {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(String(url));
    const method = options.method || 'GET';
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    calls.push({ url: String(url), parsed, method, headers: options.headers, body });

    if (parsed.pathname === '/api/v1/uploads' && method === 'POST') {
      return jsonResponse({ success: true, uploads: ['upload_1'] });
    }
    if (parsed.pathname === '/api/v1/uploads/upload_1' && method === 'GET') {
      return jsonResponse({ success: true, status: 'PROCESSED', src: 'https://cdn.test/tiny.jpg' });
    }
    if (parsed.pathname === '/api/v1/posts' && method === 'POST') {
      return jsonResponse({ success: true, data: { id: 'post_1', ...body }, meta: { quota_cost: 1 } });
    }
    if (parsed.pathname === '/api/v1/posts/post_1' && method === 'GET') {
      return jsonResponse({ success: true, data: { id: 'post_1', body: 'hello' } });
    }
    if (parsed.pathname === '/api/v1/posts/post_1' && method === 'DELETE') {
      return jsonResponse({ success: true, data: { id: 'post_1', isDeleted: true } });
    }
    if (parsed.pathname === '/api/v1/posts/post_1/like') {
      return jsonResponse({ success: true, data: { id: 'post_1', liked: method === 'POST' } });
    }
    if (parsed.pathname === '/api/v1/posts/post_1/repost') {
      return jsonResponse({ success: true, data: { id: 'post_1', reposted: method === 'POST' } });
    }
    if (parsed.pathname === '/api/v1/posts/post_1/reply' && method === 'POST') {
      return jsonResponse({ success: true, data: { id: 'reply_1', parentPostID: 'post_1', ...body } });
    }
    if (parsed.pathname === '/api/v1/posts/post_1/context' && method === 'GET') {
      return jsonResponse({ success: true, data: { posts: [{ id: 'post_1' }] } });
    }
    if (parsed.pathname === '/api/v1/timeline' && method === 'GET') {
      return jsonResponse({ success: true, data: { posts: [] }, meta: { next_cursor: null } });
    }
    if (parsed.pathname === '/api/v1/users/me/posts' && method === 'GET') {
      return jsonResponse({ success: true, data: { posts: [] }, meta: { next_cursor: null } });
    }
    if (parsed.pathname === '/api/v1/users/alice/posts' && method === 'GET') {
      return jsonResponse({ success: true, data: { posts: [] }, meta: { next_cursor: null } });
    }
    if (parsed.pathname === '/api/v1/hashtags' && method === 'GET') {
      return jsonResponse({ success: true, data: { posts: [] }, meta: { next_cursor: null } });
    }
    if (parsed.pathname === '/api/v1/users/alice' && method === 'GET') {
      return jsonResponse({ success: true, data: { username: 'alice' } });
    }
    if (parsed.pathname === '/api/v1/users/alice/follows') {
      return jsonResponse({ success: true, data: method === 'GET' ? { users: [] } : { username: 'alice' } });
    }
    if (parsed.pathname === '/api/v1/users/me/blocks' && method === 'GET') {
      return jsonResponse({ success: true, data: { users: [] } });
    }
    if (parsed.pathname === '/api/v1/users/alice/blocks') {
      return jsonResponse({ success: true, data: { username: 'alice' } });
    }
    if (parsed.pathname === '/api/v1/me/mutes' && method === 'GET') {
      return jsonResponse({ success: true, data: { users: [], note: 'mutes are not persisted yet' } });
    }
    if (parsed.pathname === '/api/v1/posts/missing' && method === 'GET') {
      return jsonResponse({ success: false, reason: 'post_not_found' }, 404);
    }

    return jsonResponse({ success: false, reason: `unhandled_${method}_${parsed.pathname}` }, 500);
  };
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('BoodiBox client REST surface', () => {
  test('maps all documented post, timeline, hashtag, user, follow, block, and mute endpoints', async () => {
    const calls = installMockFetch();
    const client = createClient({ baseUrl: 'https://api.test', apiKey: 'ak_test.secret' });

    await client.submitPost({ body: 'hello', replyPermission: 'PUBLIC' });
    await client.getPost('post_1');
    await client.deletePost('post_1');
    await client.likePost('post_1');
    await client.unlikePost('post_1');
    await client.repostPost('post_1');
    await client.undoRepost('post_1');
    await client.replyToPost('post_1', { body: 'reply', medias: [] });
    await client.getPostContext('post_1');
    await client.getTimeline({ maxResults: 30, cursor: 'abc' });
    await client.getMyPosts({ maxResults: 32 });
    await client.getUserPosts('alice', { cursor: 'next' });
    await client.getHashtagPosts({ tag: 'javascript', order: 'activity', maxResults: 10 });
    await client.getUser('alice');
    await client.getFollows('alice', { type: 'followers' });
    await client.getFollows('alice', { type: 'following' });
    await client.followUser('alice');
    await client.unfollowUser('alice');
    await client.getBlocks();
    await client.blockUser('alice');
    await client.unblockUser('alice');
    await client.getMutes();

    expect(calls.map(c => `${c.method} ${c.parsed.pathname}`)).toEqual([
      'POST /api/v1/posts',
      'GET /api/v1/posts/post_1',
      'DELETE /api/v1/posts/post_1',
      'POST /api/v1/posts/post_1/like',
      'DELETE /api/v1/posts/post_1/like',
      'POST /api/v1/posts/post_1/repost',
      'DELETE /api/v1/posts/post_1/repost',
      'POST /api/v1/posts/post_1/reply',
      'GET /api/v1/posts/post_1/context',
      'GET /api/v1/timeline',
      'GET /api/v1/users/me/posts',
      'GET /api/v1/users/alice/posts',
      'GET /api/v1/hashtags',
      'GET /api/v1/users/alice',
      'GET /api/v1/users/alice/follows',
      'GET /api/v1/users/alice/follows',
      'POST /api/v1/users/alice/follows',
      'DELETE /api/v1/users/alice/follows',
      'GET /api/v1/users/me/blocks',
      'POST /api/v1/users/alice/blocks',
      'DELETE /api/v1/users/alice/blocks',
      'GET /api/v1/me/mutes'
    ]);
    expect(calls[9].parsed.searchParams.get('max_results')).toBe('30');
    expect(calls[12].parsed.searchParams.get('order')).toBe('activity');
    expect(calls[0].headers.Authorization).toBe('Bearer ak_test.secret');
  });

  test('keeps upload -> poll -> submit convenience flow working', async () => {
    const calls = installMockFetch();
    const client = createClient({ baseUrl: 'https://api.test', apiKey: 'Bearer ak_test.secret' });
    const tiny = path.join(process.cwd(), 'test', 'assets', 'tiny.jpg');

    const result = await client.submitPostWithFiles({
      body: 'with file',
      files: [{ path: tiny }],
      pollOptions: { intervalMs: 1, timeoutMs: 1000 }
    });

    expect(result.success).toBe(true);
    expect(result.data.medias).toEqual(['https://cdn.test/tiny.jpg']);
    expect(calls.map(c => `${c.method} ${c.parsed.pathname}`)).toEqual([
      'POST /api/v1/uploads',
      'GET /api/v1/uploads/upload_1',
      'POST /api/v1/posts'
    ]);
  });

  test('throws structured API errors and validates client-side input', async () => {
    installMockFetch();
    const client = createClient({ baseUrl: 'https://api.test', apiKey: 'ak_test.secret' });

    await expect(client.getPost('missing')).rejects.toMatchObject({ status: 404, reason: 'post_not_found' });
    expect(() => client.getHashtagPosts({ tag: 'js', order: 'newest' })).toThrow('order must be one of');
    expect(() => client.getFollows('alice', { type: 'friends' })).toThrow('type must be "followers" or "following"');
    await expect(client.replyToPost('post_1', { body: '', medias: [] })).rejects.toThrow('Reply must include');
  });
});

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
