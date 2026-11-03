/**
 * Wedding Gallery Image Caching Service
 * 
 * Storage-conscious caching layer using the Cache API.
 * - Progressively caches preview/thumbnail images only as visitors scroll
 * - Strict limit of preview entries (max 150) with automated LRU eviction
 * - Never stores full-resolution originals in Cache API, localStorage, or sessionStorage
 * - Completely resilient: if Cache API is unavailable, disabled, or cleared,
 *   the gallery seamlessly falls back to direct browser loading without interruption.
 */

const PREVIEW_CACHE_NAME = 'wedding-gallery-previews-v1';
const MAX_PREVIEW_ENTRIES = 150;

// In-memory set of URLs currently cached or being cached to avoid duplicate network fetches
const inFlightCacheRequests = new Map();
const cachedBlobUrlMap = new Map();

/**
 * Check if the browser supports the modern Cache API
 * @returns {boolean}
 */
export function isCacheApiSupported() {
  return typeof window !== 'undefined' && 'caches' in window;
}

/**
 * Open the dedicated gallery preview cache safely
 * @returns {Promise<Cache|null>}
 */
async function getPreviewCache() {
  if (!isCacheApiSupported()) return null;
  try {
    return await window.caches.open(PREVIEW_CACHE_NAME);
  } catch (err) {
    console.warn('Cache API open notice (using fallback):', err?.message || err);
    return null;
  }
}

/**
 * Evict oldest entries when cache exceeds MAX_PREVIEW_ENTRIES
 * @param {Cache} cache
 */
async function enforceCacheSizeLimit(cache) {
  try {
    const requests = await cache.keys();
    if (requests.length > MAX_PREVIEW_ENTRIES) {
      // Evict the oldest (first inserted) excess entries
      const excessCount = requests.length - MAX_PREVIEW_ENTRIES;
      const toDelete = requests.slice(0, excessCount);
      await Promise.all(toDelete.map((req) => cache.delete(req)));
    }
  } catch (err) {
    console.warn('Cache size limit enforcement notice:', err?.message || err);
  }
}

/**
 * Retrieve cached blob URL for a preview/thumbnail image if available
 * @param {string} url - Image preview URL
 * @returns {Promise<string|null>} - Object URL of the cached image, or null
 */
export async function getCachedPreviewUrl(url) {
  if (!url || !isCacheApiSupported()) return null;

  // Check in-memory object URL cache first for instant synchronous resolution
  if (cachedBlobUrlMap.has(url)) {
    return cachedBlobUrlMap.get(url);
  }

  try {
    const cache = await getPreviewCache();
    if (!cache) return null;

    const match = await cache.match(url);
    if (match) {
      const blob = await match.blob();
      const blobUrl = URL.createObjectURL(blob);
      cachedBlobUrlMap.set(url, blobUrl);
      return blobUrl;
    }
  } catch (err) {
    console.warn('Error reading from image preview cache:', err?.message || err);
  }

  return null;
}

/**
 * Store a preview image in the Cache API asynchronously in the background.
 * Never throws errors to callers.
 * @param {string} url - Image preview/thumbnail URL
 */
export async function cachePreviewImage(url) {
  if (!url || !isCacheApiSupported()) return;
  // Do not cache full-res download endpoints or media downloads
  if (url.includes('alt=media') || url.includes('export=download')) return;

  // Prevent duplicate concurrent requests for the same URL
  if (inFlightCacheRequests.has(url)) {
    return inFlightCacheRequests.get(url);
  }

  const promise = (async () => {
    try {
      const cache = await getPreviewCache();
      if (!cache) return;

      const existing = await cache.match(url);
      if (existing) return;

      // Fetch preview image with default caching headers
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'default',
      });

      if (response && response.ok) {
        await cache.put(url, response.clone());
        await enforceCacheSizeLimit(cache);
      }
    } catch {
      // Soft fail: Google Drive thumbnail or CORS-restricted URLs continue
      // loading seamlessly via native <img> browser cache
    } finally {
      inFlightCacheRequests.delete(url);
    }
  })();

  inFlightCacheRequests.set(url, promise);
  return promise;
}

/**
 * Clear the preview cache if requested
 */
export async function clearPreviewCache() {
  if (!isCacheApiSupported()) return false;
  try {
    // Revoke any created blob URLs to free memory
    for (const blobUrl of cachedBlobUrlMap.values()) {
      try { URL.revokeObjectURL(blobUrl); } catch {}
    }
    cachedBlobUrlMap.clear();

    return await window.caches.delete(PREVIEW_CACHE_NAME);
  } catch (err) {
    console.warn('Failed to clear preview cache:', err);
    return false;
  }
}
