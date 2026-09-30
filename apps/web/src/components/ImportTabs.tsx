"use client";

import { useState } from "react";
import { ImportForm } from "./ImportForm";
import { ManualBuilder, type DraftArea } from "./ManualBuilder";
import { HistoricalSnapshotForm } from "./HistoricalSnapshotForm";

type Tab = "manual" | "paste" | "historico";

export function ImportTabs({
  initialTitle,
  initialTrack,
  initialAreas,
  hasExisting,
}: {
  initialTitle: string;
  initialTrack: string;
  initialAreas: DraftArea[];
  hasExisting: boolean;
}) {
  const [tab, setTab] = useState<Tab>("manual");

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className="border-b-2 px-3 py-2 text-sm font-medium"
      style={{
        borderColor: tab === id ? "#171717" : "transparent",
        color: tab === id ? "#171717" : "#737373",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-neutral-200">
        {tabBtn("manual", "Preencher à mão")}
        {tabBtn("paste", "Colar tabela / CSV")}
        {hasExisting && tabBtn("historico", "Snapshot histórico")}
      </div>

      {tab === "manual" ? (
        <ManualBuilder
          title={initialTitle}
          track={initialTrack}
          initialAreas={initialAreas}
          hasExisting={hasExisting}
        />
      ) : tab === "paste" ? (
        <ImportForm
          initialTitle={initialTitle}
          initialTrack={initialTrack}
          hasExisting={hasExisting}
        />
      ) : (
        <HistoricalSnapshotForm />
      )}
    </div>
  );
}
