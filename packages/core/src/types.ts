/** Estado canônico de uma ação ou área. Os rótulos em PT vivem em labels.ts. */
export type Status = "todo" | "doing" | "done";

/** Tipo da área de desenvolvimento (campo "Tipo" na plataforma). */
export type AreaKind = "desenvolver" | "potencializar";

/** Tipo da ação (campo "Tipo de ação" na plataforma). */
export type ActionKind =
  | "desafio_profissional"
  | "treinamento_estudo"
  | "mentoria_feedback"
  | "outro";

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
  kind: ActionKind;
  description?: string;
  status: Status;
  /** ISO date, formato YYYY-MM-DD. */
  dueDate?: string;
  source: Source;
  layout?: NodeLayout;

  // --- planejamento (Rodada 6) ---
  /** Carga horária estimada do curso/formação (horas). */
  estimatedHours?: number;
  /** Progresso granular por unidades: ex. 23 de 290 módulos. */
  unitsTotal?: number;
  unitsDone?: number;
  /** Rótulo da unidade: "módulos", "aulas", "capítulos"… */
  unitsLabel?: string;
  /** Alternativa às unidades: horas já feitas. */
  hoursDone?: number;
  /** Data (YYYY-MM-DD) em que a ação virou "Finalizado". */
  completedAt?: string;
  /** Link do certificado/comprovante (o arquivo em si fica no PDI estático). */
  certificateUrl?: string;
}

/** Horas disponíveis por dia da semana. */
export interface WeekCapacity {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface Area {
  /** Determinístico: hash do título da área normalizado. */
  id: string;
  title: string;
  kind: AreaKind;
  /** Status derivado das ações (ver deriveAreaStatus). */
  status: Status;
  order: number;
  /** Comentário/observação da área — abre ao clicar no nó (estilo FigJam). */
  description?: string;
  actions: Action[];
  layout?: NodeLayout;
}

export interface PdiRoot {
  /** Nome do ciclo, ex.: "PDI 2026". */
  title: string;
  /** Trilha / tema do PDI, ex.: "Desenvolvimento Fullstack". Subtítulo do nó raiz. */
  track?: string;
  /** Objetivo geral ("pra onde estou indo") — anotação do card raiz, igual à do bloco. */
  note?: string;
  /** Rótulo da anotação acima ("Objetivo" por padrão) — editável. */
  noteTitle?: string;
}

/**
 * Conexão manual entre dois nós do canvas (estilo n8n) — o usuário liga
 * áreas/ações que se complementam. `source`/`target` são ids de área/ação
 * (ou "root"). Nunca vem do sync.
 */
export interface PdiLink {
  id: string;
  source: string;
  target: string;
  label?: string;
}

/**
 * Bloco de agrupamento (frame) — o usuário organiza áreas semelhantes em
 * grandes blocos estratégicos. Agrupa a ÁREA inteira (as ações vão junto).
 */
export interface PdiGroup {
  id: string;
  title: string;
  /** Cor de destaque (hex). */
  color: string;
  order: number;
  /** Ids das áreas dentro do bloco. */
  areaIds: string[];
  /** Anotação livre do usuário — aparece numa nota ao lado do bloco. */
  note?: string;
  /** Cor de fundo da nota (hex). Independente da cor do bloco. */
  noteColor?: string;
  /** Horas semanais que o usuário dedica a este bloco. */
  capacity?: WeekCapacity;
  /** Pausado = de propósito fora de foco agora; some do resumo geral do Planejamento. */
  paused?: boolean;
}

/** Andamento de uma área num momento — o que fica gravado no relatório. */
export interface AreaSnapshot {
  id: string;
  title: string;
  /** 0..1 — mesma conta do card da área (areaProgress). */
  progress: number;
}

/**
 * "Fotografia" do andamento do PDI, gerada quando o usuário pede um
 * relatório. Serve para comparar: evoluiu ou não desde a última vez?
 */
export interface ProgressSnapshot {
  id: string;
  /** ISO datetime — quando o relatório foi gerado. */
  generatedAt: string;
  /** 0..1 — mesma conta do nó raiz (overallProgress). */
  overall: number;
  areas: AreaSnapshot[];
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
  /** Conexões manuais entre nós (estilo n8n). */
  links?: PdiLink[];
  /** Blocos de agrupamento de áreas. */
  groups?: PdiGroup[];
  /** Estado visual do canvas (posições arrastadas, frames manuais). */
  canvas?: PdiCanvasState;
  /** Capacidade semanal para o que está fora de qualquer bloco. */
  looseCapacity?: WeekCapacity;
  /** Histórico de relatórios de andamento (mais recente por último). */
  reports?: ProgressSnapshot[];
  /** Versões nomeadas do arranjo do canvas, salvas pelo usuário. */
  canvasPresets?: CanvasPreset[];
}

export interface PdiCanvasState {
  /** nodeId -> posição fixada pelo usuário (sobrepõe o auto-layout). */
  positions?: Record<string, { x: number; y: number }>;
  /** groupId -> caixa manual do frame (usado para blocos vazios/movidos). */
  frames?: Record<string, { x: number; y: number; w: number; h: number }>;
  /** Tamanho do card raiz, se o usuário redimensionou (arraste no canto). */
  rootSize?: { w: number; h: number };
}

/**
 * Versão nomeada do arranjo do canvas — "fotografia" de posições, frames,
 * blocos e formato de layout, salva com um nome pra recuperar depois.
 * Não interfere no arranjo "vivo" (`PdiDoc.canvas`/`groups`); é uma cópia.
 */
export interface CanvasPreset {
  id: string;
  name: string;
  createdAt: string;
  /** Formato de layout (árvore, kanban…) — valores definidos em apps/web. */
  layout: string;
  showGroups: boolean;
  positions: Record<string, { x: number; y: number }>;
  frames: Record<string, { x: number; y: number; w: number; h: number }>;
  groups: PdiGroup[];
}
