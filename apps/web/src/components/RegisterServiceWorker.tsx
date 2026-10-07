"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (só assets estáticos, ver public/sw.js) — SÓ em
 * produção. Em dev, os nomes de arquivo de `/_next/static/*` não são
 * imutáveis como em produção (o Next reaproveita o mesmo caminho a cada
 * rebuild) — um service worker com cache-primeiro ali serve JS antigo pra
 * sempre, e nem reiniciar o servidor nem dar hard refresh resolve, porque o
 * cache mora no navegador, não no servidor.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
