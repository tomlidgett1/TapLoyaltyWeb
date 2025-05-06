# Square Integration Debugging Guide

## Changes Made to Fix Integration Issues

1. **Enhanced Logging**: 
   - Added detailed logging in the OAuth callback handler in the dashboard page
   - Added detailed logging in the Square API token exchange endpoint

2. **Created a Test Page**:
   - Added a dedicated test page at `/test-square` to manually test the integration
   - This page allows manual testing of the token exchange process
   - It also provides a way to check if the integration is properly stored in Firestore

3. **Verified API Parameters**:
   - Confirmed that the Square OAuth token exchange requires `client_id` and `client_secret` parameters
   - Updated to use the correct OAuth application secret for the `client_secret` parameter
   - Confirmed that we're using the correct API endpoint and version

## Credentials

- **Application ID**: sq0idp-4LAqjdrwhjauSthYdTRFtA
- **OAuth Application Secret**: sq0csp-Mtlvb4GHknGh25V8PfX5n5f9-s3TYNa7EPNiqAQRjx8
- **API Version**: 2025-04-16

## How to Test the Integration

1. **Navigate to the Test Page**:
   - Go to the Integrations page
   - Click on the "Square Integration Test Page" button
   - Or navigate directly to `/test-square`

2. **Check Existing Integration**:
   - Click "Check Integration Status" to see if your Square integration is already stored in Firestore

3. **Manual Token Exchange Test**:
   - If you have a new authorization code from Square, you can test it manually
   - Enter the code, state, and your merchant ID
   - Click "Test Token Exchange" to process it

## Troubleshooting Steps

If the integration is still not working, follow these steps:

1. **Check Browser Console**:
   - Open your browser's developer tools (F12 or right-click > Inspect)
   - Look for any errors in the console when connecting to Square

2. **Check Server Logs**:
   - Look at your server logs for any errors during the token exchange process
   - Pay attention to the Square API response

3. **Verify Square Developer Settings**:
   - Ensure your redirect URI is correctly configured in the Square Developer Dashboard
   - Confirm that your application ID and OAuth secret are correct
   - Verify that the required OAuth scopes are enabled

4. **Common Issues**:
   - **Invalid redirect_uri**: Make sure the redirect URI in Square Developer Dashboard matches exactly where Square redirects after authorization
   - **Token Exchange Failure**: Check if the authorization code is valid and not expired
   - **Incorrect OAuth Secret**: Ensure you're using the OAuth application secret, not the access token
   - **Firestore Permissions**: Ensure your Firebase security rules allow writing to the integration document

## Integration Flow

1. User clicks "Connect to Square" on the integrations page
2. User is redirected to Square's authorization page
3. After authorization, Square redirects back to `/dashboard` with a code and state parameter
4. The dashboard page detects these parameters and sends them to the server
5. The server exchanges the code for an access token using the Square API
6. The server stores the token and connection details in Firestore
7. The user is redirected to the integrations page with a success message

## API Reference

- **Square OAuth Documentation**: https://developer.squareup.com/docs/oauth-api/overview
- **Token Exchange Endpoint**: https://connect.squareup.com/oauth2/token
- **API Version**: 2025-04-16 