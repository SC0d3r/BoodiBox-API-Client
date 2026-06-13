const { FOLLOW_TYPES } = require('../../lib/utils');

function createUsersResource({ config, request, userPath }) {
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

  return { getUser, getFollows, followUser, unfollowUser, getBlocks, blockUser, unblockUser, getMutes };
}

module.exports = { createUsersResource };
