"use client";

import { useEffect, useState } from "react";

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's non-standard flag for "launched from home screen".
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function IosInstallTooltip() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (
      isIos() &&
      !isStandalone() &&
      !localStorage.getItem("ios-install-dismissed")
    ) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 rounded-sm border border-gold/40 bg-surface p-3 text-xs text-cream shadow-lg">
      <p>
        Install this app: tap <strong>Share</strong>, then{" "}
        <strong>Add to Home Screen</strong>.
      </p>
      <button
        onClick={() => {
          localStorage.setItem("ios-install-dismissed", "1");
          setShow(false);
        }}
        className="mt-2 text-sage underline"
      >
        Dismiss
      </button>
    </div>
  );
}
