const { fetchWithTimeout } = require('../lib/http');
const { BoodiBoxAPIError, parseResponseBody } = require('../lib/errors');
const { appendQuery, normalizeApiKey } = require('../lib/utils');

function createRequest(config) {
  const authHeader = normalizeApiKey(config.apiKey);

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

  return { request, urlFor, authHeader };
}

module.exports = { createRequest };
