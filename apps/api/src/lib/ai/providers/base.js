export class ProviderError extends Error {
  constructor(message, { status, isRateLimit = false } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.isRateLimit = isRateLimit;
  }
}

export async function safeFetch(url, fetchOptions, timeoutMs, providerName) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ProviderError(`${providerName} request timed out after ${timeoutMs}ms`, { status: 504 });
    }
    throw new ProviderError(`${providerName} network error: ${err.message}`, { status: 502 });
  } finally {
    clearTimeout(timer);
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
    } catch {
    }

    throw new ProviderError(
      `${providerName} error: ${errorMsg.slice(0, 200)}`,
      { status: res.status }
    );
  }

  return res;
}