import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchGoogleDriveImages } from '../services/googleDrive';

// In-memory session cache for image metadata to prevent redundant API fetches
const sessionImageCache = new Map();

const DIRECT_FOLDER_ID = '1YbjvGdh5z9mNZNe5GsEgL9ISk567AO_9';

/**
 * Custom hook to fetch and paginate real images from Google Drive API v3
 * @param {string} accessToken - OAuth access token
 */
export function useGoogleDriveImages(accessToken, customFolderId = null) {
  const folderId = customFolderId || import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || DIRECT_FOLDER_ID;
  
  const [images, setImages] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Keep track of active requests to prevent race conditions
  const activeRequestRef = useRef(0);

  const fetchImages = useCallback(async (isInitial = true, tokenToUse = null) => {
    const requestId = ++activeRequestRef.current;
    
    // Check in-memory metadata cache for initial page load
    const cacheKey = `${folderId}_initial`;
    if (isInitial && sessionImageCache.has(cacheKey) && !tokenToUse) {
      const cached = sessionImageCache.get(cacheKey);
      setImages(cached.files);
      setNextPageToken(cached.nextPageToken);
      setLoading(false);
      return;
    }

    if (isInitial) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await fetchGoogleDriveImages(folderId, accessToken, tokenToUse, 24);

      if (requestId !== activeRequestRef.current) return;

      // Filter out files without valid ID or usable source
      const validFiles = (result.files || []).filter(
        (f) => f && f.id && (f.thumbnailLink || f.previewLink || f.fullResLink)
      );

      if (isInitial) {
        setImages(validFiles);
        sessionImageCache.set(cacheKey, { ...result, files: validFiles });
      } else {
        setImages((prev) => {
          // Avoid duplicate files
          const existingIds = new Set(prev.map((f) => f.id));
          const newFiles = validFiles.filter((f) => !existingIds.has(f.id));
          return [...prev, ...newFiles];
        });
      }

      setNextPageToken(result.nextPageToken);
      setError(null);
    } catch (err) {
      if (requestId !== activeRequestRef.current) return;
      console.error('Failed to load gallery images:', err);
      setError(err.message || 'Unable to connect to Google Drive. Please verify your folder ID and access permissions.');
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [folderId, accessToken]);

  // Initial load
  useEffect(() => {
    fetchImages(true, null);
  }, [fetchImages]);

  // Load next page with strict duplicate guard
  const loadMore = useCallback(() => {
    if (loading || loadingMore || !nextPageToken) {
      return;
    }
    fetchImages(false, nextPageToken);
  }, [loading, loadingMore, nextPageToken, fetchImages]);

  // Force refresh and clear cache
  const refresh = useCallback(() => {
    sessionImageCache.delete(`${folderId}_initial`);
    fetchImages(true, null);
  }, [folderId, fetchImages]);

  return {
    images,
    loading,
    loadingMore,
    hasMore: Boolean(nextPageToken),
    error,
    folderId,
    loadMore,
    refresh,
  };
}
