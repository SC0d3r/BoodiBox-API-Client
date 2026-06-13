const { assertNonEmpty, validateQuotePostID, validateReplyPermission } = require('../../lib/utils');

function createPostsResource({ config, request, uploads }) {
  const postPath = postId => `${config.postsPath}/${encodeURIComponent(assertNonEmpty(postId, 'postId'))}`;

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

    const medias = await uploads.uploadAndCollectSrcs(files, { pollOptions, timeoutMs });
    return submitPost({ body, medias, replyPermission, quotePostID });
  }

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

  return {
    submitPost,
    submitPostWithFiles,
    getPost,
    deletePost,
    likePost,
    unlikePost,
    repostPost,
    undoRepost,
    replyToPost,
    getPostContext
  };
}

module.exports = { createPostsResource };
