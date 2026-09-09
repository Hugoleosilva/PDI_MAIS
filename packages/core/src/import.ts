import { statusFromLabel } from "./labels";
import type { SyncPayloadInput } from "./schema";

export interface ImportResult {
  payload: SyncPayloadInput;
  warnings: string[];
  areaCount: number;
  actionCount: number;
}

const HEADER_HINTS = ["area", "área", "acao", "ação", "status", "prazo", "titulo", "título"];
const KNOWN_STATUS =
  /(n[aã]o inici|em progresso|em andamento|finaliz|conclu|^\s*todo\s*$|^\s*doing\s*$|^\s*done\s*$)/i;

/** Aceita YYYY-MM-DD, DD/MM/AAAA, DD/MM/AA (e separadores . - /). */
function parseDate(raw: string): { date?: string; ok: boolean } {
  const s = raw.trim();
  if (!s) return { ok: true }; // sem prazo é ok
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s, ok: true };
  const m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
    if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) {
      return { date: `${yy}-${mm}-${dd}`, ok: true };
    }
  }
  return { ok: false };
}

/**
 * Converte uma tabela colada/CSV numa payload de PDI.
 *
 * Colunas (nessa ordem): `Área`, `Ação`, `Status` (opcional), `Prazo` (opcional).
 * Separador detectado automaticamente: tab, `;` ou `,`. Cabeçalho é ignorado.
 * Linhas problemáticas viram aviso — o resto do import continua (sync parcial).
 */
export function parseImportTable(
  text: string,
  root: { title: string; track?: string },
): ImportResult {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { payload: { root, areas: [] }, warnings: ["Nada para importar."], areaCount: 0, actionCount: 0 };
  }

  const first = lines[0];
  const sep = first.includes("\t") ? "\t" : first.includes(";") ? ";" : ",";

  const firstCells = first.split(sep).map((c) => c.trim().toLowerCase());
  const hasHeader =
    firstCells.length >= 2 &&
    firstCells.filter((c) => HEADER_HINTS.some((h) => c.includes(h))).length >= 2;
  const rows = hasHeader ? lines.slice(1) : lines;

  type Area = NonNullable<SyncPayloadInput["areas"]>[number];
  const areas = new Map<string, Area>();
  let actionCount = 0;

  rows.forEach((line, i) => {
    const n = i + 1 + (hasHeader ? 1 : 0);
    const [areaTitle = "", actionTitle = "", statusRaw = "", dateRaw = ""] = line
      .split(sep)
      .map((c) => c.trim());

    if (!areaTitle) {
      warnings.push(`Linha ${n}: área vazia — ignorada.`);
      return;
    }
    if (!actionTitle) {
      warnings.push(`Linha ${n}: ação vazia — ignorada.`);
      return;
    }

    let area = areas.get(areaTitle);
    if (!area) {
      area = { title: areaTitle, kind: "Desenvolver", actions: [] };
      areas.set(areaTitle, area);
    }

    const action: NonNullable<Area["actions"]>[number] = {
      title: actionTitle,
      kind: "Treinamento e estudo",
      status: "todo",
    };

    if (statusRaw) {
      action.status = statusFromLabel(statusRaw);
      if (!KNOWN_STATUS.test(statusRaw)) {
        warnings.push(`Linha ${n}: status "${statusRaw}" não reconhecido — usei "Não iniciado".`);
      }
    }

    if (dateRaw) {
      const d = parseDate(dateRaw);
      if (d.date) action.dueDate = d.date;
      else if (!d.ok) {
        warnings.push(`Linha ${n}: prazo "${dateRaw}" inválido — ação importada sem prazo.`);
      }
    }

    area.actions!.push(action);
    actionCount += 1;
  });

  const list = [...areas.values()];
  return { payload: { root, areas: list }, warnings, areaCount: list.length, actionCount };
}
