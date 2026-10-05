"use client";

import { useState } from "react";
import {
  buildGroupingPrompt,
  parseGroupingSuggestion,
  type PdiDoc,
  type PdiGroup,
} from "@pdi-mais/core";
import { brand } from "@/lib/theme";

/**
 * Sugestão de agrupamento por IA — mesmo padrão do "Insight com IA"
 * (copiar prompt / colar resposta do Gemini, sem precisar de API key).
 * O usuário decide se aplica: não substitui os "★ Sugeridos" fixos, é uma
 * opção a mais.
 */
export function AIGroupingButton({
  pdi,
  onApply,
}: {
  pdi: PdiDoc;
  onApply: (groups: PdiGroup[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);

  const prompt = open ? buildGroupingPrompt(pdi) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* usuário copia manualmente da textarea */
    }
  };

  const apply = () => {
    setError(null);
    setUnmatched([]);
    try {
      const { groups, unmatched: um } = parseGroupingSuggestion(pdi, response);
      if (groups.length === 0) {
        setError("Nenhum bloco válido encontrado nessa resposta.");
        return;
      }
      onApply(groups);
      setUnmatched(um);
      if (um.length === 0) setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui aplicar essa resposta.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setResponse("");
          setError(null);
          setUnmatched([]);
        }}
        className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-neutral-100"
        style={{ color: brand.ink }}
      >
        ✦ Sugerir com IA
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
              <h2 className="text-sm font-bold">Agrupar blocos com IA</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-lg leading-none text-neutral-500 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              1. Copie o prompt e cole no Gemini. 2. Cole a resposta (JSON) dele aqui embaixo.
              3. Aplique — nada muda até você clicar em aplicar.
            </p>

            <textarea
              readOnly
              value={prompt}
              onFocus={(e) => e.currentTarget.select()}
              className="h-32 w-full resize-none rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed"
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

            <label className="text-xs font-medium text-neutral-500">Resposta do Gemini</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder='[{"title": "...", "areaTitles": ["..."]}, ...]'
              className="h-28 w-full resize-none rounded border border-neutral-200 p-3 font-mono text-[11px] leading-relaxed"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            {unmatched.length > 0 && (
              <p className="text-xs text-amber-600">
                Aplicado, mas não encontrei estas áreas: {unmatched.join(", ")}
              </p>
            )}
            <button
              type="button"
              onClick={apply}
              disabled={!response.trim()}
              className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              Aplicar sugestão
            </button>
          </div>
        </div>
      )}
    </>
  );
}
