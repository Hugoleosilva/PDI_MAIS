"use client";

import { useState } from "react";
import { formatPercent, type SyncPayloadInput } from "@pdi-mais/core";
import { ImportForm } from "./ImportForm";

/**
 * Cola uma tabela de uma data PASSADA (ex.: aba antiga de uma planilha
 * própria do usuário) e gera um snapshot retroativo no histórico de
 * progresso — sem tocar no PDI vivo (áreas/blocos/canvas).
 */
export function HistoricalSnapshotForm() {
  const [date, setDate] = useState("");
  const [success, setSuccess] = useState<{ date: string; overall: number } | null>(null);

  const onConfirm = async (payload: SyncPayloadInput) => {
    if (!date) throw new Error("Escolha a data dessa aba antes de salvar.");
    const res = await fetch("/api/pdi/reports/backfill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, payload }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Erro ${res.status}`);
    }
    const { snapshot } = await res.json();
    setSuccess({ date, overall: snapshot.overall });
  };

  const label = "mb-1 block text-xs font-medium text-neutral-600";
  const input =
    "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900";

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        Pra usar quando você tem um histórico próprio (ex.: uma planilha com uma aba por
        semana) e quer preencher retroativamente o progresso ao longo do tempo. Cola aqui a
        tabela de UMA data passada, escolhe a data dela, e salva — isso só entra no
        histórico de relatórios, não mexe no seu PDI atual (áreas, blocos, canvas).
      </p>

      {success && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Snapshot de {new Date(success.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}{" "}
          salvo — {formatPercent(success.overall)} de progresso geral naquela data.
        </p>
      )}

      <ImportForm
        key={success ? success.date : "form"}
        initialTitle="Snapshot"
        initialTrack=""
        hasExisting
        showRootFields={false}
        confirmLabel={date ? `Salvar snapshot de ${date}` : "Escolha uma data"}
        onConfirm={onConfirm}
        footer={null}
        extraFields={
          <div className="max-w-[220px]">
            <label className={label}>Data dessa aba *</label>
            <input
              type="date"
              className={input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        }
      />
    </div>
  );
}
