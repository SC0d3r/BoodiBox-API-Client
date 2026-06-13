const { BoodiBoxAPIError } = require('../lib/errors');
const { assertNonEmpty, ensureFormDataSupport } = require('../lib/utils');
const { createRequest } = require('./request');
const { createUploadsResource } = require('./resources/uploads');
const { createPostsResource } = require('./resources/posts');
const { createTimelinesResource } = require('./resources/timelines');
const { createUsersResource } = require('./resources/users');

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

  ensureFormDataSupport();

  const requestTools = createRequest(config);
  const userPath = idOrUsername => `${config.apiPath}/users/${encodeURIComponent(assertNonEmpty(idOrUsername, 'idOrUsername'))}`;
  const uploads = createUploadsResource({ config, ...requestTools });
  const posts = createPostsResource({ config, request: requestTools.request, uploads });
  const timelines = createTimelinesResource({ config, request: requestTools.request, userPath });
  const users = createUsersResource({ config, request: requestTools.request, userPath });

  return {
    ...uploads,
    ...posts,
    ...timelines,
    ...users,
    request: requestTools.request,
    _raw: { config }
  };
}

createClient.BoodiBoxAPIError = BoodiBoxAPIError;
createClient.DEFAULTS = DEFAULTS;

module.exports = createClient;
