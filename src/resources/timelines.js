const { HASHTAG_ORDERS, assertNonEmpty } = require('../../lib/utils');

function createTimelinesResource({ config, request, userPath }) {
  async function getTimeline({ maxResults, cursor } = {}) {
    return request(`${config.apiPath}/timeline`, { query: { max_results: maxResults, cursor } });
  }

  async function getMyPosts({ maxResults, cursor } = {}) {
    return request(`${config.apiPath}/users/me/posts`, { query: { max_results: maxResults, cursor } });
  }

  async function getUserPosts(idOrUsername, { maxResults, cursor } = {}) {
    return request(`${userPath(idOrUsername)}/posts`, { query: { max_results: maxResults, cursor } });
  }

  async function getMyMentions({ maxResults, cursor } = {}) {
    return request(`${config.apiPath}/users/me/mentions`, { query: { max_results: maxResults, cursor } });
  }

  async function getUserMentions(idOrUsername, { maxResults, cursor } = {}) {
    return request(`${userPath(idOrUsername)}/mentions`, { query: { max_results: maxResults, cursor } });
  }

  async function getHashtagPosts({ tag, order = 'date', maxResults, cursor } = {}) {
    assertNonEmpty(tag, 'tag');
    if (!HASHTAG_ORDERS.has(order)) throw new Error(`order must be one of: ${Array.from(HASHTAG_ORDERS).join(', ')}`);
    return request(`${config.apiPath}/hashtags`, { query: { tag, order, max_results: maxResults, cursor } });
  }

  return { getTimeline, getMyPosts, getUserPosts, getMyMentions, getUserMentions, getHashtagPosts };
}

module.exports = { createTimelinesResource };
