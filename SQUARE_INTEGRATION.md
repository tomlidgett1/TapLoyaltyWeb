# Square API Integration

This document outlines the integration between Tap Loyalty and Square's point-of-sale system.

## Integration Overview

The Square integration allows merchants to:

1. Connect their Square account to Tap Loyalty
2. Sync customer data between Square and Tap Loyalty
3. Track transactions for loyalty points
4. Manage rewards redemption

## Technical Implementation

The integration uses Square's OAuth 2.0 flow to securely connect merchant accounts:

1. When a merchant clicks "Connect to Square" in the Integrations page, they are redirected to Square's authorization page
2. After authorizing, Square redirects back to our application with an authorization code
3. Our server exchanges this code for an access token using Square's OAuth API
4. The access token is stored securely in the merchant's account in Firestore
5. We use this token to make authorized API calls to Square on behalf of the merchant

## Configuration Details

- **Application ID**: sq0idp-4LAqjdrwhjauSthYdTRFtA
- **API Version**: 2025-04-16
- **Environment**: Production
- **Redirect URL**: Must be configured in the Square Developer Dashboard
  - Log in to the [Square Developer Dashboard](https://developer.squareup.com/apps)
  - Select your application
  - Navigate to the OAuth section
  - Add your application's callback URL (e.g., https://app.taployalty.com.au/dashboard)

## OAuth Scopes

The integration requests the following permissions:

- `MERCHANT_PROFILE_READ`: Read merchant profile information
- `CUSTOMERS_READ`: Read customer information
- `CUSTOMERS_WRITE`: Create and update customer information
- `ORDERS_READ`: Read order information
- `ORDERS_WRITE`: Create and update orders
- `PAYMENTS_READ`: Read payment information
- `PAYMENTS_WRITE`: Process payments
- `ITEMS_READ`: Read catalog items
- `ITEMS_WRITE`: Create and update catalog items

## Token Management

- Access tokens are stored in Firestore
- Tokens expire after a set period (typically 30 days)
- Refresh tokens are used to obtain new access tokens without requiring reauthorization
- All tokens are encrypted at rest

## Security Considerations

1. API credentials are not exposed to the client side
2. OAuth state parameter is used to prevent CSRF attacks
3. All API requests are made server-side
4. HTTPS is enforced for all communication

## Troubleshooting

Common issues and their solutions:

1. **Connection Failed - Invalid redirect_uri**: Ensure that the redirect URL is properly configured in the Square Developer Dashboard. The URL in your dashboard must exactly match the URL where Square will redirect after authorization.
2. **API Permission Errors**: Ensure that all required OAuth scopes are requested during authorization.
3. **Token Expiration**: Implement a token refresh mechanism to handle expired access tokens.

## Useful Links

- [Square Developer Dashboard](https://developer.squareup.com/apps)
- [Square OAuth Documentation](https://developer.squareup.com/docs/oauth-api/overview)
- [Square API Reference](https://developer.squareup.com/reference/square) 