import { config } from 'dotenv';
import { validateEnvVars } from '../utils/validators.js';

config({ path: '.env.local' });

export const sharepointConfig = {
  clientId: process.env.SHAREPOINT_CLIENT_ID || '',
  clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || '',
  tenantId: process.env.SHAREPOINT_TENANT_ID || '',
  siteUrl: process.env.SHAREPOINT_SITE_URL || 'https://blitzfibre.sharepoint.com/sites/Velocity_Manco',
  lawleyFileUrl: process.env.SHAREPOINT_LAWLEY_FILE_URL || '',
  mohadinFileUrl: process.env.SHAREPOINT_MOHADIN_FILE_URL || 'https://blitzfibre.sharepoint.com/:x:/s/Velocity_Manco/EYm7g0w6Y1dFgGB_m4YlBxgBeVJpoDXAYjdvK-ZfgHoOqA?e=PaRb5T',
} as const;

export const validateSharePointConfig = (): void => {
  const requiredVars = [
    'SHAREPOINT_CLIENT_ID',
    'SHAREPOINT_CLIENT_SECRET',
    'SHAREPOINT_TENANT_ID',
    'SHAREPOINT_SITE_URL',
    'SHAREPOINT_LAWLEY_FILE_URL',
  ];

  validateEnvVars(requiredVars);
};

/**
 * Extract file information from SharePoint URL
 */
export function parseSharePointUrl(url: string): {
  siteUrl: string;
  relativePath: string;
  fileId?: string;
} {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');

  // Extract file ID from query parameters if present
  const fileId = urlObj.searchParams.get('id') || undefined;

  return {
    siteUrl: `${urlObj.protocol}//${urlObj.host}`,
    relativePath: urlObj.pathname,
    fileId,
  };
}
