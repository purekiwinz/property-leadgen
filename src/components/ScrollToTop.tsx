"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [bottom, setBottom] = useState(32);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);

      const footer = document.querySelector("footer");
      if (footer) {
        const footerTop = footer.getBoundingClientRect().top;
        const viewportH = window.innerHeight;
        if (footerTop < viewportH) {
          // Footer is visible — push button up above it
          setBottom(viewportH - footerTop + 16);
        } else {
          setBottom(32);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      style={{ bottom: `${bottom}px` }}
      className="fixed right-6 z-50 bg-[#FF4753] hover:brightness-110 text-white p-3 rounded-full shadow-lg transition-all"
    >
      <ChevronUp className="w-5 h-5" strokeWidth={3} />
    </button>
  );
}
