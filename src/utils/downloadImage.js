import { downloadOriginalPhotograph } from '../services/downloadService';

/**
 * Download original-resolution photograph directly to visitor's computer
 * Retains original Google Drive file ID, format, filename, and releases memory immediately
 * @param {Object} file - File object containing id and name
 * @param {string} [accessToken] - OAuth access token
 * @returns {Promise<void>}
 */
export async function downloadImage(file, accessToken) {
  return await downloadOriginalPhotograph(file, accessToken);
}
