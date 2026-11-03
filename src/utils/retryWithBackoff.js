/**
 * Exponential Backoff with Full Jitter Utility
 * 
 * Implements recommended AWS/Google exponential backoff pattern:
 * delay = min(maxDelay, baseDelay * 2 ** attempt) + random(0, jitter)
 */

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an HTTP response or Error is transient and eligible for retry
 * @param {Response|Error} errorOrResponse
 * @returns {boolean}
 */
export function isTransientError(errorOrResponse) {
  if (!errorOrResponse) return false;

  // Handle Response objects
  if (errorOrResponse.status) {
    const status = errorOrResponse.status;
    // 429: Too Many Requests / Rate Limited
    // 500, 502, 503, 504: Server Errors / Bad Gateway / Unavailable / Gateway Timeout
    if (status === 429 || status >= 500) return true;
    // 408: Request Timeout
    if (status === 408) return true;
    // 400, 401, 403, 404: Permanent client/permission errors - do not retry
    return false;
  }

  // Handle Error instances (Network dropped, timeout, connection abort)
  if (errorOrResponse instanceof Error) {
    const msg = (errorOrResponse.message || '').toLowerCase();
    const name = errorOrResponse.name || '';
    if (name === 'AbortError') return false; // Intentionally aborted
    if (
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout')
    ) {
      return true;
    }
  }

  return true;
}

/**
 * Extract delay in milliseconds from 'Retry-After' header if present
 * @param {Response} response
 * @returns {number|null} delay in ms, or null if header not present/valid
 */
export function parseRetryAfterHeader(response) {
  if (!response || !response.headers) return null;
  const header = response.headers.get('Retry-After');
  if (!header) return null;

  // If header is numeric (seconds)
  const seconds = parseFloat(header);
  if (!isNaN(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 30000); // Cap at 30 seconds
  }

  // If header is an HTTP Date
  const dateMs = Date.parse(header);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? Math.min(diff, 30000) : 0;
  }

  return null;
}

/**
 * Calculate backoff delay with full jitter
 * @param {number} attempt - Current retry attempt index (0-based)
 * @param {Object} options
 * @param {number} [options.baseDelay=350] - Base delay in ms
 * @param {number} [options.maxDelay=3500] - Cap on delay in ms
 * @param {number} [options.jitterFactor=0.5] - Jitter fraction
 * @returns {number}
 */
export function calculateBackoff(attempt, options = {}) {
  const { baseDelay = 350, maxDelay = 3500, jitterFactor = 0.5 } = options;
  const exponential = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  const jitter = exponential * jitterFactor * Math.random();
  return Math.floor(exponential + jitter);
}

/**
 * Execute an async operation with automatic exponential backoff and jitter
 * @param {Function} asyncFn - Function returning a Promise
 * @param {Object} options
 * @param {number} [options.maxRetries=3]
 * @param {number} [options.baseDelay=350]
 * @param {number} [options.maxDelay=3500]
 * @param {Function} [options.shouldRetry] - Custom transient check
 * @param {Function} [options.onRetry] - Callback before waiting
 */
export async function retryWithBackoff(asyncFn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 350,
    maxDelay = 3500,
    shouldRetry = isTransientError,
    onRetry,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      const result = await asyncFn(attempt);
      return result;
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const retryAfter = error?.response ? parseRetryAfterHeader(error.response) : null;
      const delayMs = retryAfter !== null ? retryAfter : calculateBackoff(attempt, { baseDelay, maxDelay });

      if (onRetry) {
        onRetry(attempt + 1, delayMs, error);
      }

      await wait(delayMs);
      attempt++;
    }
  }
}
