# Lightspeed Retail POS (R-Series) Integration

This document outlines the integration between Tap Loyalty and Lightspeed's Retail POS (R-Series) system.

## Integration Overview

The Lightspeed New integration allows merchants to:

1. Connect their Lightspeed Retail POS account to Tap Loyalty
2. Sync customer data between Lightspeed and Tap Loyalty
3. Track transactions for loyalty points
4. Manage inventory and product information

## Technical Implementation

The integration uses Lightspeed's OAuth 2.0 flow with PKCE to securely connect merchant accounts:

1. When a merchant clicks "Connect" in the Integrations page, they are redirected to Lightspeed's authorization page
2. After authorizing, Lightspeed redirects back to our application with an authorization code
3. Our server exchanges this code for an access token using Lightspeed's OAuth API
4. The access token is stored securely in the merchant's account in Firestore
5. We use this token to make authorized API calls to Lightspeed on behalf of the merchant

## Configuration Details

- **Client ID**: 0be25ce25b4988b26b5759aecca02248cfe561d7594edd46e7d6807c141ee72e
- **Environment**: Production
- **Redirect URL**: Must match the URL configured in your Lightspeed Developer account
  - The redirect URL should be your application's dashboard page (e.g., https://app.taployalty.com.au/dashboard)

## OAuth Scopes

The integration requests the following permissions:

- `employee:register`: Access to register operations
- `employee:inventory`: Access to inventory management
- `employee:customers`: Access to customer data

## Token Management

- Access tokens are stored in Firestore under `merchants/{merchantId}/integrations/lightspeed_new`
- Tokens expire after a set period (typically 1 hour)
- Refresh tokens are used to obtain new access tokens without requiring reauthorization
- All tokens are encrypted at rest

## OAuth Flow with PKCE

The integration uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for enhanced security:

1. Generate a code verifier (a random string)
2. Derive a code challenge from the verifier using SHA-256 hashing
3. Include the code challenge in the authorization request
4. Store the code verifier to be used during the token exchange

## Security Considerations

1. API credentials are not exposed to the client side
2. OAuth state parameter is used to prevent CSRF attacks
3. PKCE is used to prevent authorization code interception attacks
4. All API requests are made server-side
5. HTTPS is enforced for all communication

## Troubleshooting

Common issues and their solutions:

1. **Connection Failed - Invalid redirect_uri**: Ensure that the redirect URL is properly configured in your Lightspeed Developer account. The URL in your developer account must exactly match the URL where Lightspeed will redirect after authorization.
2. **API Permission Errors**: Ensure that all required OAuth scopes are requested during authorization.
3. **Token Expiration**: Implement a token refresh mechanism to handle expired access tokens.
4. **PKCE Errors**: Ensure that the code verifier and code challenge are properly generated and used.

## Useful Links

- [Lightspeed Developer Portal](https://developers.lightspeedhq.com/)
- [Lightspeed OAuth Documentation](https://developers.lightspeedhq.com/retail/authentication/oauth-flow/)
- [Lightspeed API Reference](https://developers.lightspeedhq.com/retail/endpoints/introduction/)
- [PKCE RFC](https://tools.ietf.org/html/rfc7636) 