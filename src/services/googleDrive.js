import { retryWithBackoff, isTransientError } from '../utils/retryWithBackoff.js';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
const fileMetadataCache = new Map();
const METADATA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Execute Drive API fetch with automatic retry on transient errors (429, 5xx, timeouts)
 */
async function fetchDriveApiWithRetry(url, options = {}) {
  return await retryWithBackoff(
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let message = errorData?.error?.message || `Google Drive API error (${response.status})`;
        
        if (response.status === 404 || errorData?.error?.errors?.[0]?.reason === 'notFound') {
          message = "Google Drive folder or photograph not found. Please ensure the resource exists and is shared.";
        } else if (response.status === 403) {
          if (message.includes('API_KEY_HTTP_REFERRER_BLOCKED') || message.includes('referer <empty>')) {
            message = "Google Cloud API Key HTTP Referrer blocked. In Google Cloud Console > Credentials > API Key, verify your website domain is allowed.";
          } else {
            message = "Access to Google Drive was denied. Please ensure the folder is shared with 'Anyone with the link' (Viewer).";
          }
        } else if (response.status === 429) {
          message = "Google Drive API rate limit reached. Retrying automatically...";
        }

        const error = new Error(message);
        error.status = response.status;
        error.code = errorData?.error?.errors?.[0]?.reason || 'API_ERROR';
        error.response = response;
        throw error;
      }
      return response;
    },
    {
      maxRetries: 3,
      baseDelay: 400,
      maxDelay: 4000,
      shouldRetry: (err) => isTransientError(err),
      onRetry: (attempt, delayMs, err) => {
        console.warn(`Drive API request retry attempt ${attempt} in ${delayMs}ms:`, err.message);
      },
    }
  );
}

/**
 * Robust Google Drive Folder ID extractor
 * Handles both plain folder IDs and full Google Drive URLs like:
 * https://drive.google.com/drive/folders/1YbjvGdh5z9mNZNe5GsEgL9ISk567AO_9?usp=sharing
 */
export function parseFolderId(rawInput) {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return trimmed.split('?')[0].replace(/\/+$/, '');
}

/**
 * Format file size into human-readable string (KB, MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  const numBytes = parseInt(bytes, 10);
  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
  return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Optimize Google Drive thumbnail resolution
 * Google Drive thumbnailLink URLs typically end with =s220. Changing to =s1000/=s2048 gets high-res previews.
 */
export function getOptimizedThumbnailUrl(thumbnailLink, size = 1000) {
  if (!thumbnailLink) return '';
  if (!thumbnailLink.includes('googleusercontent.com')) return thumbnailLink;
  if (/=s\d+/.test(thumbnailLink)) {
    return thumbnailLink.replace(/=s\d+/, `=s${size}`);
  }
  if (/=w\d+-h\d+/.test(thumbnailLink)) {
    return thumbnailLink.replace(/=w\d+-h\d+/, `=s${size}`);
  }
  return `${thumbnailLink}=s${size}`;
}

/**
 * Build prioritized fallback image URLs for Google Drive files
 * If the primary thumbnailLink fails (e.g. temporary token expired or 403/404),
 * the component will seamlessly try these alternatives in sequence.
 */
export function buildDriveImageUrls(file, size = 1000) {
  if (!file || !file.id) return [];
  const urls = [];

  // 1. Optimized Google thumbnail (if thumbnailLink was provided)
  if (file.thumbnailLink) {
    const opt = getOptimizedThumbnailUrl(file.thumbnailLink, size);
    if (opt) urls.push(opt);
    if (file.thumbnailLink !== opt) urls.push(file.thumbnailLink);
  }

  // 2. Direct uc export=view link (serves standard images directly from drive)
  urls.push(`https://drive.google.com/uc?export=view&id=${file.id}`);

  // 3. Google usercontent domain with direct file ID
  urls.push(`https://lh3.googleusercontent.com/d/${file.id}=s${size}`);

  // 4. Drive thumbnail parameter endpoint
  urls.push(`https://drive.google.com/thumbnail?id=${file.id}&sz=w${size}`);

  // 5. Alternate direct content link if provided
  if (file.webContentLink) {
    const viewable = file.webContentLink.replace('&export=download', '&export=view');
    if (!urls.includes(viewable)) urls.push(viewable);
  }

  // Deduplicate and filter out any HTML webViewLink pages
  return urls.filter((u, idx, arr) => 
    Boolean(u) && 
    typeof u === 'string' && 
    !u.includes('/view?usp=') && 
    !u.includes('/file/d/') &&
    arr.indexOf(u) === idx
  );
}

/**
 * Fetch images from a specified Google Drive folder
 * Supports both OAuth Bearer Access Token and Google Cloud API Key
 * @param {string} rawFolderId - Google Drive Folder ID or Full URL
 * @param {string|null} accessToken - Optional OAuth 2.0 Access Token
 * @param {string|null} pageToken - Pagination token
 * @param {number} pageSize - Number of items per page (default 24)
 */
