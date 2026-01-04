import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login', 
  '/signup', 
  '/bank-connect',
  '/bank-callback',
  '/customer-dashboard',
  '/redeem',
  '/_next', 
  '/api/auth',
  '/api/ai-status', // Allow checking AI status without auth
  '/api/ai-assistant',
  '/api/ai-assistant-proxy',
  '/api/ai',
  '/api/basiqconnect',
  '/favicon.ico'
]

export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname

  // Get the token from the cookies
  const token = request.cookies.get('session')?.value
  
  // Check if the path is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => path.startsWith(route))
  
  // Check for public assets (images, etc.)
  const isPublicAsset = path.includes('.') // Files with extensions like .jpg, .png, etc.
  
  // If the path is the root path (/) and no token, redirect to login
  // Otherwise, let authenticated users view the homepage (bank connect page)
  if (path === '/' && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // If not a public route/asset and no token exists, redirect to login
  // Only redirect for specific protected routes to avoid conflicts with auth context
  const PROTECTED_ROUTES = ['/dashboard', '/getstarted', '/store', '/customers', '/email', '/notes', '/analytics', '/financials', '/merchant', '/auth-test']
  const isProtectedRoute = PROTECTED_ROUTES.some(route => path.startsWith(route))
  
  if (isProtectedRoute && !token) {
    // Store the original URL to redirect back after login
    const url = new URL('/login', request.url)
    url.searchParams.set('from', path)
    return NextResponse.redirect(url)
  }

  // Force dynamic rendering for all pages to avoid useSearchParams errors
  const response = NextResponse.next()
  
  // Add header to force dynamic rendering
  response.headers.set('x-middleware-cache', 'no-cache')
  response.headers.set('Cache-Control', 'no-store')
  
  return response
}

export const config = {
  // Apply middleware to all routes
  matcher: [
    // Apply to all paths
    '/(.*)'
  ]
} 