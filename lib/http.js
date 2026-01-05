// lib/http.js
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return resp;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      const e = new Error(`Request timed out after ${timeoutMs}ms`);
      e.code = 'ETIMEDOUT';
      throw e;
    }
    throw err;
  }
}
module.exports = { fetchWithTimeout };
