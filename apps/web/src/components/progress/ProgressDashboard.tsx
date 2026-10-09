"use client";

import { useMemo, useRef, useState } from "react";
import { areaProgress, formatPercent, overallProgress, type Area, type Status } from "@pdi-mais/core";
import { brand } from "@/lib/theme";

/** Fim do ciclo — fixo por enquanto (ver plano: virar configurável depois). */
const TARGET_ISO = "2026-12-31T00:00:00.000Z";

/**
 * Encurta um título de área pra caber em espaço apertado (rótulo de
 * gráfico, legenda), preservando o que DIFERENCIA — o que vem entre
 * parênteses no final, se tiver (ex.: "(PDI+)" vs "(TideFlow / Protrack /
 * Maré)") — em vez de só cortar do fim. Confirmado em teste real: duas
 * áreas diferentes ("Projeto de Inovação Aplicada e Soluções Corporativas
 * (PDI+)" e "...(TideFlow / Protrack / Maré)") colapsavam no mesmo texto
 * truncado ("Projeto de In..."), impossível distinguir no gráfico.
 */
function shortAreaLabel(title: string, maxLen = 26): string {
  const m = title.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (m) {
    const [, prefix, suffix] = m;
    const shortPrefix = prefix.trim().split(/\s+/).slice(0, 3).join(" ");
    const label = `${shortPrefix} (${suffix})`;
    return label.length > maxLen ? `${label.slice(0, maxLen - 1)}…` : label;
  }
  return title.length > maxLen ? `${title.slice(0, maxLen - 1)}…` : title;
}

/**
 * Progresso "como se fosse" numa data passada: cada ação Finalizada conta a
 * partir do Prazo dela (ou completedAt, se não tiver prazo) — nunca depois de
 * hoje, mesmo que o prazo seja futuro (já que ela já está pronta agora).
 * Mesma conta de overallProgress/areaProgress (progress.ts), só que com corte
 * de data — assim o valor "hoje" sempre bate com o Progresso geral do topo.
 */
function progressAsOf(areas: Area[], cutoffMs: number): number {
  if (areas.length === 0) return 0;
  const sum = areas.reduce((s, a) => {
    if (a.actions.length === 0) return s;
    const done = a.actions.filter((ac) => {
      if (ac.status !== "done") return false;
      const raw = ac.dueDate ?? ac.completedAt;
      const ms = raw ? Date.parse(raw) : null;
      return ms != null && Math.min(ms, Date.now()) <= cutoffMs;
    }).length;
    return s + done / a.actions.length;
  }, 0);
  return sum / areas.length;
}

/**
 * Linha do tempo derivada direto das ações — sem precisar gerar/importar
 * nenhum snapshot manual. Um ponto por data de prazo distinta de uma ação
 * Finalizada, mais um ponto final em "hoje" garantindo que a curva sempre
 * alcança o progresso atual de verdade.
 */
function buildDoneTimeline(areas: Area[]): { ms: number; pct: number }[] {
  const todayMs = Date.now();
  const dates = new Set<number>();
  for (const a of areas) {
    for (const ac of a.actions) {
      if (ac.status !== "done") continue;
      const raw = ac.dueDate ?? ac.completedAt;
      if (!raw) continue;
      dates.add(Math.min(Date.parse(raw), todayMs));
    }
  }
  const sortedMs = [...dates].sort((a, b) => a - b);
  const points = sortedMs.map((ms) => ({ ms, pct: progressAsOf(areas, ms) }));
  const todayPct = overallProgress(areas);
  // O ponto de "hoje" TEM que bater exatamente com o Progresso Geral do
  // topo (mesma conta, sem corte de data) — confirmado em teste real que
  // isso divergia MUITO (29,58% no gráfico vs 71,67% no card). Causa: toda
  // ação Finalizada com prazo FUTURO (comum — "31/12/2026" em quase tudo)
  // é clampada pra `todayMs` aqui em cima, então o ÚLTIMO ponto do array já
  // existia com `ms === todayMs` — a condição antiga (`< todayMs`) via isso
  // como "não preciso adicionar hoje" e deixava o valor de `progressAsOf`
  // (que só conta ação com prazo/completedAt preenchido — uma Finalizada
  // sem nenhuma das duas datas ficava de fora, divergindo do indicador do
  // topo). Substitui o último ponto em vez de só adicionar condicionalmente.
  if (points.length > 0 && points[points.length - 1].ms === todayMs) {
    points[points.length - 1] = { ms: todayMs, pct: todayPct };
  } else {
    points.push({ ms: todayMs, pct: todayPct });
  }
  return points;
}

