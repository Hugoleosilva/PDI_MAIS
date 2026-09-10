"use client";

import type { BurndownSeries } from "@pdi-mais/core";
import { brand } from "@/lib/theme";

/** Gráfico burn-down: horas restantes ao longo do tempo. Previsto x real. */
export function Burndown({
  series,
  todayT,
  width = 440,
  height = 150,
}: {
  series: BurndownSeries;
  todayT: number;
  width?: number;
  height?: number;
}) {
  const pad = { l: 40, r: 12, t: 12, b: 24 };
  const span = Math.max(series.spanDays, 7);
  const maxH = Math.max(series.total, 1);

  const x = (t: number) => pad.l + (Math.min(t, span) / span) * (width - pad.l - pad.r);
  const y = (h: number) => pad.t + (1 - h / maxH) * (height - pad.t - pad.b);
  const path = (pts: { t: number; h: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.h).toFixed(1)}`).join(" ");

  const behind =
    series.actual.length > 1 &&
    series.actual.at(-1)!.h > pointOnPlanned(series.planned, series.actual.at(-1)!.t) + 0.5;

  const yTicks = [0, maxH / 2, maxH];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxWidth: width, display: "block" }}
      role="img"
      aria-label="Gráfico de horas restantes: previsto e real"
    >
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={pad.l}
            x2={width - pad.r}
            y1={y(v)}
            y2={y(v)}
            stroke={brand.border}
            strokeWidth="1"
          />
          <text
            x={pad.l - 6}
            y={y(v) + 3}
            textAnchor="end"
            fontSize="10"
            fill={brand.muted}
            fontFamily="ui-monospace, monospace"
          >
            {Math.round(v)}h
          </text>
        </g>
      ))}

      {/* hoje */}
      {todayT > 0 && todayT <= span && (
        <>
          <line
            x1={x(todayT)}
            x2={x(todayT)}
            y1={pad.t}
            y2={height - pad.b}
            stroke={brand.muted}
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <text
            x={x(todayT)}
            y={height - pad.b + 13}
            textAnchor="middle"
            fontSize="9"
            fill={brand.muted}
          >
            hoje
          </text>
        </>
      )}

      {/* previsto */}
      <path
        d={path(series.planned)}
        fill="none"
        stroke={brand.muted}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      {/* real */}
      <path
        d={path(series.actual)}
        fill="none"
        stroke={behind ? brand.orange : brand.teal}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle
        cx={x(series.actual.at(-1)!.t)}
        cy={y(series.actual.at(-1)!.h)}
        r="3.5"
        fill={behind ? brand.orange : brand.teal}
      />

      <text x={pad.l} y={height - 4} fontSize="9" fill={brand.muted}>
        — previsto&nbsp;&nbsp;━ real
      </text>
    </svg>
  );
}

function pointOnPlanned(planned: { t: number; h: number }[], t: number): number {
  const [a, b] = planned;
  if (!a || !b || b.t === a.t) return a?.h ?? 0;
  if (t <= a.t) return a.h;
  if (t >= b.t) return b.h;
  return a.h + ((b.h - a.h) * (t - a.t)) / (b.t - a.t);
}
