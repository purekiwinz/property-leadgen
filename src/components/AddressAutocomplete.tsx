"use client";

import { MapPin, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function AddressAutocomplete(props: { 
  value: string; 
  onChange: (val: string) => void;
  onSelect: () => void;
}) {
  const [inputValue, setInputValue] = useState(props.value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (props.value !== inputValue) {
      setInputValue(props.value);
    }
  }, [props.value, inputValue]);

  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
      if (!apiKey) {
        console.error("Mapbox API key is missing");
        setIsLoading(false);
        return;
      }

      // Using Mapbox Geocoding API v5
      // country=nz restricts to New Zealand, types=address prioritizes specific addresses over general cities
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=nz&types=address&access_token=${apiKey}&limit=5`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    props.onChange(val);
    setShowSuggestions(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // 300ms debounce for commercial Mapbox API
    debounceTimer.current = setTimeout(() => {
      searchAddress(val);
    }, 300);
  };

  const handleSelect = (address: string) => {
    // Mapbox returns address in `place_name`, let's clean it up slightly for local users
    const cleanAddress = address.replace(", New Zealand", "");
    setInputValue(cleanAddress);
    props.onChange(cleanAddress);
    setSuggestions([]);
    setShowSuggestions(false);
    props.onSelect();
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <MapPin className="h-6 w-6 text-gray-400" />
      </div>
      <input
        type="text"
        name="address_search"
        autoComplete="off"
        placeholder="e.g. 123 Kiwi Avenue, Ponsonby"
        className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors bg-white text-gray-900"
        value={inputValue}
        onChange={handleInputChange}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions.length > 0 && showSuggestions) {
              handleSelect(suggestions[0].place_name);
            } else if (inputValue) {
              props.onSelect();
            }
          }
        }}
      />
      
      {isLoading && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}
      
      {suggestions.length > 0 && showSuggestions && (
        <ul className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto left-0 text-left">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              onClick={() => handleSelect(suggestion.place_name)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 text-base"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="text-gray-800 line-clamp-2">
                  {suggestion.place_name.replace(", New Zealand", "")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
