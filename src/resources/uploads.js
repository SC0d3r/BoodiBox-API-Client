const { fetchWithTimeout } = require('../../lib/http');
const { BoodiBoxAPIError, parseResponseBody } = require('../../lib/errors');
const { assertNonEmpty, buildFilePart, retryAsync, wait } = require('../../lib/utils');

function createUploadsResource({ config, request, urlFor, authHeader }) {
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

  async function uploadAndCollectSrcs(files, { pollOptions = {}, timeoutMs = 120000 } = {}) {
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

    return finalSrcs;
  }

  return { uploadFiles, getUploadStatus, pollUntilProcessed, pollManyUntilProcessed, uploadAndCollectSrcs };
}

module.exports = { createUploadsResource };