/**
 * Curva do "previsto" — não é uma reta ingênua 0→100% de jan a dez. Usa a
 * distribuição REAL dos prazos de TODAS as ações (independente de status),
 * porque o total de ações planejadas não era o mesmo em janeiro que é hoje
 * (áreas/ações foram sendo adicionadas ao longo do ano). Ação sem prazo
 * preenchido conta como planejada pro fim do ciclo (31/12), pra curva sempre
 * fechar em 100% no prazo final mesmo com prazos em aberto.
 */
function plannedAsOf(areas: Area[], cutoffMs: number, targetMs: number): number {
  if (areas.length === 0) return 0;
  const sum = areas.reduce((s, a) => {
    if (a.actions.length === 0) return s;
    const planned = a.actions.filter((ac) => {
      const raw = ac.dueDate;
      const ms = Math.min(raw ? Date.parse(raw) : targetMs, targetMs);
      return ms <= cutoffMs;
    }).length;
    return s + planned / a.actions.length;
  }, 0);
  return sum / areas.length;
}

function buildPlannedTimeline(areas: Area[], targetMs: number): { ms: number; pct: number }[] {
  const dates = new Set<number>();
  for (const a of areas) {
    for (const ac of a.actions) {
      const raw = ac.dueDate;
      dates.add(Math.min(raw ? Date.parse(raw) : targetMs, targetMs));
    }
  }
  const sortedMs = [...dates].sort((a, b) => a - b);
  return sortedMs.map((ms) => ({ ms, pct: plannedAsOf(areas, ms, targetMs) }));
}

/** Valor interpolado numa data qualquer — mesma reta da timeline, avaliada
 * num ponto exato (início do mês, "hoje", etc). */
function valueAt(timeline: { ms: number; pct: number }[], ms: number): number {
  if (timeline.length === 0) return 0;
  if (ms <= timeline[0].ms) return timeline[0].pct;
  const lastPt = timeline[timeline.length - 1];
  if (ms >= lastPt.ms) return lastPt.pct;
  for (let i = 1; i < timeline.length; i++) {
    if (ms <= timeline[i].ms) {
      const a = timeline[i - 1];
      const b = timeline[i];
      const t = (ms - a.ms) / (b.ms - a.ms || 1);
      return a.pct + t * (b.pct - a.pct);
    }
  }
  return lastPt.pct;
}

