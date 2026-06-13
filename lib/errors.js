class BoodiBoxAPIError extends Error {
  constructor(message, { status = null, statusText = '', body = null, reason = null, url = null, method = null } = {}) {
    super(message);
    this.name = 'BoodiBoxAPIError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.reason = reason || body?.reason || null;
    this.url = url;
    this.method = method;
  }
}

async function parseResponseBody(resp) {
  const text = await resp.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_err) {
    return text;
  }
}

module.exports = { BoodiBoxAPIError, parseResponseBody };
