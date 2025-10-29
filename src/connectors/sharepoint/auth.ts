import axios from 'axios';
import { sharepointConfig } from '../../config/sharepoint.config.js';
import { AuthenticationError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';

interface AccessToken {
  token: string;
  expiresAt: number;
}

let cachedToken: AccessToken | null = null;

/**
 * Get SharePoint access token using client credentials flow
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    logger.debug('Using cached SharePoint access token');
    return cachedToken.token;
  }

  const { clientId, clientSecret, tenantId } = sharepointConfig;

  if (!clientId || !clientSecret || !tenantId) {
    throw new AuthenticationError(
      'SharePoint credentials not configured. Please set SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, and SHAREPOINT_TENANT_ID in .env.local'
    );
  }

  try {
    logger.info('Requesting new SharePoint access token');

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    const response = await axios.post(tokenEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, expires_in } = response.data;

    // Cache token with 5 minute buffer before expiry
    cachedToken = {
      token: access_token,
      expiresAt: Date.now() + (expires_in - 300) * 1000,
    };

    logger.info('SharePoint access token obtained successfully');
    return access_token;
  } catch (error: any) {
    logger.error('Failed to obtain SharePoint access token', {
      error: error.message,
      response: error.response?.data,
    });

    throw new AuthenticationError(
      'Failed to authenticate with SharePoint',
      { originalError: error.message }
    );
  }
}

/**
 * Clear cached token (useful for testing or forcing refresh)
 */
export function clearTokenCache(): void {
  cachedToken = null;
  logger.debug('SharePoint token cache cleared');
}
