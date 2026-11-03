/**
 * Concurrency Limiter & Request Queue for Google Drive Image Loading
 * 
 * Prevents browser connection congestion, network socket exhaustion,
 * and Google Drive CDN 429 (Too Many Requests) rate limits by capping
 * concurrent image network requests to a safe threshold (default: 4).
 */

class ImageQueue {
  constructor(maxConcurrent = 4) {
    this.maxConcurrent = maxConcurrent;
    this.activeCount = 0;
    this.queue = [];
  }

  /**
   * Get active and pending queue count
   */
  get stats() {
    return {
      active: this.activeCount,
      pending: this.queue.length,
    };
  }

  /**
   * Enqueue an image load request with concurrency gating
   * @param {string} url - Image URL to pre-verify and load
   * @param {Object} options
   * @param {AbortSignal} [options.signal] - Optional AbortSignal for cancellation
   * @param {number} [options.timeoutMs=15000] - Timeout in milliseconds
   * @returns {Promise<HTMLImageElement>}
   */
  enqueue(url, options = {}) {
    const { signal, timeoutMs = 15000 } = options;

    if (signal && signal.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }

    return new Promise((resolve, reject) => {
      const task = {
        url,
        signal,
        timeoutMs,
        resolve,
        reject,
      };

      this.queue.push(task);
      this._processNext();
    });
  }

  /**
   * Process next item in the queue if capacity is available
   */
  _processNext() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    // If task was aborted while waiting in queue, skip immediately
    if (task.signal && task.signal.aborted) {
      task.reject(new DOMException('Aborted', 'AbortError'));
      this._processNext();
      return;
    }

    this.activeCount++;

    let isDone = false;
    let timerId = null;

    const cleanup = () => {
      if (timerId) clearTimeout(timerId);
      if (!isDone) {
        isDone = true;
        this.activeCount--;
        // Trigger next queued request on the next event loop tick
        setTimeout(() => this._processNext(), 0);
      }
    };

    const img = new Image();

    // Handle abort signal
    let abortListener = null;
    if (task.signal) {
      abortListener = () => {
        img.src = ''; // Cancel in-flight download
        cleanup();
        task.reject(new DOMException('Aborted', 'AbortError'));
      };
      task.signal.addEventListener('abort', abortListener, { once: true });
    }

    // Handle timeout
    if (task.timeoutMs > 0) {
      timerId = setTimeout(() => {
        if (abortListener && task.signal) {
          task.signal.removeEventListener('abort', abortListener);
        }
        img.src = '';
        cleanup();
        task.reject(new Error(`Image load timed out after ${task.timeoutMs}ms: ${task.url}`));
      }, task.timeoutMs);
    }

    img.onload = () => {
      if (timerId) clearTimeout(timerId);
      if (abortListener && task.signal) {
        task.signal.removeEventListener('abort', abortListener);
      }
      cleanup();

      // Modern asynchronous decoding to prevent main-thread UI jank
      if ('decode' in img && typeof img.decode === 'function') {
        img.decode()
          .then(() => task.resolve(img))
          .catch(() => task.resolve(img)); // Fallback if decode fails, img still loaded
      } else {
        task.resolve(img);
      }
    };

    img.onerror = (err) => {
      if (timerId) clearTimeout(timerId);
      if (abortListener && task.signal) {
        task.signal.removeEventListener('abort', abortListener);
      }
      cleanup();
      task.reject(new Error(`Failed to load image from URL: ${task.url}`));
    };

    // Trigger load
    img.crossOrigin = 'anonymous';
    img.src = task.url;
  }

  /**
   * Cancel and clear all pending queue items
   */
  clear() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        task.reject(new DOMException('Queue cleared', 'AbortError'));
      }
    }
  }
}

// Global shared image queue instance
export const imageQueue = new ImageQueue(4);

/**
 * Load an image via the concurrency queue
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageWithQueue(url, options = {}) {
  return imageQueue.enqueue(url, options);
}
