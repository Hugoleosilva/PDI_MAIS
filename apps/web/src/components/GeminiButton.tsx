"use client";

import { useState } from "react";
import {
  buildInsightPrompt,
  INSIGHT_KIND_HINT,
  INSIGHT_KIND_LABEL,
  type InsightKind,
  type PdiDoc,
} from "@pdi-mais/core";

const KINDS: InsightKind[] = ["1on1", "insights", "overall", "focus", "tech"];

export function GeminiButton({ pdi }: { pdi: PdiDoc }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<InsightKind>("1on1");
  const [copied, setCopied] = useState(false);
  const prompt = open ? buildInsightPrompt(pdi, kind) : "";

  const pick = (k: InsightKind) => {
    setKind(k);
    setCopied(false);
  };

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
        ✦ Insight com IA
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

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-500">O que você quer saber?</span>
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pick(k)}
                    title={INSIGHT_KIND_HINT[k]}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                    style={
                      kind === k
                        ? { background: "#171717", color: "white", borderColor: "#171717" }
                        : { background: "white", color: "#404040", borderColor: "#d4d4d4" }
                    }
                  >
                    {INSIGHT_KIND_LABEL[k]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-neutral-500">{INSIGHT_KIND_HINT[kind]}</p>
            </div>

            <textarea
              readOnly
              value={prompt}
              onFocus={(e) => e.currentTarget.select()}
              className="h-56 w-full resize-none rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed"
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
