import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple proxy service for Firebase Storage files.
 * This helps bypass CORS issues when accessing files from localhost.
 */
export async function GET(request: NextRequest) {
  try {
    // Get URL from the query parameter
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }
    
    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(url);
    
    // Fetch the content from Firebase Storage
    const response = await fetch(decodedUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the content type and create a blob
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const blob = await response.blob();
    
    // Create response with appropriate headers
    const proxyResponse = new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
    return proxyResponse;
  } catch (error) {
    console.error('Error in storage proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
} 