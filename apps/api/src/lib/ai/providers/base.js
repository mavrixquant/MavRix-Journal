export class ProviderError extends Error {
  constructor(message, { status, isRateLimit = false, isAborted = false } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.isRateLimit = isRateLimit;
    this.isAborted = isAborted;
  }
}

/**
 * fetch wrapper with timeout + external abort signal.
 *
 * @param {string} url
 * @param {object} fetchOptions
 * @param {number} timeoutMs
 * @param {string} providerName
 * @param {AbortSignal} [externalSignal] — passed by the router so stop-AI can
 *                                        cancel the in-flight provider fetch.
 */
export async function safeFetch(url, fetchOptions, timeoutMs, providerName, externalSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      throw new ProviderError(`${providerName} request aborted`, {
        status: 499,
        isAborted: true,
      });
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  let res;
  try {
    res = await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw new ProviderError(`${providerName} request aborted`, {
          status: 499,
          isAborted: true,
        });
      }
      throw new ProviderError(
        `${providerName} request timed out after ${timeoutMs}ms`,
        { status: 504 }
      );
    }
    throw new ProviderError(`${providerName} network error: ${err.message}`, {
      status: 502,
    });
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }

  if (res.status === 429) {
    throw new ProviderError(`${providerName} rate limit reached`, {
      status: 429,
      isRateLimit: true,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let errorMsg = text;
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed?.error?.message || parsed?.error?.status || parsed?.message || text;
    } catch {}
    throw new ProviderError(
      `${providerName} error: ${errorMsg.slice(0, 200)}`,
      { status: res.status }
    );
  }

  return res;
}