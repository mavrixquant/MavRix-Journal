// apps/api/src/lib/ai/providers/base.js
//
// Abstract contract every AI provider adapter must implement.
// This file defines the shape and provides shared helpers for error handling.

/**
 * A standard message shape used across all providers.
 * @typedef {object} ChatMessage
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 */

/**
 * The context object passed to `adapter.chat()`.
 * @typedef {object} ChatOptions
 * @property {string} apiKey
 * @property {string} model
 * @property {number} maxTokens
 * @property {number} timeoutMs
 */

/**
 * The standard return shape.
 * @typedef {object} ChatResult
 * @property {string} text
 * @property {string} provider
 * @property {string} model
 */

/**
 * Base class for provider errors.
 * The router uses `isRateLimit` to decide whether to try the next provider.
 */
export class ProviderError extends Error {
  constructor(message, { status, isRateLimit = false } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.isRateLimit = isRateLimit;
  }
}

/**
 * Shared fetch helper with timeout + standardised error mapping.
 *
 * @param {string} url
 * @param {object} fetchOptions
 * @param {number} timeoutMs
 * @param {string} providerName
 */
export async function safeFetch(url, fetchOptions, timeoutMs, providerName) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
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
  }

  if (res.status === 429) {
    throw new ProviderError(`${providerName} rate limit reached`, {
      status: 429,
      isRateLimit: true,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError(
      `${providerName} returned HTTP ${res.status}: ${text.slice(0, 200)}`,
      { status: res.status }
    );
  }

  return res;
}