import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { rawApiFetch } from "@/lib/api-config";

interface PlaceDetails {
  address: string;
  placeId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  name?: string;
  formatted_address?: string;
}

interface AddressInputProps {
  value: string;
  onChange: (value: string, placeDetails?: PlaceDetails) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export default function AddressInput({
  value,
  onChange,
  placeholder = "Enter address",
  className,
  id,
  required = false,
}: AddressInputProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
  const [formState, setFormState] = useState<PlaceDetails>({
    address: value,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const hasSelectedPlace = useRef(false);
  const isSelectingPlace = useRef(false);
  // The Google Maps key is not hardcoded in source; it is served by the backend
  // from an environment variable via /api/config. A browser Maps key is still
  // visible at runtime, so it must be referrer- and API-restricted in Google Cloud.
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    rawApiFetch('/api/config', { auth: 'none' }) // deliberate: public app config, needed pre-login
      .then(res => res.json())
      .then(config => {
        setApiKey(config.googleMapsApiKey || null);
      })
      .catch(err => {
        console.error('Failed to fetch app config:', err);
      });
  }, []);

  // Load Google Maps API once the key is available
  useEffect(() => {
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    if (!apiKey) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    // Set up global callback
    (window as any).initGoogleMaps = () => {
      setIsLoaded(true);
    };

    script.onload = () => {
      if (window.google?.maps?.places) {
        setIsLoaded(true);
      }
    };

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      document.head.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
    }
  }, [apiKey]);

