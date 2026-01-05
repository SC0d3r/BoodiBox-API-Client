/**
 * index.js
 * BoodiBox API client (minimal, no deps)
 *
 * Changes:
 *  - replyPermission defaults to "PUBLIC" when omitted
 *  - explicitly empty or falsey replyPermission values are rejected
 *  - other behavior unchanged (upload -> poll -> submit)
 */

const fs = require('node:fs');
const path = require('node:path');
const { fetchWithTimeout } = require('./lib/http');

const DEFAULTS = {
  baseUrl: process.env.BASE_URL || 'https://boodibox.com',
  uploadPath: '/api/v1/uploads',
  postsPath: '/api/v1/posts',
  pollIntervalMs: 1000,
  pollTimeoutMs: 30000,
  maxRetries: 3
};

// Practical CUID v2-ish regex: starts with a letter, lowercase alnum, length 24..32
const CUID2_REGEX = /^[a-z][a-z0-9]{23,31}$/i;
const REPLY_PERMISSIONS = new Set(['PRIVATE', 'PUBLIC']);

function ensureFormDataSupport() {
  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('Global FormData/Blob not available. Run in Node >=18 or provide a polyfill (e.g. formdata-node).');
  }
}

function normalizeApiKey(raw) {
  if (!raw) return null;
  if (raw.startsWith('Bearer ')) return raw;
  return `Bearer ${raw}`;
}

/**
 * Validate replyPermission:
 *  - If rp is undefined -> caller should handle defaulting (we default to PUBLIC upstream)
 *  - If rp is explicitly provided but falsey ('' / null / 0 / false) -> reject
 *  - Otherwise normalize and ensure it is PUBLIC or PRIVATE
 */
function validateReplyPermission(rp) {
  if (rp === undefined) return; // caller handles default
  if (rp === null || (typeof rp === 'string' && rp.trim() === '') || !rp) {
    throw new Error('replyPermission cannot be empty. Use "PUBLIC" or "PRIVATE".');
  }
  const up = String(rp).toUpperCase();
  if (!REPLY_PERMISSIONS.has(up)) {
    throw new Error(`replyPermission must be one of: ${Array.from(REPLY_PERMISSIONS).join(', ')}`);
  }
  return up;
}

function validateQuotePostID(id) {
  if (id == null) return;
  const s = String(id).trim();
  if (!CUID2_REGEX.test(s)) {
    throw new Error('quotePostID must be a valid CUID v2-style id (letter + lowercase alphanumeric, length ~24-32).');
  }
  return s.toLowerCase();
}

