"use client";

import { useState } from "react";
import { ImportForm } from "./ImportForm";
import { ManualBuilder, type DraftArea } from "./ManualBuilder";

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
  const [tab, setTab] = useState<"manual" | "paste">("manual");

  const tabBtn = (id: "manual" | "paste", label: string) => (
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
      </div>

      {tab === "manual" ? (
        <ManualBuilder
          title={initialTitle}
          track={initialTrack}
          initialAreas={initialAreas}
          hasExisting={hasExisting}
        />
      ) : (
        <ImportForm
          initialTitle={initialTitle}
          initialTrack={initialTrack}
          hasExisting={hasExisting}
        />
      )}
    </div>
  );
}
