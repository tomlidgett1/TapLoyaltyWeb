"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search, AlertCircle } from "lucide-react";
import { GOOGLE_MAPS_API_KEY, DEFAULT_MAP_CENTER, DEFAULT_ZOOM, LOCATION_ZOOM } from "@/lib/map-config";
import { toast } from "@/components/ui/use-toast";

interface MapLocationPickerProps {
  initialAddress?: string;
  initialLatitude?: number;
  initialLongitude?: number;
  onLocationChange: (location: { 
    address: string; 
    latitude: number; 
    longitude: number;
    formattedAddress?: string;
  }) => void;
}

export function MapLocationPicker({
  initialAddress = "",
  initialLatitude,
  initialLongitude,
  onLocationChange,
}: MapLocationPickerProps) {
  const [address, setAddress] = useState(initialAddress);
  const [latitude, setLatitude] = useState<number | undefined>(initialLatitude);
  const [longitude, setLongitude] = useState<number | undefined>(initialLongitude);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);

  // Load Google Maps script
  useEffect(() => {
    // Debug: Log API key availability (remove after testing)
    console.log('Google Maps API Key available:', !!GOOGLE_MAPS_API_KEY);
    console.log('API Key length:', GOOGLE_MAPS_API_KEY?.length || 0);
    
    // Check if API key is available
    if (!GOOGLE_MAPS_API_KEY) {
      setMapLoadError("Google Maps API key is not configured. Please contact support.");
      return;
    }

    // Check if Google Maps script is already loaded and ready
    if (window.google && window.google.maps && window.google.maps.Map) {
      console.log('Google Maps already loaded, initializing...');
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
    if (existingScript) {
      console.log('Google Maps script already exists, waiting for load...');
      
      // Create a callback function name
      const callbackName = `googleMapsCallback_${Date.now()}`;
      (window as any)[callbackName] = () => {
        console.log('Google Maps callback executed');
        initializeMap();
        if (window.google && window.google.maps && window.google.maps.places) {
          autocompleteService.current = new google.maps.places.AutocompleteService();
        }
        // Clean up callback
        delete (window as any)[callbackName];
      };
      
      // If script exists but callback not set, add it
      if (!existingScript.src.includes('callback=')) {
        existingScript.remove();
        loadGoogleMapsScript(callbackName);
      }
      return;
    }

    console.log('Loading Google Maps script...');
    const callbackName = `googleMapsCallback_${Date.now()}`;
    loadGoogleMapsScript(callbackName);
  }, []);

  const loadGoogleMapsScript = (callbackName: string) => {
    // Set up callback function
    (window as any)[callbackName] = () => {
      console.log('Google Maps script loaded successfully via callback');
      initializeMap();
      // Initialize autocomplete service
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteService.current = new google.maps.places.AutocompleteService();
      }
      // Clean up callback
      delete (window as any)[callbackName];
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setMapLoadError("Failed to load Google Maps. Please check your internet connection and try again.");
      // Clean up callback on error
      delete (window as any)[callbackName];
    };
    document.head.appendChild(script);
  };

  // Initialize map
  const initializeMap = () => {
    if (!mapRef.current) return;

         // Use coordinates or default to Australia
     const defaultLatLng = { 
       lat: latitude || DEFAULT_MAP_CENTER.lat, 
       lng: longitude || DEFAULT_MAP_CENTER.lng 
     };
     
     const mapOptions: google.maps.MapOptions = {
       center: defaultLatLng,
       zoom: latitude && longitude ? LOCATION_ZOOM : DEFAULT_ZOOM,
       mapTypeControl: false,
       streetViewControl: false,
       fullscreenControl: false,
     };

    const newMap = new google.maps.Map(mapRef.current, mapOptions);
    setMap(newMap);
    geocoder.current = new google.maps.Geocoder();

    // Add marker if we have initial coordinates
    if (latitude && longitude) {
      const newMarker = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: newMap,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });
      
      setMarker(newMarker);

      // Add event listener for marker drag end
      newMarker.addListener("dragend", () => {
        const position = newMarker.getPosition();
        if (position) {
          setLatitude(position.lat());
          setLongitude(position.lng());
          
          // Reverse geocode to get address
          reverseGeocode(position.lat(), position.lng());
        }
      });
    }

    // Add click event listener to map
    newMap.addListener("click", (event: google.maps.MapMouseEvent) => {
      const clickedLat = event.latLng?.lat();
      const clickedLng = event.latLng?.lng();
      
      if (clickedLat && clickedLng) {
        setLatitude(clickedLat);
        setLongitude(clickedLng);
        
        // Update marker position or create new marker
        if (marker) {
          marker.setPosition({ lat: clickedLat, lng: clickedLng });
        } else {
          const newMarker = new google.maps.Marker({
            position: { lat: clickedLat, lng: clickedLng },
            map: newMap,
            draggable: true,
            animation: google.maps.Animation.DROP,
          });
          
          setMarker(newMarker);
          
          // Add event listener for marker drag end
          newMarker.addListener("dragend", () => {
            const position = newMarker.getPosition();
            if (position) {
              setLatitude(position.lat());
              setLongitude(position.lng());
              
              // Reverse geocode to get address
              reverseGeocode(position.lat(), position.lng());
            }
          });
        }
        
        // Reverse geocode to get address
        reverseGeocode(clickedLat, clickedLng);
      }
    });
  };

    // Get address suggestions
  const getSuggestions = (input: string) => {
    if (!autocompleteService.current || !input || input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Focus search on Australia with business bias
    const searchOptions: google.maps.places.AutocompletionRequest = {
      input,
      componentRestrictions: { country: 'au' },
      types: ['establishment', 'address'],
    };

    autocompleteService.current.getPlacePredictions(
      searchOptions,
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const suggestionTexts = predictions.map(prediction => prediction.description);
          setSuggestions(suggestionTexts);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  };

  // Handle input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (address.length >= 3) {
        getSuggestions(address);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [address]);

  // Search for address
  const searchAddress = () => {
    if (!geocoder.current || !map || !address) {
      setSearchError("Please enter an address to search");
      return;
    }
    
    setIsLoading(true);
    setSearchError(null);
    setShowSuggestions(false);
    
    // Add region bias for Australia and specify result type
    const geocodeRequest = {
      address,
      region: 'au',
      componentRestrictions: { country: 'au' }
    };
    
    geocoder.current.geocode(geocodeRequest, (results, status) => {
      setIsLoading(false);
      
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        const formattedAddress = results[0].formatted_address;
        
        setLatitude(lat);
        setLongitude(lng);
        setAddress(formattedAddress);
        
        // Update map center and zoom
        map.setCenter(location);
        map.setZoom(LOCATION_ZOOM);
        
        // Update marker position or create new marker
        if (marker) {
          marker.setPosition(location);
        } else {
          const newMarker = new google.maps.Marker({
            position: location,
            map,
            draggable: true,
            animation: google.maps.Animation.DROP,
          });
          
          setMarker(newMarker);
          
          // Add event listener for marker drag end
          newMarker.addListener("dragend", () => {
            const position = newMarker.getPosition();
            if (position) {
              setLatitude(position.lat());
              setLongitude(position.lng());
              
              // Reverse geocode to get address
              reverseGeocode(position.lat(), position.lng());
            }
          });
        }
        
        // Notify parent component
        onLocationChange({
          address: formattedAddress,
          latitude: lat,
          longitude: lng,
          formattedAddress
        });

        // Show success toast
        toast({
          title: "Location found",
          description: "The map has been updated with your location",
        });
      } else {
        let errorMessage = "Could not find this address. Please try a more specific search.";
        
        if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
          errorMessage = "No results found for this address. Please try a different search.";
        } else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
          errorMessage = "Too many requests. Please try again later.";
        } else if (status === google.maps.GeocoderStatus.REQUEST_DENIED) {
          errorMessage = "Location search request was denied.";
        } else if (status === google.maps.GeocoderStatus.INVALID_REQUEST) {
          errorMessage = "Invalid search request. Please try again.";
        }
        
        setSearchError(errorMessage);
        toast({
          variant: "destructive",
          title: "Search failed",
          description: errorMessage,
        });
        
        console.error("Geocode was not successful:", status);
      }
    });
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = (lat: number, lng: number) => {
    if (!geocoder.current) return;
    
    geocoder.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const formattedAddress = results[0].formatted_address;
        setAddress(formattedAddress);
        
        // Notify parent component
        onLocationChange({
          address: formattedAddress,
          latitude: lat,
          longitude: lng,
          formattedAddress
        });
      } else {
        console.error("Reverse geocode was not successful for the following reason:", status);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address-search">Search for your business address</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
            id="address-search"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setSearchError(null);
            }}
            placeholder="Enter your business address (e.g. 123 George St, Sydney NSW 2000)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                searchAddress();
              } else if (e.key === "Escape") {
                setShowSuggestions(false);
              }
            }}
            onFocus={() => address.length >= 3 && setSuggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking on them
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            className={searchError ? "border-red-500" : ""}
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  onMouseDown={() => {
                    setAddress(suggestion);
                    setShowSuggestions(false);
                    searchAddress();
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <Button 
          onClick={searchAddress} 
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? "Searching..." : (
            <>
              <Search className="h-4 w-4" />
              Search
            </>
          )}
        </Button>
        </div>
        
        {searchError && (
          <div className="text-red-500 text-xs flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3" />
            {searchError}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Try including suburb, state or postcode for better results
        </p>
      </div>
      
      {mapLoadError ? (
        <div className="w-full h-[300px] rounded-md border border-red-200 bg-red-50 flex items-center justify-center">
          <div className="text-center p-6">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-700 font-medium mb-2">Map Unavailable</p>
            <p className="text-xs text-red-600 max-w-sm">{mapLoadError}</p>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                You can still continue by entering your full address above. The location will be validated during setup.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div 
          ref={mapRef} 
          className="w-full h-[300px] rounded-md border border-gray-200 bg-gray-50"
        />
      )}
      
      <div className="flex flex-col gap-1">
        {address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span className="text-gray-700">{address}</span>
          </div>
        )}
        
        {latitude && longitude && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
          </div>
        )}
      </div>
    </div>
  );
} 