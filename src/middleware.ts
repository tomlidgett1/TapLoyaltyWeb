import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login', 
  '/signup', 
  '/_next', 
  '/api/auth',
  '/api/ai-status', // Allow checking AI status without auth
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
  
  // If the path is the root path (/), redirect to login or dashboard based on auth status
  if (path === '/') {
    return token 
      ? NextResponse.redirect(new URL('/dashboard', request.url))
      : NextResponse.redirect(new URL('/login', request.url))
  }
  
  // If not a public route/asset and no token exists, redirect to login
  if (!isPublicRoute && !isPublicAsset && !token) {
    // Store the original URL to redirect back after login
    const url = new URL('/login', request.url)
    url.searchParams.set('from', path)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Apply middleware to all routes
  matcher: [
    // Apply to all paths
    '/(.*)'
  ]
} 