function createClient(opts = {}) {
  const config = { ...DEFAULTS, ...opts };
  if (!config.apiKey) throw new Error('apiKey is required to create BoodiBox client');
  const authHeader = normalizeApiKey(config.apiKey);

  ensureFormDataSupport();

  async function _doFetch(url, options = {}, timeoutMs = 15000) {
    const headers = Object.assign({}, options.headers || {}, {
      Authorization: authHeader,
      Accept: 'application/json'
    });
    return fetchWithTimeout(url, { ...options, headers }, timeoutMs);
  }

  /**
   * uploadFiles
   * Accepts files array items:
   * - { path }
   * - { buffer, filename?, contentType? }
   * - { file } (File)
   *
   * Uses File when available (Bun/browser) to ensure filename is sent correctly.
   */
  async function uploadFiles(files = []) {
    if (!Array.isArray(files) || files.length === 0) throw new Error('files must be a non-empty array');
    const url = new URL(config.uploadPath, config.baseUrl).toString();

    const form = new FormData();
    for (const f of files) {
      if (f.path) {
        const filename = f.filename || path.basename(f.path);
        const buffer = fs.readFileSync(f.path);
        const contentType = f.contentType || guessContentTypeFromFilename(filename) || 'application/octet-stream';

        if (typeof File !== 'undefined') {
          const fileObj = new File([buffer], filename, { type: contentType });
          form.append('files', fileObj);
        } else {
          const blob = new Blob([buffer], { type: contentType });
          form.append('files', blob, filename);
        }
      } else if (f.buffer) {
        const filename = f.filename || 'file';
        const contentType = f.contentType || guessContentTypeFromFilename(filename) || 'application/octet-stream';
        if (typeof File !== 'undefined') {
          const fileObj = new File([f.buffer], filename, { type: contentType });
          form.append('files', fileObj);
        } else {
          const blob = new Blob([f.buffer], { type: contentType });
          form.append('files', blob, filename);
        }
      } else if (f.file) {
        form.append('files', f.file, f.file.name || 'file');
      } else {
        throw new Error('each file must contain either path, buffer, or file');
      }
    }

    const resp = await _doFetch(url, { method: 'POST', body: form }, 60000);
    if (!resp.ok) {
      const body = await safeParseJSON(resp);
      const reason = body?.reason || `${resp.status} ${resp.statusText}`;
      const e = new Error(`Upload failed: ${reason}`);
      e.status = resp.status;
      e.body = body;
      throw e;
    }
    const json = await resp.json();
    if (!json.success) {
      const e = new Error('upload endpoint returned success=false');
      e.body = json;
      throw e;
    }
    return json.uploads || [];
  }

  async function getUploadStatus(uploadId) {
    const url = new URL(`${config.uploadPath}/${encodeURIComponent(uploadId)}`, config.baseUrl).toString();
    const resp = await _doFetch(url, { method: 'GET' }, 15000);
    if (resp.status === 404) return { missing: true };
    if (!resp.ok) {
      const body = await safeParseJSON(resp);
      const e = new Error('Failed to fetch upload status');
      e.status = resp.status;
      e.body = body;
      throw e;
    }
    return resp.json();
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
    const tasks = uploadIds.map(id => pollUntilProcessed(id, options).then(s => ({ id, s })));
    const results = await Promise.all(tasks);
    const map = {};
    for (const r of results) map[r.id] = r.s;
    return map;
  }

  /**
   * submitPost
   * replyPermission: if undefined -> defaults to PUBLIC
   * if explicitly provided but empty/falsey -> throws
   */
  async function submitPost({ body = '', medias = [], replyPermission = undefined, quotePostID = null, userIP = null }) {
    // Handle replyPermission defaulting and validation
    let rp;
    if (replyPermission === undefined) {
      rp = 'PUBLIC';
    } else {
      // explicit value provided -> validate it (reject empty)
      rp = validateReplyPermission(replyPermission);
    }

    const qid = quotePostID == null ? null : validateQuotePostID(quotePostID);

    const url = new URL(config.postsPath, config.baseUrl).toString();
    const payload = { body, medias, replyPermission: rp, quotePostID: qid };
    if (userIP) payload.userIP = userIP;
    const resp = await _doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 20000);

    if (!resp.ok) {
      const parsed = await safeParseJSON(resp);
      const e = new Error('submit post failed');
      e.status = resp.status;
      e.body = parsed;
      throw e;
    }
    return resp.json();
  }

  /**
   * submitPostWithFiles
   * - If replyPermission undefined -> defaults to PUBLIC
   * - If replyPermission explicitly provided but empty -> throw
   */
  async function submitPostWithFiles({ body = '', files = [], replyPermission = undefined, quotePostID = null, pollOptions = {}, timeoutMs = 120000 }) {
    if (!Array.isArray(files) || files.length === 0) {
      // still require replyPermission defaulting behavior
      return submitPost({ body, medias: [], replyPermission, quotePostID });
    }

    // validate upfront: default or validate
    if (replyPermission === undefined) {
      // allow defaulting later in submitPost, but keep same normalization here
    } else {
      validateReplyPermission(replyPermission);
    }
    if (quotePostID != null) validateQuotePostID(quotePostID);

    const uploads = await retryAsync(() => uploadFiles(files), config.maxRetries, 300).catch(err => {
      throw new Error(`Uploading files failed: ${err.message}`);
    });

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

    const submitResult = await submitPost({ body, medias: finalSrcs, replyPermission, quotePostID });
    return submitResult;
  }

  return {
    uploadFiles,
    getUploadStatus,
    pollUntilProcessed,
    pollManyUntilProcessed,
    submitPost,
    submitPostWithFiles,
    _raw: { config }
  };
}

// helpers
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function safeParseJSON(resp) {
  try { return await resp.json(); } catch (e) { return null; }
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

function guessContentTypeFromFilename(name) {
  if (!name) return null;
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return null;
}

module.exports = createClient;
