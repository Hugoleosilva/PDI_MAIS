"use client";

import { useState } from "react";
import type { PdiDoc } from "@pdi-mais/core";

/** Liga/desliga o Modo Gestor (visão read-only em /r/[shareId]) e mostra o link. */
export function ShareButton({ pdi }: { pdi: PdiDoc }) {
  const [open, setOpen] = useState(false);
  const [shareId, setShareId] = useState<string | null>(pdi.shareId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = shareId && typeof window !== "undefined" ? `${window.location.origin}/r/${shareId}` : "";

  const enable = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/pdi/share", { method: "POST" });
      const data = await res.json();
      if (data.ok) setShareId(data.shareId);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/pdi/share", { method: "DELETE" });
      const data = await res.json();
      if (data.ok) setShareId(null);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
      >
        🔗 Compartilhar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Modo Gestor</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-lg leading-none text-neutral-500 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Gera um link de visualização — quem abrir vê seu PDI exatamente como está
              organizado no canvas, sem conseguir editar nada.
            </p>

            {shareId ? (
              <>
                <div className="flex items-center gap-2 rounded-md border border-neutral-200 p-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 truncate bg-transparent text-xs text-neutral-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={copy}
                    className="shrink-0 rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100"
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={disable}
                  disabled={busy}
                  className="self-start rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {busy ? "Desligando…" : "Desligar compartilhamento"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={enable}
                disabled={busy}
                className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {busy ? "Gerando…" : "Gerar link de compartilhamento"}
              </button>
            )}
            {error && (
              <p className="text-xs text-red-600">Não consegui fazer isso agora. Tenta de novo.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
