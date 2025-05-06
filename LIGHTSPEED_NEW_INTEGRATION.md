# Lightspeed New Integration (R-Series API)

This document provides information about the Lightspeed New integration, which uses the R-Series API to connect to Lightspeed Retail POS.

## Overview

The Lightspeed New integration allows merchants to connect their Lightspeed Retail POS (R-Series) to our platform. This integration enables:

- Inventory synchronization
- Customer data management
- Transaction tracking
- Advanced reporting

## Technical Implementation

### OAuth 2.0 with PKCE

The integration uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authorization:

1. **Code Verifier Generation**: A random string is generated as the code verifier
2. **Code Challenge Creation**: The code verifier is hashed using SHA-256 and then base64url-encoded
3. **Authorization Request**: The user is redirected to Lightspeed's authorization page with the code challenge
4. **Authorization Code Grant**: After user consent, Lightspeed redirects back with an authorization code
5. **Token Exchange**: The authorization code and code verifier are exchanged for access and refresh tokens
6. **Token Storage**: Tokens are securely stored in Firestore under the merchant's document

### Important: Redirect URI Configuration

The redirect URI **must be pre-configured** in the Lightspeed Developer Portal. Unlike some OAuth implementations, Lightspeed does not accept the redirect_uri as a parameter in the authorization request. Instead, it uses the redirect URI that was registered for your application in their developer portal.

When the user authorizes your application, Lightspeed will redirect to your configured URI with the format:
```
https://{your_configured_redirect_uri}?code={authorization_code}&state={state}
```

In our implementation, the dashboard page (`/dashboard`) is used as the redirect URI, which handles the OAuth callback by detecting the code and state parameters in the URL.

### API Endpoints

#### Authorization Endpoint

- **URL**: `https://cloud.lightspeedapp.com/oauth/authorize`
- **Parameters**:
  - `response_type`: Always "code"
  - `client_id`: Your Lightspeed application client ID
  - `scope`: Space-separated list of required permissions
  - `state`: Random string to prevent CSRF attacks
  - `code_challenge`: Base64url-encoded SHA-256 hash of the code verifier
  - `code_challenge_method`: Always "S256"
  - Note: `redirect_uri` is NOT included as a parameter as it must be pre-configured in the Lightspeed Developer Portal

#### Token Exchange Endpoint

- **URL**: `/api/lightspeed/new`
- **Method**: GET
- **Parameters**:
  - `code`: Authorization code from Lightspeed
  - `merchantId`: The ID of the merchant connecting their account
  - `codeVerifier`: The original code verifier for PKCE verification

### Required Scopes

The integration requires the following scopes:

- `employee:inventory_read`: Read inventory data
- `employee:inventory_write`: Write inventory data

## Setup Instructions

### Prerequisites

1. A Lightspeed Retail account (R-Series)
2. A Lightspeed Developer account with an application created
3. The application must have the correct redirect URI configured in the Lightspeed Developer Portal
   - Set the redirect URI to your application's dashboard page (e.g., `https://yourdomain.com/dashboard`)

### Environment Variables

Add the following environment variables to your `.env.local` file:

```
NEXT_PUBLIC_LIGHTSPEED_NEW_CLIENT_ID=your_client_id
LIGHTSPEED_NEW_CLIENT_SECRET=your_client_secret
```

### Integration Flow

1. User clicks "Connect" on the Lightspeed New integration card
2. The application generates a code verifier and challenge
3. User is redirected to Lightspeed's authorization page
4. User logs in and grants permissions
5. Lightspeed redirects back to the configured redirect URI (dashboard page) with an authorization code
6. The application exchanges the code for access and refresh tokens
7. The tokens are stored in Firestore
8. The UI updates to show the connected status

## Troubleshooting

### Common Issues

1. **Invalid code verifier**: Ensure the code verifier is properly generated and stored
2. **Missing scopes**: Verify that all required scopes are included in the authorization request
3. **Redirect URI mismatch**: Check that the redirect URI in the Lightspeed Developer Portal exactly matches your dashboard page URL

### Debugging

- Check the browser console for detailed logs during the connection process
- Verify that localStorage items are properly set and retrieved
- Examine network requests to identify any issues with the token exchange

## Security Considerations

- The code verifier should be a cryptographically random string
- Tokens are stored securely in Firestore, not in localStorage
- The state parameter prevents CSRF attacks
- PKCE prevents authorization code interception attacks

## References

- [Lightspeed API Documentation](https://developers.lightspeedhq.com/retail/introduction/introduction/)
- [OAuth 2.0 with PKCE](https://oauth.net/2/pkce/)
- [RFC 7636: PKCE](https://tools.ietf.org/html/rfc7636) 