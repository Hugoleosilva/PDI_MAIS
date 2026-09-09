"use client";

import { useState } from "react";
import { buildInsightPrompt, type PdiDoc } from "@pdi-mais/core";

export function GeminiButton({ pdi }: { pdi: PdiDoc }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = open ? buildInsightPrompt(pdi) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* usuário copia manualmente da textarea */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
      >
        ✦ Insight p/ 1-on-1
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-xl flex-col gap-3 rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Prompt para o Gemini</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-lg leading-none text-neutral-500 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Gerado com o seu PDI atual. Copie e cole no Gemini para receber o resumo
              executivo da 1-on-1.
            </p>
            <textarea
              readOnly
              value={prompt}
              onFocus={(e) => e.currentTarget.select()}
              className="h-64 w-full resize-none rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copy}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                {copied ? "✓ Copiado" : "Copiar prompt"}
              </button>
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Abrir Gemini ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
