const { fetchWithTimeout } = require('./lib/http');
const { BoodiBoxAPIError, parseResponseBody } = require('./lib/errors');
const {
  FOLLOW_TYPES,
  HASHTAG_ORDERS,
  appendQuery,
  assertNonEmpty,
  buildFilePart,
  ensureFormDataSupport,
  normalizeApiKey,
  retryAsync,
  validateQuotePostID,
  validateReplyPermission,
  wait
} = require('./lib/utils');

const DEFAULTS = {
  baseUrl: process.env.BASE_URL || 'https://boodibox.com',
  uploadPath: '/api/v1/uploads',
  apiPath: '/api/v1',
  postsPath: '/api/v1/posts',
  pollIntervalMs: 1000,
  pollTimeoutMs: 30000,
  requestTimeoutMs: 15000,
  maxRetries: 3
};

function createClient(opts = {}) {
  const config = { ...DEFAULTS, ...opts };
  if (!config.apiKey) throw new Error('apiKey is required to create BoodiBox client');
  const authHeader = normalizeApiKey(config.apiKey);

  ensureFormDataSupport();

  function urlFor(pathname, query) {
    const url = new URL(pathname, config.baseUrl);
    return appendQuery(url, query).toString();
  }

  async function request(pathname, { method = 'GET', query, body, headers, timeoutMs } = {}) {
    const url = urlFor(pathname, query);
    const finalHeaders = {
      Authorization: authHeader,
      Accept: 'application/json',
      ...(headers || {})
    };

    const options = { method, headers: finalHeaders };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }

    const resp = await fetchWithTimeout(url, options, timeoutMs ?? config.requestTimeoutMs);
    const parsed = await parseResponseBody(resp);

    if (!resp.ok || parsed?.success === false) {
      const reason = parsed?.reason || resp.statusText || 'request_failed';
      throw new BoodiBoxAPIError(`${method} ${pathname} failed: ${reason}`, {
        status: resp.status,
        statusText: resp.statusText,
        body: parsed,
        reason,
        url,
        method
      });
    }

    return parsed;
  }

  async function uploadFiles(files = []) {
    if (!Array.isArray(files) || files.length === 0) throw new Error('files must be a non-empty array');
    const form = new FormData();
    for (const f of files) {
      const part = buildFilePart(f);
      if (part.file) {
        form.append('files', part.file, part.filename);
      } else if (typeof File !== 'undefined') {
        form.append('files', new File([part.bytes], part.filename, { type: part.contentType }));
      } else {
        form.append('files', new Blob([part.bytes], { type: part.contentType }), part.filename);
      }
    }

    const url = urlFor(config.uploadPath);
    const resp = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { Authorization: authHeader, Accept: 'application/json' },
      body: form
    }, 60000);
    const parsed = await parseResponseBody(resp);
    if (!resp.ok || parsed?.success === false) {
      const reason = parsed?.reason || resp.statusText || 'upload_failed';
      throw new BoodiBoxAPIError(`Upload failed: ${reason}`, {
        status: resp.status,
        statusText: resp.statusText,
        body: parsed,
        reason,
        url,
        method: 'POST'
      });
    }
    return parsed?.uploads || [];
  }

  async function getUploadStatus(uploadId) {
    assertNonEmpty(uploadId, 'uploadId');
    try {
      return await request(`${config.uploadPath}/${encodeURIComponent(uploadId)}`);
    } catch (err) {
      if (err.status === 404) return { missing: true };
      throw err;
    }
  }

  async function pollUntilProcessed(uploadId, options = {}) {
    const interval = options.intervalMs ?? config.pollIntervalMs;
    const timeoutMs = options.timeoutMs ?? config.pollTimeoutMs;
    const start = Date.now();

    while (true) {
      const statusObj = await getUploadStatus(uploadId);
      if (statusObj.status === 'PROCESSED') return statusObj;
      if (statusObj.status === 'DELETED' || statusObj.status === 'ATTACHED') return statusObj;
      if (Date.now() - start > timeoutMs) {
        const e = new Error('polling timeout waiting for processed');
        e.uploadStatus = statusObj;
        throw e;
      }
      await wait(interval);
    }
  }

  async function pollManyUntilProcessed(uploadIds = [], options = {}) {
    if (!Array.isArray(uploadIds) || uploadIds.length === 0) return {};
    const results = await Promise.all(uploadIds.map(id => pollUntilProcessed(id, options).then(s => ({ id, s }))));
    return Object.fromEntries(results.map(r => [r.id, r.s]));
  }

  async function submitPost({ body = '', medias = [], replyPermission = undefined, quotePostID = null, userIP = null } = {}) {
    const rp = replyPermission === undefined ? 'PUBLIC' : validateReplyPermission(replyPermission);
    const qid = quotePostID == null ? null : validateQuotePostID(quotePostID);
    const bodyStr = (body == null ? '' : String(body)).trim();
    if (!bodyStr && (!Array.isArray(medias) || medias.length === 0)) {
      throw new Error('Post must include a non-empty body or at least one media.');
    }
    const payload = { body, medias, replyPermission: rp, quotePostID: qid };
    if (userIP) payload.userIP = userIP;
    return request(config.postsPath, { method: 'POST', body: payload, timeoutMs: 20000 });
  }

  async function submitPostWithFiles({ body = '', files = [], replyPermission = undefined, quotePostID = null, pollOptions = {}, timeoutMs = 120000 } = {}) {
    const bodyStr = (body == null ? '' : String(body)).trim();
    if ((!Array.isArray(files) || files.length === 0) && !bodyStr) {
      throw new Error('Post must include a non-empty body or at least one file to upload.');
    }
    if (replyPermission !== undefined) validateReplyPermission(replyPermission);
    if (quotePostID != null) validateQuotePostID(quotePostID);
    if (!Array.isArray(files) || files.length === 0) return submitPost({ body, medias: [], replyPermission, quotePostID });

    const uploads = await retryAsync(() => uploadFiles(files), config.maxRetries, 300);
    const start = Date.now();
    const finalSrcs = [];
    for (const uploadId of uploads) {
      const remainingTime = timeoutMs - (Date.now() - start);
      if (remainingTime <= 0) throw new Error('Timeout while waiting for files to be processed');
      const statusObj = await pollUntilProcessed(uploadId, {
        intervalMs: pollOptions.intervalMs,
        timeoutMs: Math.min(remainingTime, pollOptions.timeoutMs ?? config.pollTimeoutMs)
      });
      if (statusObj.status !== 'PROCESSED') {
        const e = new Error(`Upload ${uploadId} terminal state: ${statusObj.status}`);
        e.statusObj = statusObj;
        throw e;
      }
      if (!statusObj.src) {
        const e = new Error(`Upload ${uploadId} processed but no src returned`);
        e.statusObj = statusObj;
        throw e;
      }
      finalSrcs.push(statusObj.src);
    }
    return submitPost({ body, medias: finalSrcs, replyPermission, quotePostID });
  }

  const postPath = postId => `${config.postsPath}/${encodeURIComponent(assertNonEmpty(postId, 'postId'))}`;
  const userPath = idOrUsername => `${config.apiPath}/users/${encodeURIComponent(assertNonEmpty(idOrUsername, 'idOrUsername'))}`;

  async function getPost(postId) { return request(postPath(postId)); }
  async function deletePost(postId) { return request(postPath(postId), { method: 'DELETE' }); }
  async function likePost(postId) { return request(`${postPath(postId)}/like`, { method: 'POST' }); }
  async function unlikePost(postId) { return request(`${postPath(postId)}/like`, { method: 'DELETE' }); }
  async function repostPost(postId) { return request(`${postPath(postId)}/repost`, { method: 'POST' }); }
  async function undoRepost(postId) { return request(`${postPath(postId)}/repost`, { method: 'DELETE' }); }
  async function replyToPost(postId, { body = '', medias = [] } = {}) {
    if (!(body == null ? '' : String(body)).trim() && (!Array.isArray(medias) || medias.length === 0)) {
      throw new Error('Reply must include a non-empty body or at least one media.');
    }
    return request(`${postPath(postId)}/reply`, { method: 'POST', body: { body, medias }, timeoutMs: 20000 });
  }
  async function getPostContext(postId) { return request(`${postPath(postId)}/context`); }

  async function getTimeline({ maxResults, cursor } = {}) {
    return request(`${config.apiPath}/timeline`, { query: { max_results: maxResults, cursor } });
  }
  async function getMyPosts({ maxResults, cursor } = {}) {
    return request(`${config.apiPath}/users/me/posts`, { query: { max_results: maxResults, cursor } });
  }
  async function getUserPosts(idOrUsername, { maxResults, cursor } = {}) {
    return request(`${userPath(idOrUsername)}/posts`, { query: { max_results: maxResults, cursor } });
  }
  async function getHashtagPosts({ tag, order = 'date', maxResults, cursor } = {}) {
    assertNonEmpty(tag, 'tag');
    if (!HASHTAG_ORDERS.has(order)) throw new Error(`order must be one of: ${Array.from(HASHTAG_ORDERS).join(', ')}`);
    return request(`${config.apiPath}/hashtags`, { query: { tag, order, max_results: maxResults, cursor } });
  }

  async function getUser(idOrUsername) { return request(userPath(idOrUsername)); }
  async function getFollows(idOrUsername, { type = 'followers', maxResults, cursor } = {}) {
    if (!FOLLOW_TYPES.has(type)) throw new Error('type must be "followers" or "following"');
    return request(`${userPath(idOrUsername)}/follows`, { query: { type, max_results: maxResults, cursor } });
  }
  async function followUser(idOrUsername) { return request(`${userPath(idOrUsername)}/follows`, { method: 'POST' }); }
  async function unfollowUser(idOrUsername) { return request(`${userPath(idOrUsername)}/follows`, { method: 'DELETE' }); }
  async function getBlocks({ maxResults, cursor } = {}) {
    return request(`${config.apiPath}/users/me/blocks`, { query: { max_results: maxResults, cursor } });
  }
  async function blockUser(idOrUsername) { return request(`${userPath(idOrUsername)}/blocks`, { method: 'POST' }); }
  async function unblockUser(idOrUsername) { return request(`${userPath(idOrUsername)}/blocks`, { method: 'DELETE' }); }
  async function getMutes({ maxResults, cursor } = {}) {
    return request(`${config.apiPath}/me/mutes`, { query: { max_results: maxResults, cursor } });
  }

  return {
    uploadFiles,
    getUploadStatus,
    pollUntilProcessed,
    pollManyUntilProcessed,
    submitPost,
    submitPostWithFiles,
    getPost,
    deletePost,
    likePost,
    unlikePost,
    repostPost,
    undoRepost,
    replyToPost,
    getPostContext,
    getTimeline,
    getMyPosts,
    getUserPosts,
    getHashtagPosts,
    getUser,
    getFollows,
    followUser,
    unfollowUser,
    getBlocks,
    blockUser,
    unblockUser,
    getMutes,
    request,
    _raw: { config }
  };
}

createClient.BoodiBoxAPIError = BoodiBoxAPIError;
module.exports = createClient;
