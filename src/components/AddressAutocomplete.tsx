"use client";

import { MapPin, Loader2, LocateFixed } from "lucide-react";
import { useEffect, useState, useRef } from "react";

// Centre point used as proximity fallback when no user location
const HC_CENTRE = "174.6955,-36.6016";

export default function AddressAutocomplete(props: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (address: string) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState(props.value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const proximityRef = useRef<string>(HC_CENTRE);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // On mount: request geolocation, bias proximity, and pre-fill if within HC
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude: lon, latitude: lat } = pos.coords;
        proximityRef.current = `${lon},${lat}`;
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.value !== inputValue) setInputValue(props.value);
  }, [props.value, inputValue]);

  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) { setSuggestions([]); return; }
    setIsLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
      if (!apiKey) return;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
        `?country=nz&types=address&access_token=${apiKey}&limit=2&proximity=${proximityRef.current}`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (err) {
      console.error("Address search error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    props.onChange(val);
    setShowSuggestions(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchAddress(val), 300);
  };

  const handleSelect = (address: string) => {
    const clean = address.replace(", New Zealand", "");
    setInputValue(clean);
    props.onChange(clean);
    setSuggestions([]);
    setShowSuggestions(false);
    props.onSelect(clean);
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        {locating
          ? <LocateFixed className="h-6 w-6 text-[#FF4753] animate-pulse" />
          : <MapPin className="h-6 w-6 text-white/40" />
        }
      </div>
      <input
        type="text"
        name="address_search"
        autoComplete="off"
        placeholder={props.placeholder ?? "e.g. 8 Neaptide Close, Red Beach"}
        className="w-full pl-12 pr-12 py-4 border-2 border-white/20 rounded-xl text-sm sm:text-lg focus:outline-none focus:border-[#FF4753] focus:ring-1 focus:ring-[#FF4753] transition-colors bg-white/10 text-white placeholder:text-white/40"
        value={inputValue}
        onChange={handleInputChange}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions.length > 0 && showSuggestions) {
              handleSelect(suggestions[0].place_name);
            } else if (inputValue) {
              props.onSelect(inputValue);
            }
          }
        }}
      />

      {isLoading && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <Loader2 className="h-5 w-5 text-white/40 animate-spin" />
        </div>
      )}

      {suggestions.length > 0 && showSuggestions && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto left-0 text-left">
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
