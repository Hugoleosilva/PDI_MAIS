"use client";

import { brand } from "@/lib/theme";

const pct = (v: number) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;

/**
 * Andamento em barras: real (sempre) × previsto no ritmo (quando dá pra
 * calcular — precisa de carga horária + capacidade). Substituiu o gráfico
 * de linha/degraus: mais fácil de ler de relance.
 */
export function PctBar({
  realPct,
  expectedPct,
  color,
}: {
  realPct: number;
  expectedPct: number | null;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="font-semibold" style={{ color: brand.muted }}>
            Real
          </span>
          <span className="font-bold" style={{ color }}>
            {pct(realPct)}
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full"
          style={{ background: brand.graySoft }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: pct(realPct), background: color }}
          />
        </div>
      </div>

      {expectedPct != null && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-semibold" style={{ color: brand.muted }}>
              Previsto no seu ritmo (hoje)
            </span>
            <span className="font-medium" style={{ color: brand.muted }}>
              {pct(expectedPct)}
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full"
            style={{ background: brand.graySoft }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: pct(expectedPct), background: brand.muted }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
