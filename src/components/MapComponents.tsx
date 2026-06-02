import React, { useEffect, useState, useRef } from 'react';
import { useMap, useMapsLibrary, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Search, MapPin } from 'lucide-react';
import type { Point } from '../types.ts';

export const LIGHT_MAP_ID = 'LIGHT_MAP_DEMO_ID';

export function RoutePolyline({ 
  path, 
  color, 
  isAlternative = false, 
  isSelectedPreview = false,
  onClick
}: { 
  key?: React.Key,
  path: google.maps.LatLngLiteral[], 
  color: string, 
  isAlternative?: boolean,
  isSelectedPreview?: boolean,
  onClick?: () => void
}) {
  const map = useMap(LIGHT_MAP_ID);
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;

    let strokeOpacity = 0.8;
    let strokeWeight = 5;
    let zIndex = 1;

    if (isAlternative) {
      strokeOpacity = 0.4;
      strokeWeight = 4;
      zIndex = 2; // below selected
      color = '#9ca3af'; // gray for unselected alternatives
    } else if (isSelectedPreview) {
      strokeOpacity = 0.9;
      strokeWeight = 6;
      zIndex = 3; // above alternatives
    }

    const polyline = new mapsLib.Polyline({
      path,
      strokeColor: color,
      strokeOpacity,
      strokeWeight,
      zIndex
    });

    polyline.setMap(map);
    
    let listener: google.maps.MapsEventListener | null = null;
    if (onClick) {
      listener = polyline.addListener('click', onClick);
    }

    return () => {
      polyline.setMap(null);
      if (listener) listener.remove();
    };
  }, [map, mapsLib, path, color, isAlternative, isSelectedPreview, onClick]);

  return null;
}

export function PlaceAutocomplete({ 
  onPlaceSelected, 
  disabled, 
  placeholder = "Введіть адресу або місце...", 
  compact = false,
  initialQuery = ""
}: { 
  key?: React.Key,
  onPlaceSelected: (p: Point) => void, 
  disabled?: boolean, 
  placeholder?: string, 
  compact?: boolean,
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const map = useMap(LIGHT_MAP_ID);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!placesLib || !map) return;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new placesLib.AutocompleteService();
    }
    if (!placesServiceRef.current) {
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new placesLib.PlacesService(dummyDiv);
    }
  }, [placesLib, map]);

  useEffect(() => {
    if (!autocompleteServiceRef.current || !query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions({
        input: query,
        sessionToken: sessionTokenRef.current,
      }, (predictions: any, status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setResults(predictions);
        } else {
          setResults([]);
        }
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (suggestion: any) => {
    if (!placesServiceRef.current || !placesLib) return;

    placesServiceRef.current.getDetails({
      placeId: suggestion.place_id,
      fields: ['place_id', 'name', 'geometry'],
      sessionToken: sessionTokenRef.current
    }, (place: any, status: any) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
        onPlaceSelected({
          id: place.place_id + '-' + Date.now(),
          name: place.name || suggestion.description,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          type: 'custom',
          sequenceIndex: 0
        });

        // Reset session token
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        setQuery('');
        setResults([]);
      }
    });
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={`block w-full pl-10 pr-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border border-slate-300 bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm disabled:opacity-50 disabled:bg-slate-50 transition`}
        />
      </div>

      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto max-h-60 text-sm">
          {results.map((suggestion, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(suggestion)}
              className="cursor-pointer hover:bg-slate-50 text-slate-700 px-3 py-2 flex items-center"
            >
              <MapPin className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
              <span className="truncate">{suggestion.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
