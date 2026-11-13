"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  areaToIncomingInput,
  suggestedAreaToIncomingInput,
  type DiagnosisPoint,
  type PdiDoc,
  type SuggestedArea,
} from "@pdi-mais/core";
import { brand } from "@/lib/theme";
import { Modal } from "./Modal";

/** Card de um ponto (força ou melhoria) — título em negrito + detalhe. */
function PointCard({ points, bg, border }: { points: DiagnosisPoint[]; bg: string; border: string }) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-md border p-3" style={{ background: bg, borderColor: border }}>
      {points.map((p, i) => (
        <div key={i} className="text-xs leading-relaxed" style={{ color: brand.ink }}>
          <b>{p.title}:</b> <span style={{ color: brand.muted }}>{p.detail}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * "Assistente de desenvolvimento" — inspirado no da Qulture.rocks: o Gemini
 * analisa o PDI atual e sugere pontos fortes/a melhorar + novas áreas de
 * desenvolvimento com ações já tipadas. Nada é criado até o usuário revisar
 * (checkbox, tudo marcado por padrão) e confirmar.
 */
export function DevelopmentAssistant({ pdi }: { pdi: PdiDoc }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strengths, setStrengths] = useState<DiagnosisPoint[]>([]);
  const [improvements, setImprovements] = useState<DiagnosisPoint[]>([]);
  const [suggestedAreas, setSuggestedAreas] = useState<SuggestedArea[]>([]);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setCreateError(null);
    setStrengths([]);
    setImprovements([]);
    setSuggestedAreas([]);
    setAccepted(new Set());
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnosis", { method: "POST" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error ?? "Falhou.");
      setStrengths(data.strengths ?? []);
      setImprovements(data.improvements ?? []);
      setSuggestedAreas(data.suggestedAreas ?? []);
      setAccepted(new Set((data.suggestedAreas ?? []).map((_: unknown, i: number) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui gerar a análise.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) =>
    setAccepted((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const create = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const areas = [
        ...pdi.areas.map(areaToIncomingInput),
        ...suggestedAreas.filter((_, i) => accepted.has(i)).map(suggestedAreaToIncomingInput),
      ];
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          root: { title: pdi.root.title, track: pdi.root.track ?? undefined },
          areas,
        }),
      });
      const data = await res.json();
      if (!data?.ok) {
        const issue = Array.isArray(data?.issues) ? data.issues[0] : null;
        const detail = issue ? ` (${issue.path?.join(".")}: ${issue.message})` : "";
        throw new Error(`${data?.error ?? "Falhou ao criar."}${detail}`);
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Não consegui criar as áreas selecionadas.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          reset();
        }}
        className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
      >
        🧭 Assistente de desenvolvimento
      </button>

      {open && (
        <Modal title="Assistente de desenvolvimento" onClose={() => setOpen(false)} maxWidth="max-w-2xl" scrollable>
            {strengths.length === 0 && improvements.length === 0 && (
              <>
                <p className="text-xs text-neutral-500">
                  Analisa o seu PDI atual e sugere pontos fortes, pontos a melhorar e novas áreas
                  de desenvolvimento com ações já prontas — você revisa e decide o que criar.
                </p>
                <button
                  type="button"
                  onClick={generate}
                  disabled={loading}
                  aria-busy={loading}
                  className="self-start rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: "#E8590C" }}
                >
                  {loading ? "Analisando…" : "Gerar análise"}
                </button>
                {error && (
                  <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {error}
                  </p>
                )}
              </>
            )}

            {(strengths.length > 0 || improvements.length > 0) && (
              <>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <PointCard points={strengths} bg={brand.tealSoft} border="#B9E8DF" />
                  <PointCard points={improvements} bg={brand.orangeSoft} border="#F3D3AE" />
                </div>

                {suggestedAreas.length > 0 && (
                  <>
                    <p className="mt-2 text-xs font-semibold" style={{ color: brand.ink }}>
                      Sugestões de novas áreas de desenvolvimento
                    </p>
                    <div className="flex flex-col gap-2">
                      {suggestedAreas.map((area, i) => (
                        <label
                          key={i}
                          className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3"
                          style={{ borderColor: brand.border }}
                        >
                          <input
                            type="checkbox"
                            checked={accepted.has(i)}
                            onChange={() => toggle(i)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: brand.ink }}>
                              {area.title}
                            </p>
                            {area.rationale && (
                              <p className="mt-0.5 text-xs" style={{ color: brand.muted }}>
                                {area.rationale}
                              </p>
                            )}
                            <div className="mt-1.5 flex flex-col gap-1">
                              {area.actions.map((a, j) => (
                                <div key={j} className="text-[11px]" style={{ color: brand.ink }}>
                                  <span
                                    className="mr-1.5 rounded-full px-1.5 py-0.5 font-medium"
                                    style={{ background: brand.graySoft, color: brand.grayText }}
                                  >
                                    {a.kind ?? "Outro"}
                                  </span>
                                  {a.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {createError && (
                      <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                        {createError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={create}
                      disabled={creating || accepted.size === 0}
                      aria-busy={creating}
                      className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                    >
                      {creating
                        ? "Criando…"
                        : `Criar ${accepted.size} área${accepted.size === 1 ? "" : "s"} selecionada${accepted.size === 1 ? "" : "s"}`}
                    </button>
                  </>
                )}
              </>
            )}
        </Modal>
      )}
    </>
  );
}
