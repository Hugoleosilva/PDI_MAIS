import { statusFromLabel } from "./labels";
import type { SyncPayloadInput } from "./schema";

export interface ImportResult {
  payload: SyncPayloadInput;
  warnings: string[];
  areaCount: number;
  actionCount: number;
}

const HEADER_HINTS = [
  "area",
  "área",
  "acao",
  "ação",
  "status",
  "prazo",
  "titulo",
  "título",
  "descri",
  "tipo",
];
const KNOWN_STATUS =
  /(n[aã]o inici|em progresso|em andamento|finaliz|conclu|^\s*todo\s*$|^\s*doing\s*$|^\s*done\s*$)/i;

/** Detecta o separador pela 1ª linha: tab > ; > , */
function detectSep(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.includes("\t")) return "\t";
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  return semi > comma ? ";" : ",";
}

/**
 * Tokenizador estilo RFC 4180: campos entre aspas podem conter o separador,
 * quebras de linha e aspas escapadas (`""`).
 */
function parseDelimited(text: string, sep: string): string[][] {
  const s = text.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function parseDate(raw: string): { date?: string; ok: boolean } {
  const s = raw.trim();
  if (!s) return { ok: true };
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

const clean = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t.length ? t : undefined;
};

/**
 * Converte uma tabela colada/CSV numa payload de PDI.
 *
 * Colunas, nesta ordem:
 *   1. Área de desenvolvimento          (obrigatória)
 *   2. Descrição da área
 *   3. Ação                             (obrigatória)
 *   4. Descrição da ação
 *   5. Tipo da ação                     (Desafio profissional | Treinamento e estudo | Mentoria e feedbacks)
 *   6. Prazo da ação                    (DD/MM/AAAA, DD/MM/AA ou AAAA-MM-DD)
 *   7. Status da ação                   (Não iniciado | Em progresso | Finalizado)
 *
 * Descrições longas: envolva em "aspas" (podem ter vírgulas e quebras de linha).
 * Separador (`,` `;` tab) e cabeçalho são detectados sozinhos. Linhas
 * problemáticas viram aviso — o resto entra (sync parcial).
 */
export function parseImportTable(
  text: string,
  root: { title: string; track?: string },
): ImportResult {
  const warnings: string[] = [];
  const sep = detectSep(text);
  const rows = parseDelimited(text, sep);

  if (rows.length === 0) {
    return { payload: { root, areas: [] }, warnings: ["Nada para importar."], areaCount: 0, actionCount: 0 };
  }

  const firstCells = rows[0].map((c) => c.trim().toLowerCase());
  const hasHeader =
    firstCells.length >= 2 &&
    firstCells.filter((c) => HEADER_HINTS.some((h) => c.includes(h))).length >= 2;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  type Area = NonNullable<SyncPayloadInput["areas"]>[number];
  const areas = new Map<string, Area>();
  let actionCount = 0;

  dataRows.forEach((cells, i) => {
    const n = i + 1;
    const areaTitle = clean(cells[0]);
    const areaDesc = clean(cells[1]);
    const actionTitle = clean(cells[2]);
    const actionDesc = clean(cells[3]);
    const kindRaw = clean(cells[4]);
    const dateRaw = (cells[5] ?? "").trim();
    const statusRaw = (cells[6] ?? "").trim();

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
    if (areaDesc && !area.description) area.description = areaDesc;

    const action: NonNullable<Area["actions"]>[number] = {
      title: actionTitle,
      kind: kindRaw ?? "Treinamento e estudo",
      status: "todo",
    };
    if (actionDesc) action.description = actionDesc;

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
