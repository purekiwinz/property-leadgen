export function BedroomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17V9.5A1.5 1.5 0 013.5 8h17A1.5 1.5 0 0122 9.5V17" />
      <path d="M2 13h20" />
      <path d="M6 13V10a1 1 0 011-1h4a1 1 0 011 1v3" />
      <line x1="4" y1="17" x2="4" y2="19" />
      <line x1="20" y1="17" x2="20" y2="19" />
    </svg>
  );
}

export function BathroomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      {/* Shower head */}
      <circle cx="8" cy="5" r="1" fill="currentColor" stroke="none" />
      <path d="M8 6v3" />
      <path d="M6 9h4" />
      {/* Water drops */}
      <line x1="5" y1="11" x2="5" y2="12" />
      <line x1="7" y1="12" x2="7" y2="13" />
      <line x1="9" y1="11" x2="9" y2="12" />
      {/* Tray/base */}
      <path d="M2 16h20v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1z" />
      <line x1="5" y1="19" x2="5" y2="21" />
      <line x1="19" y1="19" x2="19" y2="21" />
    </svg>
  );
}

export function CarParkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l1.8-5.4A2 2 0 018.7 6h6.6a2 2 0 011.9 1.6L19 13" />
      <rect x="2" y="13" width="20" height="5" rx="1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <line x1="9" y1="18" x2="15" y2="18" />
      <path d="M9 9.5h6" />
    </svg>
  );
}
