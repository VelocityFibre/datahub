import axios from 'axios';
import ExcelJS from 'exceljs';
import { getAccessToken } from './auth.js';
import { ConnectionError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';

/**
 * SharePoint Client for accessing files via Microsoft Graph API
 */
export class SharePointClient {
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  /**
   * Get file content from SharePoint by URL
   */
  async getFileByUrl(sharePointUrl: string): Promise<Buffer> {
    try {
      const token = await getAccessToken();

      // Extract the sharing link and get the file
      logger.info('Fetching file from SharePoint', { url: sharePointUrl });

      // For shared links, we need to encode the URL and use the shares endpoint
      const encodedUrl = this.encodeSharePointUrl(sharePointUrl);
      const sharesEndpoint = `${this.baseUrl}/shares/${encodedUrl}/driveItem`;

      // Get file metadata
      const metadataResponse = await axios.get(sharesEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const downloadUrl = metadataResponse.data['@microsoft.graph.downloadUrl'];

      if (!downloadUrl) {
        throw new ConnectionError(
          'No download URL found for file',
          'SharePoint'
        );
      }

      // Download file content
      logger.debug('Downloading file content', { downloadUrl });
      const fileResponse = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
      });

      logger.info('File downloaded successfully from SharePoint', {
        size: fileResponse.data.length,
      });

      return Buffer.from(fileResponse.data);
    } catch (error: any) {
      logger.error('Failed to fetch file from SharePoint', {
        url: sharePointUrl,
        error: error.message,
        response: error.response?.data,
      });

      throw new ConnectionError(
        `Failed to fetch file from SharePoint: ${error.message}`,
        'SharePoint',
        { originalError: error.message }
      );
    }
  }

  /**
   * Parse Excel file from buffer
   */
  async parseExcelFile(buffer: Buffer): Promise<ExcelJS.Workbook> {
    try {
      logger.debug('Parsing Excel file');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      logger.info('Excel file parsed successfully', {
        worksheetCount: workbook.worksheets.length,
      });
      return workbook;
    } catch (error: any) {
      logger.error('Failed to parse Excel file', { error: error.message });
      throw new ConnectionError(
        `Failed to parse Excel file: ${error.message}`,
        'ExcelJS'
      );
    }
  }

  /**
   * Get Excel file and parse it
   */
  async getExcelFile(sharePointUrl: string): Promise<ExcelJS.Workbook> {
    const buffer = await this.getFileByUrl(sharePointUrl);
    return this.parseExcelFile(buffer);
  }

  /**
   * Encode SharePoint URL for Graph API
   * Format: u!<base64url-encoded-sharing-url>
   */
  private encodeSharePointUrl(url: string): string {
    // Remove query parameters for encoding
    const urlWithoutParams = url.split('?')[0];
    const base64 = Buffer.from(urlWithoutParams).toString('base64');
    // Make it URL-safe (unpadded base64url)
    const base64url = base64
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    // Add required 'u!' prefix for sharing links
    return `u!${base64url}`;
  }
}

// Export singleton instance
export const sharepointClient = new SharePointClient();
