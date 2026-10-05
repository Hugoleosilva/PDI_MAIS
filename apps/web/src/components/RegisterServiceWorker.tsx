"use client";

import { useEffect } from "react";

/** Registra o service worker (só assets estáticos, ver public/sw.js). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
