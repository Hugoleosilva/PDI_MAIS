"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseImportTable, type ImportResult } from "@pdi-mais/core";
import { brand } from "@/lib/theme";

const EXAMPLE = `Área de desenvolvimento,Descrição da área,Ação,Descrição da ação,Tipo da ação,Prazo,Status
Tecnologias de Backend,"Consolidar o backend do ecossistema.",Udemy: Node.js do Zero a Maestria,"Fundamentos de Node, Express e boas práticas de API.",Treinamento e estudo,03/10/2026,Em progresso
Tecnologias de Backend,,Télos: NodeJS + MongoDB,,Treinamento e estudo,15/05/2026,Finalizado
Tecnologias de Frontend,,Udemy: Next.js do Zero ao Avançado,,Treinamento e estudo,30/10/2026,Em progresso
Inglês Técnico,,Hashtag: Curso de Inglês,,Treinamento e estudo,,Não iniciado`;

export function ImportForm({
  initialTitle,
  initialTrack,
  hasExisting,
}: {
  initialTitle: string;
  initialTrack: string;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [track, setTrack] = useState(initialTrack);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canPreview = title.trim().length > 0 && text.trim().length > 0;

  const doPreview = () => {
    setError(null);
    setPreview(
      parseImportTable(text, {
        title: title.trim(),
        track: track.trim() || undefined,
      }),
    );
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
    setPreview(null);
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preview.payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Erro ${res.status}`);
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao importar");
      setBusy(false);
    }
  };

  const label = "mb-1 block text-xs font-medium text-neutral-600";
  const input =
    "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900";

  const warnings = useMemo(() => preview?.warnings ?? [], [preview]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Nome do ciclo *</label>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={label}>Trilha / tema (opcional)</label>
          <input
            className={input}
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            placeholder="Desenvolvimento Fullstack"
          />
        </div>
      </div>

      <div>
        <label className={label}>
          Tabela — 1 linha por ação, nesta ordem:
          <br />
          <code className="text-[11px]">
            Área de desenvolvimento, Descrição da área, Ação, Descrição da ação, Tipo da ação,
            Prazo, Status
          </code>
          <br />
          <span className="font-normal text-neutral-400">
            só Área e Ação são obrigatórias · a descrição da área vai na 1ª linha dela ·
            descrição longa: envolva em &quot;aspas&quot;
          </span>
        </label>
        <textarea
          className={`${input} h-52 font-mono text-xs`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
          placeholder={EXAMPLE}
        />
        <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
          <button
            type="button"
            className="underline hover:text-neutral-800"
            onClick={() => {
              setText(EXAMPLE);
              setPreview(null);
            }}
          >
            usar exemplo
          </button>
          <span>·</span>
          <button
            type="button"
            className="underline hover:text-neutral-800"
            onClick={() => fileRef.current?.click()}
          >
            enviar CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <span>·</span>
          <span>separador: vírgula, ponto-e-vírgula ou tab (copiar do Excel)</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!canPreview}
        onClick={doPreview}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Pré-visualizar
      </button>

      {preview && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium">
            {preview.areaCount} áreas · {preview.actionCount} ações
          </p>

          {warnings.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs" style={{ color: brand.orangeText }}>
              {warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}

          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto text-xs">
            {preview.payload.areas?.map((a, i) => (
              <div key={i}>
                <div className="font-semibold">
                  {a.title}
                  {a.description ? (
                    <span className="ml-1 font-normal text-neutral-400">— {a.description}</span>
                  ) : null}
                </div>
                <ul className="ml-3 list-disc text-neutral-600">
                  {a.actions?.map((ac, j) => (
                    <li key={j}>
                      {ac.title}
                      {ac.kind ? ` · ${ac.kind}` : ""}
                      {ac.status ? ` · ${ac.status}` : ""}
                      {ac.dueDate ? ` · ${ac.dueDate}` : ""}
                      {ac.description ? " · 📝" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {preview.actionCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={confirm}
              className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy
                ? "Importando…"
                : hasExisting
                  ? "Confirmar (atualiza o PDI atual)"
                  : "Confirmar import"}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {hasExisting && (
        <p className="text-xs text-neutral-500">
          Você já tem um PDI. Importar de novo faz o merge: mantém posições no canvas,
          blocos e o status de ações que você editou à mão.
        </p>
      )}
    </div>
  );
}
