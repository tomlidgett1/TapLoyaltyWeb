'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Loading component for the Suspense boundary
function GmailToolsPageLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading Gmail tools...</p>
      </div>
    </div>
  );
}

// Component that uses useSearchParams
function GmailToolsPageContent() {
  const [merchantId, setMerchantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [action, setAction] = useState<string>('debug');
  const [email, setEmail] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get merchantId from URL if present
    const urlMerchantId = searchParams?.get('merchantId');
    if (urlMerchantId) {
      setMerchantId(urlMerchantId);
    }
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      let response;
      
      switch (action) {
        case 'debug':
          response = await fetch(`/api/auth/gmail/debug?merchantId=${merchantId}`);
          break;
        case 'profile':
          response = await fetch(`/api/auth/gmail/profile?merchantId=${merchantId}`);
          break;
        case 'userinfo':
          response = await fetch(`/api/auth/gmail/userinfo?merchantId=${merchantId}`);
          break;
        case 'update-email':
          response = await fetch('/api/auth/gmail/update-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ merchantId, emailAddress: email }),
          });
          break;
        case 'save-profile-email':
          response = await fetch(`/api/auth/gmail/profile?merchantId=${merchantId}&save=true`);
          break;
        case 'save-userinfo-email':
          response = await fetch(`/api/auth/gmail/userinfo?merchantId=${merchantId}&save=true`);
          break;
        default:
          throw new Error('Invalid action');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Gmail Integration Tools</h1>
      
      <div className="bg-white shadow-md rounded-md p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="merchantId" className="block text-sm font-medium text-gray-700 mb-1">
              Merchant ID
            </label>
            <input
              type="text"
              id="merchantId"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              id="action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="debug">Debug Integration</option>
              <option value="profile">Get Gmail Profile</option>
              <option value="userinfo">Get OpenID UserInfo</option>
              <option value="update-email">Update Email Manually</option>
              <option value="save-profile-email">Get & Save Profile Email</option>
              <option value="save-userinfo-email">Get & Save UserInfo Email</option>
            </select>
          </div>
          
          {action === 'update-email' && (
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required={action === 'update-email'}
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {loading ? 'Processing...' : 'Submit'}
          </button>
        </form>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          <h2 className="text-lg font-medium mb-2">Error</h2>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-white shadow-md rounded-md p-6">
          <h2 className="text-lg font-medium mb-2">Result</h2>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
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

// Main component wrapped in Suspense
export default function GmailToolsPage() {
  return (
    <Suspense fallback={<GmailToolsPageLoading />}>
      <GmailToolsPageContent />
    </Suspense>
  );
} 