const fs = require('node:fs');
const path = require('node:path');

const CUID2_REGEX = /^[a-z][a-z0-9]{23,31}$/i;
const REPLY_PERMISSIONS = new Set(['PRIVATE', 'PUBLIC', 'EVERYONE']);
const HASHTAG_ORDERS = new Set(['date', 'likes', 'views', 'activity']);
const FOLLOW_TYPES = new Set(['followers', 'following']);

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function normalizeApiKey(raw) {
  if (!raw) return null;
  if (raw.startsWith('Bearer ')) return raw;
  return `Bearer ${raw}`;
}

function ensureFormDataSupport() {
  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('Global FormData/Blob not available. Run in Node >=18 or provide a polyfill (e.g. formdata-node).');
  }
}

function validateReplyPermission(rp) {
  if (rp === undefined) return undefined;
  if (rp === null || (typeof rp === 'string' && rp.trim() === '') || !rp) {
    throw new Error('replyPermission cannot be empty. Use "PUBLIC", "PRIVATE", or "EVERYONE".');
  }
  const up = String(rp).toUpperCase();
  if (!REPLY_PERMISSIONS.has(up)) {
    throw new Error(`replyPermission must be one of: ${Array.from(REPLY_PERMISSIONS).join(', ')}`);
  }
  return up;
}

function validateQuotePostID(id) {
  if (id == null) return null;
  const s = String(id).trim();
  if (!CUID2_REGEX.test(s)) {
    throw new Error('quotePostID must be a valid CUID v2-style id (letter + lowercase alphanumeric, length ~24-32).');
  }
  return s.toLowerCase();
}

function assertNonEmpty(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${name} is required`);
  }
  return String(value).trim();
}

function appendQuery(url, params = {}) {
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

function buildFilePart(f) {
  if (f.path) {
    const filename = f.filename || path.basename(f.path);
    const buffer = fs.readFileSync(f.path);
    const contentType = f.contentType || guessContentTypeFromFilename(filename) || 'application/octet-stream';
    return { bytes: buffer, filename, contentType };
  }
  if (f.buffer) {
    const filename = f.filename || 'file';
    const contentType = f.contentType || guessContentTypeFromFilename(filename) || 'application/octet-stream';
    return { bytes: f.buffer, filename, contentType };
  }
  if (f.file) return { file: f.file, filename: f.file.name || 'file' };
  throw new Error('each file must contain either path, buffer, or file');
}

function guessContentTypeFromFilename(name) {
  if (!name) return null;
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  return null;
}

async function retryAsync(fn, retries = 3, backoffMs = 200) {
  let i = 0;
  while (true) {
    try { return await fn(); } catch (e) {
      i++;
      if (i > retries) throw e;
      await wait(backoffMs * i);
    }
  }
}

module.exports = {
  HASHTAG_ORDERS,
  FOLLOW_TYPES,
  appendQuery,
  assertNonEmpty,
  buildFilePart,
  ensureFormDataSupport,
  guessContentTypeFromFilename,
  normalizeApiKey,
  retryAsync,
  validateQuotePostID,
  validateReplyPermission,
  wait
};