export async function fetchGoogleDriveImages(rawFolderId, accessToken, pageToken = null, pageSize = 24) {
  const folderId = parseFolderId(rawFolderId || import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID);
  const apiKey = (import.meta.env.VITE_GOOGLE_API_KEY || '').trim();
  const hasValidToken = Boolean(accessToken && accessToken !== 'demo_token');
  const hasApiKey = Boolean(apiKey && !apiKey.includes('your_google_cloud_api_key'));

  if (!folderId) {
    throw new Error('Google Drive folder ID is not configured.');
  }

  if (!hasValidToken && !hasApiKey) {
    throw new Error('Google Drive credentials missing. Please configure VITE_GOOGLE_API_KEY in your environment.');
  }

  // Construct query: within folder, images only, not trashed
  const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
  
  const buildParams = (q, token) => {
    const p = new URLSearchParams({
      q,
      pageSize: pageSize.toString(),
      fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, size, trashed)',
      orderBy: 'createdTime desc',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (hasApiKey) p.append('key', apiKey);
    if (token) p.append('pageToken', token);
    return p;
  };

  const headers = { Accept: 'application/json' };
  if (hasValidToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetchDriveApiWithRetry(`${DRIVE_API_BASE}?${buildParams(query, pageToken).toString()}`, { headers });
  const data = await response.json();
  let foundFiles = data.files || [];

  // If initial load returned 0 direct files, scan subfolders
  if (foundFiles.length === 0 && !pageToken) {
    try {
      const subfoldersQuery = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const subfolderRes = await fetch(`${DRIVE_API_BASE}?${buildParams(subfoldersQuery, null).toString()}`, { headers });
      if (subfolderRes.ok) {
        const subData = await subfolderRes.json();
        const subfolderIds = (subData.files || []).map((f) => `'${f.id}' in parents`).slice(0, 10);
        
        if (subfolderIds.length > 0) {
          const combinedQuery = `(${subfolderIds.join(' or ')}) and mimeType contains 'image/' and trashed = false`;
          const subImagesRes = await fetch(`${DRIVE_API_BASE}?${buildParams(combinedQuery, null).toString()}`, { headers });
          if (subImagesRes.ok) {
            const subImagesData = await subImagesRes.json();
            if (subImagesData.files?.length > 0) {
              foundFiles = subImagesData.files;
              data.nextPageToken = subImagesData.nextPageToken;
            }
          }
        }
      }
    } catch (subErr) {
      console.warn('Subfolder scanning notice:', subErr);
    }
  }

  // Format files and prepare accessible image URLs
  const formattedFiles = foundFiles
    .filter((file) => file && file.id && !file.trashed)
    .map((file) => {
      const directViewLink = `https://drive.google.com/uc?export=view&id=${file.id}`;
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        thumbnailLink: file.thumbnailLink ? getOptimizedThumbnailUrl(file.thumbnailLink, 1000) : directViewLink,
        previewLink: file.thumbnailLink ? getOptimizedThumbnailUrl(file.thumbnailLink, 2048) : directViewLink,
        size: formatFileSize(file.size),
        rawSize: file.size,
        isGoogleDrive: true,
        rawThumbnailLink: file.thumbnailLink || null,
        webContentLink: file.webContentLink || null,
      };
    });

  return {
    files: formattedFiles,
    nextPageToken: data.nextPageToken || null,
  };
}

/**
 * Re-fetch single file metadata to refresh expired tokens/signatures
 * @param {string} fileId
 * @param {string|null} [accessToken]
 */
export async function fetchSingleFileMetadata(fileId, accessToken, forceRefresh = false) {
  if (!fileId) return null;

  // Check memory cache unless forced
  const cacheKey = `${fileId}_${accessToken || 'public'}`;
  if (!forceRefresh && fileMetadataCache.has(cacheKey)) {
    const cached = fileMetadataCache.get(cacheKey);
    if (Date.now() - cached.timestamp < METADATA_CACHE_TTL) {
      return cached.data;
    }
  }

  const apiKey = (import.meta.env.VITE_GOOGLE_API_KEY || '').trim();
  const hasValidToken = Boolean(accessToken && accessToken !== 'demo_token');
  const hasApiKey = Boolean(apiKey && !apiKey.includes('your_google_cloud_api_key'));

  const urlParams = new URLSearchParams({
    fields: 'id, name, mimeType, thumbnailLink, webContentLink, webViewLink, size, trashed',
    supportsAllDrives: 'true',
  });
  if (hasApiKey) urlParams.append('key', apiKey);

  const headers = { Accept: 'application/json' };
  if (hasValidToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetchDriveApiWithRetry(`${DRIVE_API_BASE}/${fileId}?${urlParams.toString()}`, { headers });
  const file = await response.json();
  const directViewLink = `https://drive.google.com/uc?export=view&id=${file.id}`;
  const formatted = {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    thumbnailLink: file.thumbnailLink ? getOptimizedThumbnailUrl(file.thumbnailLink, 1000) : directViewLink,
    previewLink: file.thumbnailLink ? getOptimizedThumbnailUrl(file.thumbnailLink, 2048) : directViewLink,
    size: formatFileSize(file.size),
    rawSize: file.size,
    isGoogleDrive: true,
    rawThumbnailLink: file.thumbnailLink || null,
    webContentLink: file.webContentLink || null,
  };

  fileMetadataCache.set(cacheKey, { timestamp: Date.now(), data: formatted });
  return formatted;
}

/**
 * Retrieve original file blob from Google Drive API for full-res download
 * @param {string} fileId
 * @param {string} [accessToken]
 */
export async function fetchOriginalImageBlob(fileId, accessToken) {
  const apiKey = (import.meta.env.VITE_GOOGLE_API_KEY || '').trim();
  const hasValidToken = Boolean(accessToken && accessToken !== 'demo_token');
  const hasApiKey = Boolean(apiKey && !apiKey.includes('your_google_cloud_api_key'));

  const urlParams = new URLSearchParams({
    alt: 'media',
    supportsAllDrives: 'true',
  });

  if (hasApiKey) {
    urlParams.append('key', apiKey);
  }

  const headers = {};
  if (hasValidToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetchDriveApiWithRetry(`${DRIVE_API_BASE}/${fileId}?${urlParams.toString()}`, {
    headers,
  });

  return await response.blob();
}