function fmtDay(ms: number): string {
  return new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

// ---------------------------------------------------------------------------
// Cards de resumo (nº de áreas, nº de ações, progresso geral)
// ---------------------------------------------------------------------------

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4" style={{ borderColor: brand.border }}>
      <p className="text-xs font-medium" style={{ color: brand.muted }}>{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: brand.ink }}>{value}</p>
      {sub && <p className="mt-0.5 text-xs" style={{ color: brand.muted }}>{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barra horizontal por área — "Área 1: 80%" estilo "Entregas por pessoa"
// ---------------------------------------------------------------------------

const STATUS_ORDER: Status[] = ["todo", "doing", "done"];
const STATUS_COLOR: Record<Status, string> = { todo: brand.gray, doing: brand.orange, done: brand.teal };
const STATUS_FULL_LABEL: Record<Status, string> = {
  todo: "Não iniciada",
  doing: "Em progresso",
  done: "Finalizada",
};

/** Legenda — uma vez só pro painel, não repetida em cada barra. */
function StatusLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: brand.muted }}>
      {STATUS_ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
          {STATUS_FULL_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

function AreaBars({ areas }: { areas: Area[] }) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = useMemo(
    () =>
      [...areas]
        .map((a) => {
          const counts: Record<Status, number> = { todo: 0, doing: 0, done: 0 };
          for (const ac of a.actions) counts[ac.status]++;
          return { title: a.title, pct: areaProgress(a), actionCount: a.actions.length, counts };
        })
        .sort((a, b) => b.pct - a.pct),
    [areas],
  );

  if (rows.length === 0) return null;

  const toggle = (title: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <div className="rounded-lg border bg-white p-4" style={{ borderColor: brand.border }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: brand.ink }}>
          Progresso por área
        </p>
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className="text-xs font-medium hover:underline"
          style={{ color: brand.muted }}
        >
          {panelOpen ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      {panelOpen && (
        <>
          <StatusLegend />
          <div className="space-y-2.5">
            {rows.map((r) => {
              const isOpen = expanded.has(r.title);
              return (
                <div key={r.title} className={isOpen ? "space-y-1.5" : "flex items-center gap-3"}>
                  <button
                    type="button"
                    onClick={() => toggle(r.title)}
                    className={
                      isOpen
                        ? "block w-full text-left text-xs font-medium"
                        : "w-52 shrink-0 truncate text-left text-xs hover:underline"
                    }
                    style={{ color: brand.ink }}
                    title={isOpen ? "Clique para recolher" : r.title}
                  >
                    {isOpen ? r.title : shortAreaLabel(r.title, 32)}
                  </button>
                  <div className="flex flex-1 items-center gap-3">
                    <div
                      className="flex h-2.5 flex-1 gap-0.5 overflow-hidden rounded-full"
                      style={{ background: brand.graySoft }}
                    >
                      {STATUS_ORDER.map((s) => {
                        const count = r.counts[s];
                        if (count === 0) return null;
                        return (
                          <div
                            key={s}
                            className="h-full first:rounded-l-full last:rounded-r-full"
                            style={{
                              width: `${(count / r.actionCount) * 100}%`,
                              background: STATUS_COLOR[s],
                            }}
                            title={`${STATUS_FULL_LABEL[s]}: ${count}`}
                          />
                        );
                      })}
                    </div>
                    <span className="w-28 shrink-0 text-right text-xs" style={{ color: brand.muted }}>
                      {formatPercent(r.pct)} · {r.actionCount} {r.actionCount === 1 ? "ação" : "ações"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Concluído × Esperado" até 31/12/2026 — linha sólida (real) + tracejada
// (ritmo necessário), marcador de hoje, tooltip ao passar o mouse.
// ---------------------------------------------------------------------------

const W = 720;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 34 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const YEAR = 2026;
const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const YEAR_START_MS = Date.UTC(YEAR, 0, 1);

function BurndownChart({ areas }: { areas: Area[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState<number | null>(null); // null = ano inteiro

  const targetMs = Date.parse(TARGET_ISO);
  const doneTimeline = useMemo(() => buildDoneTimeline(areas), [areas]);
  const plannedTimeline = useMemo(() => buildPlannedTimeline(areas, targetMs), [areas, targetMs]);

  if (doneTimeline.length === 0) {
    return (
      <div
        className="flex h-40 flex-col items-center justify-center rounded-lg border text-center text-sm"
        style={{ borderColor: brand.border, color: brand.muted }}
      >
        <p>Ainda não tem ação Finalizada com prazo preenchido.</p>
        <p className="mt-1 text-xs">
          Marca alguma ação como Finalizada e preenche o Prazo (em "Preencher à mão" ou "Colar
          tabela") pra essa curva aparecer.
        </p>
      </div>
    );
  }

  const todayMs = Date.now();

  const domainStart =
    viewMonth == null ? YEAR_START_MS : Date.UTC(YEAR, viewMonth, 1);
  const domainEnd =
    viewMonth == null ? targetMs : Date.UTC(YEAR, viewMonth + 1, 1) - 1;

  const xScale = (ms: number) =>
    PAD.left + ((ms - domainStart) / (domainEnd - domainStart)) * PLOT_W;
  const yScale = (frac: number) => PAD.top + (1 - Math.min(1, Math.max(0, frac))) * PLOT_H;

  const toPoints = (timeline: { ms: number; pct: number }[], windowEnd: number) => {
    if (windowEnd < domainStart) return []; // janela inteira no futuro — nada real ainda
    const inWindow = timeline.filter((r) => r.ms >= domainStart && r.ms <= windowEnd);
    // sempre ancora nas bordas do domínio visível, senão a linha parece
    // começar/acabar no meio do gráfico quando o filtro de mês corta pontos.
    const withEdges = [
      { ms: domainStart, pct: valueAt(timeline, domainStart) },
      ...inWindow,
      { ms: windowEnd, pct: valueAt(timeline, windowEnd) },
    ];
    return withEdges.map((r) => ({ x: xScale(r.ms), y: yScale(r.pct), ms: r.ms, pct: r.pct }));
  };

  // "Concluído" é dado real — nunca se estende pro futuro além de hoje.
  // "Esperado" é plano, então vai até o fim da janela normalmente.
  const realPoints = toPoints(doneTimeline, Math.min(domainEnd, todayMs));
  const plannedPoints = toPoints(plannedTimeline, domainEnd);
  // pontos reais de verdade (sem as bordas sintéticas) — só esses viram
  // marcador/tooltip, pra não sugerir que houve um relatório em datas que
  // são só o início/fim da janela visível.
  const realMarkers = doneTimeline.filter((r) => r.ms >= domainStart && r.ms <= domainEnd);

  const expectedLine = plannedPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const realLine = realPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const latest = doneTimeline[doneTimeline.length - 1];
  const expectedToday = valueAt(plannedTimeline, todayMs);
  // positivo = à frente do planejado; negativo = atrás. 2 p.p. de folga pra
  // não oscilar entre "dentro"/"fora" por uma diferença insignificante.
  const scheduleDelta = latest.pct - expectedToday;
  const onTrack = scheduleDelta >= -0.02;
  const ahead = scheduleDelta > 0.02;

  const markerPoints = realMarkers.map((r) => ({ x: xScale(r.ms), y: yScale(r.pct), ms: r.ms, pct: r.pct }));

  const onMove = (e: React.MouseEvent) => {
    if (!markerPoints.length) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    markerPoints.forEach((p, i) => {
      const d = Math.abs(p.x - localX);
      if (d < best) { best = d; nearest = i; }
    });
    setHoverIdx(nearest);
  };

  const todayX = xScale(todayMs);
  const showTodayMarker = todayMs >= domainStart && todayMs <= domainEnd;
  // rótulo de "hoje" e a data de borda do domínio colidiam quando "hoje"
  // cai perto do fim da janela visível (comum no filtro por mês) — some
  // com o rótulo da borda nesse caso, "Hoje" já é mais informativo.
  const todayNearEdge = showTodayMarker && Math.abs(todayX - xScale(domainEnd)) < 28;
  const hover = hoverIdx != null ? markerPoints[hoverIdx] : null;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  // ticks de mês só fazem sentido olhando o ano inteiro
  const monthTicks =
    viewMonth == null
      ? Array.from({ length: 12 }, (_, m) => ({ ms: Date.UTC(YEAR, m, 1), label: MONTH_NAMES[m] }))
      : [];

  return (
    <div className="rounded-lg border bg-white p-4" style={{ borderColor: brand.border }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: brand.ink }}>
          Real vs. Planejado
        </p>
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className="text-xs font-medium hover:underline"
          style={{ color: brand.muted }}
        >
          {panelOpen ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      {panelOpen && (
      <>
      <div className="mb-4 flex flex-wrap items-start gap-6">
        {/* "Realizado" some daqui de propósito — é o mesmo número do card
            "Progresso geral" no topo da página; duas vezes é ruído. */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: brand.muted }}>
            <svg width="14" height="2" className="shrink-0"><line x1="0" y1="1" x2="14" y2="1" stroke={brand.gray} strokeWidth="2" strokeDasharray="3,2" /></svg>
            Planejado (baseline) hoje
          </p>
          <p className="mt-1 text-xl font-semibold" style={{ color: brand.ink }}>
            {formatPercent(expectedToday)}
          </p>
        </div>
        <div
          className="ml-auto self-center rounded-full px-3 py-1 text-xs font-semibold"
          style={
            ahead
              ? { background: brand.tealSoft, color: brand.tealText }
              : onTrack
                ? { background: brand.tealSoft, color: brand.tealText }
                : { background: brand.orangeSoft, color: brand.orangeText }
          }
        >
          {ahead
            ? `🚀 ${formatPercent(scheduleDelta)} à frente do cronograma`
            : onTrack
              ? "Dentro do cronograma"
              : `⚠️ ${formatPercent(-scheduleDelta)} atrás do planejado`}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs font-medium" style={{ color: brand.muted }}>
          Período:
        </label>
        <select
          value={viewMonth ?? ""}
          onChange={(e) => setViewMonth(e.target.value === "" ? null : Number(e.target.value))}
          className="rounded-md border px-2 py-1 text-xs font-medium outline-none"
          style={{ borderColor: brand.border, color: brand.ink }}
        >
          <option value="">Ano inteiro (jan–dez)</option>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i}>{m}/{YEAR}</option>
          ))}
        </select>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yScale(t)} y2={yScale(t)} stroke={brand.border} strokeWidth={1} />
            <text x={PAD.left - 8} y={yScale(t) + 3} fontSize={10} textAnchor="end" fill={brand.muted}>
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        {monthTicks.map(({ ms, label }) => (
          <text key={label} x={xScale(ms)} y={H - PAD.bottom + 14} fontSize={9} textAnchor="middle" fill={brand.muted}>
            {label}
          </text>
        ))}
        {!(showTodayMarker && Math.abs(todayX - xScale(domainStart)) < 28) && (
          <text x={xScale(domainStart)} y={PAD.top - 4} fontSize={10} fill={brand.muted}>
            {fmtDay(domainStart)}
          </text>
        )}
        {!todayNearEdge && (
          <text x={xScale(domainEnd)} y={PAD.top - 4} fontSize={10} textAnchor="end" fill={brand.muted}>
            {fmtDay(domainEnd)}
          </text>
        )}

        <path d={expectedLine} fill="none" stroke={brand.gray} strokeWidth={2} strokeDasharray="5,4" />

        {showTodayMarker && (
          <g>
            <line x1={todayX} x2={todayX} y1={PAD.top} y2={H - PAD.bottom} stroke={brand.ink} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
            <text x={todayX} y={PAD.top - 4} fontSize={10} fontWeight={600} textAnchor="middle" fill={brand.ink}>Hoje</text>
          </g>
        )}

        <path d={realLine} fill="none" stroke={brand.orange} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {markerPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={brand.orange} stroke="white" strokeWidth={2} />
        ))}

        {hover && (
          <line x1={hover.x} x2={hover.x} y1={PAD.top} y2={H - PAD.bottom} stroke={brand.ink} strokeWidth={1} opacity={0.25} />
        )}
      </svg>

      {/* altura fixa — sem isso, o card "pulava" de tamanho ao entrar/sair do
          hover, já que esse texto só existe no DOM quando há um ponto sob o mouse. */}
      <div className="mt-1 h-4 text-center text-xs" style={{ color: brand.ink }}>
        {hover ? (
          <>
            <b>{fmtDay(hover.ms)}</b> — {formatPercent(hover.pct)} concluído
          </>
        ) : viewMonth != null && realPoints.length === 0 ? (
          <span style={{ color: brand.muted }}>
            Sem relatórios registrados em {MONTH_NAMES[viewMonth]}/{YEAR}.
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: brand.muted }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3" style={{ background: brand.orange }} /> Realizado (acumulado)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="14" height="2"><line x1="0" y1="1" x2="14" y2="1" stroke={brand.gray} strokeWidth="2" strokeDasharray="3,2" /></svg>
          Planejado (com base no cronograma das ações)
        </span>
      </div>
      </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Análise de Gargalos (Pareto 80/20) — poucas áreas concentram a maior parte
// das ações que ainda faltam (não iniciadas + em progresso). Identifica o
// menor grupo de áreas cuja soma de pendências cruza 80% do total — essas
// são o "gargalo" a priorizar.
// ---------------------------------------------------------------------------

interface AreaPending {
  title: string;
  pending: number;
  total: number;
}

function computePending(areas: Area[]): AreaPending[] {
  return areas
    .map((a) => ({
      title: a.title,
      pending: a.actions.filter((ac) => ac.status !== "done").length,
      total: a.actions.length,
    }))
    .filter((a) => a.pending > 0)
    .sort((a, b) => b.pending - a.pending);
}

/** Lista em português: "A", "A e B", "A, B e C". */
function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

const PW = 680;
const PH = 240;
const PPAD = { top: 16, right: 16, bottom: 46, left: 34 };
const PPLOT_W = PW - PPAD.left - PPAD.right;
const PPLOT_H = PH - PPAD.top - PPAD.bottom;

function ParetoAnalysis({ areas }: { areas: Area[] }) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const rows = useMemo(() => computePending(areas), [areas]);
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);

  // menor prefixo (maiores pendências primeiro) cuja soma cruza 80% do total.
  let running = 0;
  let vitalCount = 0;
  for (const r of rows) {
    running += r.pending;
    vitalCount++;
    if (running / totalPending >= 0.8) break;
  }
  const vitalRows = rows.slice(0, vitalCount);
  const vitalPct = totalPending ? (vitalRows.reduce((s, r) => s + r.pending, 0) / totalPending) * 100 : 0;
  const concentrated = vitalCount > 0 && vitalCount < rows.length;

  return (
    <div className="rounded-lg border bg-white p-4" style={{ borderColor: brand.border }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: brand.ink }}>
          Análise de gargalos (Pareto 80/20)
        </p>
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className="text-xs font-medium hover:underline"
          style={{ color: brand.muted }}
        >
          {panelOpen ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      {panelOpen && (
        <>
          {totalPending === 0 ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              🎉 Nenhuma ação pendente — todas as áreas estão finalizadas.
            </p>
          ) : (
            <>
              <div
                className="mb-4 rounded-md border p-3 text-sm leading-relaxed"
                style={{ borderColor: brand.orangeSoft, background: brand.orangeSoft, color: brand.orangeText }}
              >
                {concentrated ? (
                  <>
                    <b>⚠️ Atenção Focada:</b>{" "}
                    {vitalCount === 1 ? "a área" : "as áreas"}{" "}
                    <b>
                      {joinPt(
                        vitalRows.map(
                          (r) =>
                            `"${shortAreaLabel(r.title, 40)}" (${r.pending} ${r.pending === 1 ? "ação pendente" : "ações pendentes"})`,
                        ),
                      )}
                    </b>{" "}
                    {vitalCount === 1 ? "concentra" : "concentram"}{" "}
                    <b>{vitalPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</b> das{" "}
                    {totalPending} ações pendentes do seu PDI.{" "}
                    <b>
                      Priorizar {vitalCount === 1 ? "esse bloco" : "esses blocos"} primeiro destrava a
                      maior parte do que falta para fechar o PDI.
                    </b>
                  </>
                ) : (
                  <>
                    As {totalPending} ações pendentes estão bem distribuídas entre as {rows.length}{" "}
                    áreas com pendência — não há um gargalo concentrado para priorizar.
                  </>
                )}
              </div>

              <ParetoChart rows={rows} vitalCount={vitalCount} svgRef={svgRef} hoverIdx={hoverIdx} setHoverIdx={setHoverIdx} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function ParetoChart({
  rows,
  vitalCount,
  svgRef,
  hoverIdx,
  setHoverIdx,
}: {
  rows: AreaPending[];
  vitalCount: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  hoverIdx: number | null;
  setHoverIdx: (i: number | null) => void;
}) {
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);
  const n = rows.length;
  const xStep = PPLOT_W / n;
  const xCenter = (i: number) => PPAD.left + xStep * (i + 0.5);
  const yScale = (pct: number) => PPAD.top + (1 - Math.min(1, Math.max(0, pct / 100))) * PPLOT_H;

  let running = 0;
  const points = rows.map((r, i) => {
    running += r.pending;
    const cumPct = (running / totalPending) * 100;
    return { ...r, i, indivPct: (r.pending / totalPending) * 100, cumPct };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xCenter(i)} ${yScale(p.cumPct)}`).join(" ");
  const barW = Math.min(48, xStep * 0.55);
  const hover = hoverIdx != null ? points[hoverIdx] : null;

  const onMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * PW;
    let nearest = 0;
    let best = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(xCenter(i) - localX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  };

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PW} ${PH}`}
        className="w-full touch-none select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={PPAD.left} x2={PW - PPAD.right} y1={yScale(t)} y2={yScale(t)} stroke={brand.border} strokeWidth={1} />
            <text x={PPAD.left - 8} y={yScale(t) + 3} fontSize={10} textAnchor="end" fill={brand.muted}>
              {t}%
            </text>
          </g>
        ))}
        {/* linha de referência 80% — onde cruza é o corte do gargalo */}
        <line
          x1={PPAD.left}
          x2={PW - PPAD.right}
          y1={yScale(80)}
          y2={yScale(80)}
          stroke={brand.muted}
          strokeWidth={1}
          strokeDasharray="4,3"
        />
        <text x={PW - PPAD.right} y={yScale(80) - 4} fontSize={9} textAnchor="end" fill={brand.muted}>
          80%
        </text>

        {points.map((p, i) => {
          const isVital = i < vitalCount;
          const h = (p.indivPct / 100) * PPLOT_H;
          return (
            <g key={p.title}>
              <rect
                x={xCenter(i) - barW / 2}
                y={PPAD.top + PPLOT_H - h}
                width={barW}
                height={h}
                rx={3}
                fill={isVital ? brand.orange : brand.gray}
                opacity={hover && hover.i !== i ? 0.55 : 1}
              />
              <text
                x={xCenter(i)}
                y={PPAD.top + PPLOT_H - h - 6}
                fontSize={10}
                fontWeight={600}
                textAnchor="middle"
                fill={brand.ink}
              >
                {p.pending}
              </text>
              <text
                x={xCenter(i)}
                y={PH - PPAD.bottom + 14}
                fontSize={9}
                textAnchor="middle"
                fill={brand.muted}
              >
                <title>{p.title}</title>
                {shortAreaLabel(p.title, 16)}
              </text>
            </g>
          );
        })}

        <path d={linePath} fill="none" stroke={brand.ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={p.title}
            cx={xCenter(i)}
            cy={yScale(p.cumPct)}
            r={hover?.i === i ? 5 : 3.5}
            fill={brand.ink}
            stroke="white"
            strokeWidth={1.5}
          />
        ))}

        {hover && (
          <line
            x1={xCenter(hover.i)}
            x2={xCenter(hover.i)}
            y1={PPAD.top}
            y2={PPAD.top + PPLOT_H}
            stroke={brand.ink}
            strokeWidth={1}
            opacity={0.2}
          />
        )}
      </svg>

      <div className="mt-1 h-4 text-center text-xs" style={{ color: brand.ink }}>
        {hover && (
          <>
            <b>{hover.title}</b> — {hover.pending} pendente(s) ·{" "}
            {hover.cumPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% acumulado
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: brand.muted }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: brand.orange }} /> Gargalo (top até 80%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: brand.gray }} /> Demais pendências
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3" style={{ background: brand.ink }} /> % acumulada
        </span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<Status, string> = { todo: "não iniciadas", doing: "em andamento", done: "finalizadas" };

export function ProgressDashboard({ areas }: { areas: Area[] }) {
  const totalActions = areas.reduce((n, a) => n + a.actions.length, 0);
  const overall = overallProgress(areas);

  const areaBreakdown = useMemo(() => {
    const byStatus: Record<Status, number> = { todo: 0, doing: 0, done: 0 };
    for (const a of areas) byStatus[a.status]++;
    return (["done", "doing", "todo"] as Status[])
      .filter((s) => byStatus[s] > 0)
      .map((s) => `${byStatus[s]} ${STATUS_LABEL[s]}`)
      .join(" · ");
  }, [areas]);

  const actionBreakdown = useMemo(() => {
    const byStatus: Record<Status, number> = { todo: 0, doing: 0, done: 0 };
    for (const a of areas) for (const ac of a.actions) byStatus[ac.status]++;
    return (["done", "doing", "todo"] as Status[])
      .filter((s) => byStatus[s] > 0)
      .map((s) => `${byStatus[s]} ${STATUS_LABEL[s]}`)
      .join(" · ");
  }, [areas]);

  // delta real desde o início do mês — reaproveita a mesma timeline
  // derivada dos prazos que alimenta o gráfico, nada inventado.
  const monthDelta = useMemo(() => {
    const timeline = buildDoneTimeline(areas);
    if (timeline.length === 0) return null;
    const now = new Date();
    const monthStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const pp = Math.round((overall - valueAt(timeline, monthStartMs)) * 1000) / 10;
    return pp;
  }, [areas, overall]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Áreas de desenvolvimento" value={String(areas.length)} sub={areaBreakdown || undefined} />
        <StatTile label="Ações no total" value={String(totalActions)} sub={actionBreakdown || undefined} />
        <StatTile
          label="Progresso geral"
          value={formatPercent(overall)}
          sub={
            monthDelta != null
              ? `${monthDelta >= 0 ? "subiu" : "caiu"} ${Math.abs(monthDelta).toFixed(1).replace(".", ",")} pontos percentuais neste mês`
              : undefined
          }
        />
      </div>

      <BurndownChart areas={areas} />
      <AreaBars areas={areas} />
      <ParetoAnalysis areas={areas} />
    </div>
  );
}
