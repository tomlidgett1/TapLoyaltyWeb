/**
 * Utility functions for implementing PKCE (Proof Key for Code Exchange)
 * for OAuth 2.0 authorization code flow
 */

/**
 * Generates a random string for use as a code verifier
 * @param length Length of the random string (default: 43)
 * @returns A random string suitable for use as a code verifier
 */
export function generateCodeVerifier(length: number = 43): string {
  // Use crypto API if available (for server-side)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buffer = new Uint8Array(length);
    crypto.getRandomValues(buffer);
    return base64UrlEncode(buffer);
  }
  
  // Fallback for environments without crypto API
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Generates a code challenge from a code verifier using SHA-256
 * @param codeVerifier The code verifier string
 * @returns A promise that resolves to the code challenge
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Use SubtleCrypto API if available (for browser environments)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(hashBuffer));
  }
  
  // For environments without SubtleCrypto, return the verifier itself
  // Note: This is not secure and should be replaced with a proper SHA-256 implementation
  console.warn('SubtleCrypto not available. Using plain code challenge method.');
  return codeVerifier;
}

/**
 * Encodes a Uint8Array to a base64url string
 * @param buffer The buffer to encode
 * @returns A base64url encoded string
 */
function base64UrlEncode(buffer: Uint8Array): string {
  // Convert the buffer to a base64 string
  const base64 = btoa(String.fromCharCode(...buffer));
  
  // Convert base64 to base64url by replacing characters
  // that are different between the two encodings
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Export a default object to make this a proper module
export default {
  generateCodeVerifier,
  generateCodeChallenge
}; 