  // Initialize autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        fields: ['formatted_address', 'name', 'place_id', 'geometry'],
        componentRestrictions: { country: 'ke' },
        strictBounds: false
      });

      // Handle place selection - simplified approach
      const placeChangedListener = () => {
        setIsLoadingPlace(true);

        try {
          const place = autocompleteRef.current?.getPlace();

          if (!place) {
            setIsLoadingPlace(false);
            return;
          }

          if (place.place_id && (place.formatted_address || place.name)) {
            const address = place.formatted_address || place.name;

            // Create comprehensive place details with coordinates
            const placeDetails: PlaceDetails = {
              address: address,
              placeId: place.place_id,
              name: place.name,
              formatted_address: place.formatted_address,
              coordinates: place.geometry?.location ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              } : undefined
            };

            isSelectingPlace.current = true;
            hasSelectedPlace.current = true;

            // Update state with full place details - THIS IS WHERE THE STATE IS SET
            setFormState(placeDetails);

            // Update input DOM value
            if (inputRef.current) {
              inputRef.current.value = address;
            }

            // Call onChange with complete place details including lat/lng
            onChange(address, placeDetails);

            // Reset selection flag and loading state after a delay
            setTimeout(() => {
              isSelectingPlace.current = false;
              setIsLoadingPlace(false);
            }, 800);
          } else {
            // Invalid place selection - missing place_id or address
            setIsLoadingPlace(false);
          }
        } catch (error) {
          console.error('Error in placeChangedListener:', error);
          setIsLoadingPlace(false);
        }
      };

      // Add the place_changed listener
      autocompleteRef.current.addListener('place_changed', placeChangedListener);

      // Add direct event listeners to capture place selection
      if (inputRef.current) {
        // Listen for mousedown on dropdown items
        const handleMouseDown = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target.closest('.pac-item')) {
            setIsLoadingPlace(true);
            setTimeout(() => {
              const place = autocompleteRef.current?.getPlace();
              if (place && place.place_id) {
                placeChangedListener();
              } else {
                setIsLoadingPlace(false);
              }
            }, 100);
          }
        };

        document.addEventListener('mousedown', handleMouseDown);

        // Also handle enter key selection
        inputRef.current.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            setTimeout(() => {
              const place = autocompleteRef.current?.getPlace();
              if (place && place.place_id) {
                placeChangedListener();
              }
            }, 50);
          }
        });
      }


      // Set geographic bounds for Kenya to improve suggestions
      autocompleteRef.current.setBounds(new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(-4.679, 33.909), // Southwest Kenya
        new window.google.maps.LatLng(5.506, 41.911)   // Northeast Kenya
      ));

    } catch (error) {
      console.error('Error initializing Places Autocomplete:', error);
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      // Clean up global listener  
      const globalClickHandler = document.querySelector('body')?.onclick;
      if (globalClickHandler) {
        document.removeEventListener('click', globalClickHandler);
      }
    };
  }, [isLoaded, onChange]);

  // Sync external value changes with form state
  useEffect(() => {
    if (value !== formState.address && !isSelectingPlace.current) {
      setFormState(prev => ({
        ...prev,
        address: value
      }));

      // Clear place selection when external value changes from outside
      if (hasSelectedPlace.current) {
        hasSelectedPlace.current = false;
      }
    }
  }, [value, formState.address]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Don't process changes during place selection to avoid interfering
    if (isSelectingPlace.current) {
      return;
    }

    // Only reset place selection if user is actually typing (not during autocomplete)
    if (hasSelectedPlace.current) {
      hasSelectedPlace.current = false;
    }

    // Update form state with new address while preserving coordinates if still valid
    const updatedState: PlaceDetails = {
      address: newValue,
      // Keep coordinates only if user is still editing the same selected place
      ...(hasSelectedPlace.current ? {
        placeId: formState.placeId,
        coordinates: formState.coordinates,
        name: formState.name,
        formatted_address: formState.formatted_address
      } : {})
    };

    setFormState(updatedState);
    onChange(newValue, updatedState);
  }, [onChange, formState]);

  const handleBlur = useCallback(() => {
    // If a place was selected, ensure the form state is properly maintained
    if (hasSelectedPlace.current && formState.placeId) {
      const selectedAddress = formState.formatted_address || formState.name || formState.address;
      if (selectedAddress && formState.address !== selectedAddress) {
        const restoredState = {
          ...formState,
          address: selectedAddress
        };
        setFormState(restoredState);
        if (inputRef.current) {
          inputRef.current.value = selectedAddress;
        }
        onChange(selectedAddress, restoredState);
      }
    }
  }, [formState, onChange]);

  const handleFocus = useCallback(() => {
    // When focusing, if we have a selected place, ensure it's displayed
    if (hasSelectedPlace.current && formState.placeId) {
      const selectedAddress = formState.formatted_address || formState.name || formState.address;
      if (formState.address !== selectedAddress) {
        const restoredState = {
          ...formState,
          address: selectedAddress
        };
        setFormState(restoredState);
        if (inputRef.current) {
          inputRef.current.value = selectedAddress;
        }
      }
    }
  }, [formState]);

  // Apply Google Places dropdown styling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .pac-container {
        z-index: 99999 !important;
        border-radius: 8px !important;
        border: 1px solid #e5e7eb !important;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
        font-family: inherit !important;
        background-color: white !important;
        position: absolute !important;
        display: block !important;
        visibility: visible !important;
      }
      .pac-item {
        padding: 12px 16px !important;
        border-bottom: 1px solid #f3f4f6 !important;
        font-size: 14px !important;
        cursor: pointer !important;
        background-color: white !important;
        line-height: 1.4 !important;
      }
      .pac-item:hover {
        background-color: #f9fafb !important;
      }
      .pac-item-selected {
        background-color: #f3f4f6 !important;
      }
      .pac-matched {
        font-weight: 600 !important;
        color: #7c3aed !important;
      }
      .pac-item-query {
        font-size: 14px !important;
        padding-right: 3px !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        placeholder={placeholder}
        value={formState.address}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        required={required}
        className={className}
        autoComplete="off"
        disabled={isLoadingPlace}
      />
      {!isLoaded && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          Loading...
        </div>
      )}
      {isLoadingPlace && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-md border z-20">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading location...</span>
          </div>
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    google: any;
  }
}
