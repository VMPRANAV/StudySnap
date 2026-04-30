class AiFastApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, details?: any }} [opts]
   */
  constructor(message, opts = {}) {
    super(message);
    this.name = 'AiFastApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

const FASTAPI_AI_URL = process.env.FASTAPI_AI_URL;
const AI_INTERNAL_TOKEN = process.env.AI_INTERNAL_TOKEN;
const FASTAPI_TIMEOUT_MS = Number(process.env.FASTAPI_TIMEOUT_MS || 120000);

function assertConfigured() {
  if (!FASTAPI_AI_URL) {
    throw new AiFastApiError('FASTAPI_AI_URL is not configured', { code: 'CONFIG' });
  }
  if (!AI_INTERNAL_TOKEN) {
    throw new AiFastApiError('AI_INTERNAL_TOKEN is not configured', { code: 'CONFIG' });
  }
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FASTAPI_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new AiFastApiError(`AI service request timed out after ${FASTAPI_TIMEOUT_MS}ms`, {
        code: 'TIMEOUT',
      });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function readErrorBody(res) {
  const contentType = res.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) return await res.json();
    return await res.text();
  } catch {
    return null;
  }
}

function mapFastApiFailure(res, body) {
  if (res.status === 401 || res.status === 403) {
    return new AiFastApiError('AI service rejected request (internal auth failed)', {
      status: res.status,
      code: 'AI_SERVICE_AUTH',
      details: body,
    });
  }
  if (res.status >= 500) {
    return new AiFastApiError('AI service failed to process request', {
      status: res.status,
      code: 'AI_SERVICE_ERROR',
      details: body,
    });
  }
  return new AiFastApiError('AI service request failed', {
    status: res.status,
    code: 'AI_SERVICE_BAD_REQUEST',
    details: body,
  });
}

async function postJson(path, payload) {
  assertConfigured();
  const url = new URL(path, FASTAPI_AI_URL).toString();
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'X-AI-Internal-Token': AI_INTERNAL_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await readErrorBody(res);
    throw mapFastApiFailure(res, body);
  }
  return await res.json();
}

async function indexPdf({ userId, fileId, pdfBuffer, filename }) {
  assertConfigured();
  const url = new URL('/internal/index', FASTAPI_AI_URL).toString();

  const form = new FormData();
  form.append('user_id', String(userId));
  form.append('file_id', String(fileId));

  const safeName = filename || fileId || 'document.pdf';
  const file = new File([pdfBuffer], safeName, { type: 'application/pdf' });
  form.append('file', file);

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'X-AI-Internal-Token': AI_INTERNAL_TOKEN,
    },
    body: form,
  });

  if (!res.ok) {
    const body = await readErrorBody(res);
    throw mapFastApiFailure(res, body);
  }

  return await res.json();
}

async function generateFlashcards({ userId, fileId, prompt }) {
  return await postJson('/internal/generate/flashcards', {
    user_id: String(userId),
    file_id: String(fileId),
    prompt,
  });
}

async function generateQuiz({ userId, fileId, prompt }) {
  return await postJson('/internal/generate/quiz', {
    user_id: String(userId),
    file_id: String(fileId),
    prompt,
  });
}

async function generateQa({ userId, fileId, prompt, marksDistribution }) {
  return await postJson('/internal/generate/qa', {
    user_id: String(userId),
    file_id: String(fileId),
    prompt,
    marksDistribution,
  });
}

module.exports = {
  AiFastApiError,
  indexPdf,
  generateFlashcards,
  generateQuiz,
  generateQa,
};
