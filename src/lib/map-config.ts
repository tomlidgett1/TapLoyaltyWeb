// Google Maps API Configuration
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Validate API key is available
if (!GOOGLE_MAPS_API_KEY && typeof window !== 'undefined') {
  console.error('Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.');
}

// Default map center (Australia)
export const DEFAULT_MAP_CENTER = {
  lat: -25.2744,
  lng: 133.7751
};

// Default zoom levels
export const DEFAULT_ZOOM = 4;
export const LOCATION_ZOOM = 15; 