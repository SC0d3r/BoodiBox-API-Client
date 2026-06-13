# @boodibox/api-client ✨

Tiny, dependency-free Node/Bun client for the BoodiBox API. Create posts, upload media, read timelines, interact with posts, and manage user relationships from one simple package.

## Install 📦

```bash
npm install @boodibox/api-client
```

Requires Node 18+ or a runtime with `fetch`, `FormData`, and `Blob`.

## Quick start 🚀

```js
const createClient = require('@boodibox/api-client');

const client = createClient({
  apiKey: process.env.BOODIBOX_API_KEY,
  // baseUrl: 'https://boodibox.com' // optional
});

await client.submitPostWithFiles({
  body: 'Hello from the API ✨',
  files: [],
  replyPermission: 'PUBLIC'
});
```

API keys can be passed as either `ak_prefix.secret` or `Bearer ak_prefix.secret`.

## Posts 📝

```js
await client.submitPost({ body: 'hello', medias: [], replyPermission: 'PUBLIC' });
await client.submitPost({ body: 'quote', quotePostID: 'babcdefghijklmnopqrstuvw' });
await client.getPost('post_id');
await client.deletePost('post_id');

await client.likePost('post_id');
await client.unlikePost('post_id');
await client.repostPost('post_id');
await client.undoRepost('post_id');

await client.replyToPost('post_id', { body: 'reply text', medias: [] });
await client.getPostContext('post_id');
```

## Media uploads 🖼️

```js
await client.submitPostWithFiles({
  body: 'photo post',
  files: [{ path: './photo.jpg' }]
});

const uploads = await client.uploadFiles([{ path: './photo.jpg' }]);
const status = await client.pollUntilProcessed(uploads[0]);
```

Supported file inputs:

- `{ path: './file.jpg' }`
- `{ buffer, filename: 'file.jpg', contentType: 'image/jpeg' }`
- `{ file }`

## Timelines + discovery 🔎

```js
await client.getTimeline({ maxResults: 30, cursor: 'next_cursor' });
await client.getMyPosts({ maxResults: 32 });
await client.getUserPosts('alice', { maxResults: 32 });
await client.getHashtagPosts({ tag: 'javascript', order: 'activity', maxResults: 32 });
```

Hashtag `order` can be `date`, `likes`, `views`, or `activity`.

## Users + relationships 👥

```js
await client.getUser('alice');
await client.getFollows('alice', { type: 'followers' });
await client.getFollows('alice', { type: 'following' });

await client.followUser('alice');
await client.unfollowUser('alice');

await client.getBlocks();
await client.blockUser('alice');
await client.unblockUser('alice');
await client.getMutes();
```

## Pagination 📄

Read endpoints accept `maxResults` and `cursor`. The client sends them as `max_results` and `cursor`, matching the REST API.

```js
const page = await client.getTimeline({ maxResults: 30 });
const next = page.meta?.next_cursor;
```

## Errors 🧯

Failed API responses throw `BoodiBoxAPIError` with useful fields:

```js
try {
  await client.getPost('missing_post');
} catch (err) {
  console.log(err.status); // 404
  console.log(err.reason); // machine-readable reason
  console.log(err.body);   // parsed response body
}
```

Client-side validation catches empty post/reply bodies, invalid follow list types, invalid hashtag ordering, and invalid `replyPermission` values before making a request.

## Tests 🧪

```bash
bun test
```

Optional live integration test:

```bash
export API_KEY="Bearer ak_prefix.secret"
export TEST_INTEGRATION=true
export BASE_URL="http://localhost:3000"
bun test
```

## License

MIT
