'use client';

import { useState } from 'react';
import Link from 'next/link';

interface EndpointInfo {
  path: string;
  description: string;
  method: string;
  params: string[];
  requiresAuth?: boolean;
}

export default function GmailSummaryPage() {
  const [merchantId, setMerchantId] = useState('');
  
  const endpoints: EndpointInfo[] = [
    {
      path: '/api/auth/gmail/connect',
      method: 'GET',
      description: 'Initiates the OAuth flow to connect a Gmail account',
      params: ['merchantId'],
    },
    {
      path: '/api/auth/gmail/callback',
      method: 'GET',
      description: 'OAuth callback endpoint (system use)',
      params: ['code', 'state'],
    },
    {
      path: '/api/auth/gmail/refresh',
      method: 'POST',
      description: 'Refreshes an access token using a refresh token',
      params: ['merchantId', 'refresh_token'],
    },
    {
      path: '/api/auth/gmail/profile',
      method: 'GET',
      description: 'Fetches the user\'s profile from Gmail API',
      params: ['merchantId', 'save (optional)'],
      requiresAuth: true,
    },
    {
      path: '/api/auth/gmail/userinfo',
      method: 'GET',
      description: 'Fetches the user\'s info from OpenID Connect',
      params: ['merchantId', 'save (optional)'],
      requiresAuth: true,
    },
    {
      path: '/api/auth/gmail/debug',
      method: 'GET',
      description: 'Debug endpoint for Gmail integration',
      params: ['merchantId'],
      requiresAuth: true,
    },
    {
      path: '/api/auth/gmail/test-email',
      method: 'GET',
      description: 'Tests all methods for fetching email address',
      params: ['merchantId'],
      requiresAuth: true,
    },
    {
      path: '/api/auth/gmail/update-email',
      method: 'POST',
      description: 'Manually updates the email address for a Gmail integration',
      params: ['merchantId', 'emailAddress'],
    },
  ];
  
  const pages = [
    {
      path: '/tools/gmail',
      description: 'Gmail integration tools UI',
    },
    {
      path: '/store/emails',
      description: 'Email store management page',
    },
  ];
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Gmail Integration Summary</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Enter Merchant ID"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Link
            href={`/tools/gmail?merchantId=${merchantId}`}
            className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 ${!merchantId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Go to Tools
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>
          <div className="bg-white shadow-md rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {endpoints.map((endpoint, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {endpoint.path}
                      {endpoint.requiresAuth && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          Auth
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                        endpoint.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{endpoint.description}</div>
                      <div className="mt-1">
                        <span className="font-medium">Params:</span> {endpoint.params.join(', ')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">UI Pages</h2>
          <div className="bg-white shadow-md rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pages.map((page, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {page.path}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {page.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        href={merchantId ? `${page.path}?merchantId=${merchantId}` : page.path}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Visit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Integration Flow</h2>
            <div className="bg-white shadow-md rounded-md p-6">
              <ol className="list-decimal pl-5 space-y-3">
                <li>User initiates connection via <code>/store/emails</code> page</li>
                <li>System redirects to <code>/api/auth/gmail/connect</code> with merchant ID</li>
                <li>User authenticates with Google and grants permissions</li>
                <li>Google redirects to <code>/api/auth/gmail/callback</code> with auth code</li>
                <li>System exchanges code for tokens and attempts to fetch email address</li>
                <li>Email address is stored in the integration document</li>
                <li>User is redirected back to <code>/store/emails</code> page</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
        <div className="bg-white shadow-md rounded-md p-6">
          <h3 className="text-lg font-medium mb-3">Common Issues</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-medium">Missing email address:</span> Use the debug endpoint to check integration status and the test-email endpoint to try all methods.
            </li>
            <li>
              <span className="font-medium">Token errors:</span> Check if the refresh token is stored correctly and use the refresh endpoint to get a new access token.
            </li>
            <li>
              <span className="font-medium">Scope issues:</span> Ensure the OAuth scopes include 'openid', 'email', and 'https://www.googleapis.com/auth/gmail.readonly'.
            </li>
          </ul>
        </div>
      </div>
      
      <div className="mt-6">
        <Link 
          href="/dashboard" 
          className="text-indigo-600 hover:text-indigo-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
} 