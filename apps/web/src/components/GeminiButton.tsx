"use client";

import { useState } from "react";
import {
  buildInsightPrompt,
  INSIGHT_KIND_HINT,
  INSIGHT_KIND_LABEL,
  type InsightKind,
  type InsightPerspective,
  type PdiDoc,
} from "@pdi-mais/core";

const KINDS: InsightKind[] = ["1on1", "insights", "overall", "focus", "tech"];

export function GeminiButton({
  pdi,
  perspective = "self",
}: {
  pdi: PdiDoc;
  /** "manager": gestor gerando insight sobre o PDI de um liderado (visão Equipe). */
  perspective?: InsightPerspective;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<InsightKind>("1on1");
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultCopied, setResultCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompt = open ? buildInsightPrompt(pdi, kind, perspective) : "";

  const pick = (k: InsightKind) => {
    setKind(k);
    setCopied(false);
    setResult(null);
    setError(null);
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

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, perspective, userId: pdi.userId }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error ?? "Falhou.");
      setResult(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui gerar — tenta de novo.");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setResultCopied(true);
      setTimeout(() => setResultCopied(false), 2500);
    } catch {
      /* usuário copia manualmente */
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
              <h2 className="text-sm font-bold">Insight com IA</h2>
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

            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "#E8590C" }}
            >
              {loading ? "Gerando…" : "✨ Gerar com IA"}
            </button>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {error}
                {error.includes("GEMINI_API_KEY") && (
                  <>
                    {" "}
                    Enquanto isso, use o prompt manual abaixo.
                  </>
                )}
              </p>
            )}

            {result && (
              <div className="flex flex-col gap-1.5">
                <div
                  className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border p-3 text-[13px] leading-relaxed"
                  style={{ background: "#FFF9DB", borderColor: "#F0E0A0" }}
                >
                  {result}
                </div>
                <button
                  type="button"
                  onClick={copyResult}
                  className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  {resultCopied ? "✓ Copiado" : "Copiar resposta"}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowPrompt((v) => !v)}
              className="self-start text-[11px] font-medium text-neutral-500 hover:underline"
            >
              {showPrompt ? "Esconder prompt bruto" : "Ver prompt bruto (pra colar manualmente no Gemini)"}
            </button>

            {showPrompt && (
              <>
                <textarea
                  readOnly
                  value={prompt}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-40 w-full resize-none rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
