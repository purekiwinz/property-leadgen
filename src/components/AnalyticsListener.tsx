"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Define the shape of our analytics payload
interface AnalyticsPayload {
  event_label?: string;
  step?: string;
  [key: string]: string | undefined;
}

// Extend the Window interface to include our tracking functions
declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
    fbq?: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}

export default function AnalyticsListener() {
  const pathname = usePathname();

  useEffect(() => {
    // Track page views on route change if gtag is available
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_view", {
        page_path: pathname,
      });
    }
  }, [pathname]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Find the closest element with a data-analytics attribute
      const target = (e.target as HTMLElement).closest("[data-analytics-event], [data-analytics-label], [data-analytics-step]");
      
      if (target) {
        const eventName = target.getAttribute("data-analytics-event") || "click";
        const label = target.getAttribute("data-analytics-label");
        const step = target.getAttribute("data-analytics-step");
        
        if (typeof window !== "undefined") {
          const payload: AnalyticsPayload = {};
          if (label) payload.event_label = label;
          if (step) payload.step = step;
          
          if (window.gtag) {
            window.gtag("event", eventName, payload as Record<string, unknown>);
          }
          
          // Also send to FB Pixel if available and it's a generic click event
          if (window.fbq && eventName === 'click' && label) {
             window.fbq('trackCustom', 'ButtonClick', { button_label: label });
          }
        }
      }
    };

    document.addEventListener("click", handleGlobalClick);

    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  return null;
}
