/** Estado de uma ação ou área do PDI. */
export type Status = "todo" | "doing" | "done";

/** Posição manual de um nó no canvas. */
export interface NodeLayout {
  x: number;
  y: number;
}

/**
 * Origem do dado de uma ação.
 * - "extension": veio da extensão / import; o sync pode atualizar todos os campos.
 * - "manual": o usuário assumiu a ação pelo drawer; o sync só atualiza o título.
 *
 * DECISÃO PENDENTE (ver docs/TEST-CHECKLIST.md): hoje `source` trava a ação
 * inteira. Alternativa: rastrear override por campo.
 */
export type Source = "extension" | "manual";

export interface Action {
  /** Determinístico: hash de (título da área + título da ação) normalizados. */
  id: string;
  title: string;
  description?: string;
  status: Status;
  /** ISO date, formato YYYY-MM-DD. */
  dueDate?: string;
  source: Source;
  layout?: NodeLayout;
}

export interface Area {
  /** Determinístico: hash do título da área normalizado. */
  id: string;
  title: string;
  /** Derivado das ações (ver deriveAreaStatus). */
  status: Status;
  order: number;
  actions: Action[];
  layout?: NodeLayout;
}

export interface PdiRoot {
  title: string;
  note?: string;
}

/** Um documento por usuário na coleção `pdis`. */
export interface PdiDoc {
  /** Google `sub` — índice único. */
  userId: string;
  /** Slug aleatório para o link read-only do gestor; null se não compartilhado. */
  shareId: string | null;
  updatedAt: Date;
  /** Último sync bem-sucedido vindo da extensão; null se nunca sincronizou. */
  syncedAt: Date | null;
  root: PdiRoot;
  areas: Area[];
}
