class AiFastApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, details?: any, cause?: any }} [opts]
   */
  constructor(message, opts = {}) {
    super(message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = 'AiFastApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

const FASTAPI_AI_URL = process.env.FASTAPI_AI_URL;
const AI_INTERNAL_TOKEN = process.env.AI_INTERNAL_TOKEN;
const FASTAPI_TIMEOUT_MS = Number(process.env.FASTAPI_TIMEOUT_MS || 120000);
const NODE_ENV = process.env.NODE_ENV;

function isLocalhostUrl(value) {
  try {
    const url = new URL(value);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function getFastApiUrlConfigError() {
  if (!FASTAPI_AI_URL) {
    return 'FASTAPI_AI_URL is not configured';
  }

  try {
    new URL(FASTAPI_AI_URL);
  } catch {
    return 'FASTAPI_AI_URL is invalid. Use a full URL like https://your-fastapi-service.onrender.com';
  }

  if (NODE_ENV === 'production' && isLocalhostUrl(FASTAPI_AI_URL)) {
    return (
      'FASTAPI_AI_URL points to localhost in production. ' +
      'Set it to your deployed FastAPI service URL instead of http://localhost:8000'
    );
  }

  return null;
}

function extractReadableDetail(body) {
  if (!body) return null;
  if (typeof body === 'string') return body;
  if (typeof body?.detail === 'string') return body.detail;
  if (typeof body?.message === 'string') return body.message;
  return null;
}

function getCandidateUrls(url) {
  const candidates = [url];

  if (NODE_ENV !== 'development') {
    return candidates;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
      candidates.push(parsed.toString());
    } else if (parsed.hostname === '127.0.0.1') {
      parsed.hostname = 'localhost';
      candidates.push(parsed.toString());
    }
  } catch {
    return candidates;
  }

  return [...new Set(candidates)];
}

function assertConfigured() {
  const fastApiUrlConfigError = getFastApiUrlConfigError();
  if (fastApiUrlConfigError) {
    throw new AiFastApiError(fastApiUrlConfigError, { code: 'CONFIG' });
  }
  if (!AI_INTERNAL_TOKEN) {
    throw new AiFastApiError('AI_INTERNAL_TOKEN is not configured', { code: 'CONFIG' });
  }
}

async function fetchWithTimeout(url, options) {
  const candidateUrls = getCandidateUrls(url);
  let lastError;

  for (const candidateUrl of candidateUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FASTAPI_TIMEOUT_MS);
    try {
      const res = await fetch(candidateUrl, { ...options, signal: controller.signal });
      return res;
    } catch (err) {
      lastError = err;
      if (err?.name === 'AbortError') {
        throw new AiFastApiError(`AI service request timed out after ${FASTAPI_TIMEOUT_MS}ms`, {
          code: 'TIMEOUT',
        });
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  const localhostProdHint =
    NODE_ENV === 'production' && isLocalhostUrl(FASTAPI_AI_URL)
      ? ' This usually means FASTAPI_AI_URL still points to localhost instead of your deployed FastAPI service.'
      : '';
  throw new AiFastApiError(`AI service unreachable (${candidateUrls.join(', ')})`, {
    code: 'UNREACHABLE',
    details: {
      message: lastError?.message,
      cause: lastError?.cause,
      hint: localhostProdHint.trim() || undefined,
    },
    cause: lastError,
  });
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
  const detail = extractReadableDetail(body);
  if (res.status === 401 || res.status === 403) {
    return new AiFastApiError(
      detail || 'AI service rejected request (internal auth failed)',
      {
      status: res.status,
      code: 'AI_SERVICE_AUTH',
      details: body,
      }
    );
  }
  if (res.status === 429) {
    return new AiFastApiError(detail || 'AI service rate limit exceeded', {
      status: res.status,
      code: 'AI_SERVICE_RATE_LIMIT',
      details: body,
    });
  }
  if (res.status >= 500) {
    return new AiFastApiError(detail || 'AI service failed to process request', {
      status: res.status,
      code: 'AI_SERVICE_ERROR',
      details: body,
    });
  }
  return new AiFastApiError(detail || 'AI service request failed', {
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

async function getJson(path, { includeInternalToken = false } = {}) {
  assertConfigured();
  const url = new URL(path, FASTAPI_AI_URL).toString();
  const headers = includeInternalToken ? { 'X-AI-Internal-Token': AI_INTERNAL_TOKEN } : {};
  const res = await fetchWithTimeout(url, {
    method: 'GET',
    headers,
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
  // Avoid relying on global `File` (not available in some Node runtimes).
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  form.append('file', blob, safeName);

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
async function checkTaskStatus(taskId) {
  return await getJson(`/internal/tasks/status/${taskId}`, { includeInternalToken: true });
}

async function warmAiService() {
  return await getJson('/health');
}
module.exports = {
  AiFastApiError,
  indexPdf,
  generateFlashcards,
  generateQuiz,
  generateQa,
  checkTaskStatus,
  warmAiService,
};
