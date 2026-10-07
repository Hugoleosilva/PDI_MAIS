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
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Limpeza automática: um service worker registrado ANTES dessa
      // mudança (ou em qualquer sessão de dev anterior) continua servindo
      // JS velho do cache dele pra sempre, mesmo com o app já corrigido —
      // ninguém precisa abrir o DevTools pra tirar isso à mão.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
