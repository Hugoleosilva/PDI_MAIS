import { z } from "zod";
import { actionKindFromLabel, areaKindFromLabel, statusFromLabel } from "./labels";

/** Data ISO simples (YYYY-MM-DD). */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate deve estar no formato YYYY-MM-DD");

/** Status aceita rótulo da plataforma ("Não iniciado") ou canônico ("todo"). */
const statusInput = z
  .string()
  .default("todo")
  .transform(statusFromLabel);

/**
 * Ação como chega no payload de sync (da extensão ou do import manual).
 * IDs e status derivado da área NÃO vêm daqui — são calculados no merge.
 */
export const incomingActionSchema = z.object({
  title: z.string().trim().min(1, "título da ação vazio"),
  kind: z
    .string()
    .optional()
    .transform(actionKindFromLabel),
  status: statusInput,
  dueDate: isoDate.optional(),
  description: z.string().trim().min(1).optional(),
  estimatedHours: z.number().nonnegative().optional(),
  unitsTotal: z.number().int().positive().optional(),
  unitsDone: z.number().int().nonnegative().optional(),
  unitsLabel: z.string().trim().min(1).max(30).optional(),
  hoursDone: z.number().nonnegative().optional(),
  completedAt: isoDate.optional(),
  certificateUrl: z.string().trim().min(1).max(500).optional(),
});

export const incomingAreaSchema = z.object({
  title: z.string().trim().min(1, "título da área vazio"),
  kind: z
    .string()
    .optional()
    .transform(areaKindFromLabel),
  description: z.string().trim().min(1).optional(),
  actions: z.array(incomingActionSchema).default([]),
});

/** Corpo aceito por POST /api/sync. */
export const syncPayloadSchema = z.object({
  root: z.object({
    title: z.string().trim().min(1, "nome do ciclo vazio"),
    track: z.string().trim().min(1).optional(),
  }),
  areas: z.array(incomingAreaSchema).default([]),
});

/** Forma de ENTRADA (antes dos transforms) — usada por fixtures e chamadas. */
export type SyncPayloadInput = z.input<typeof syncPayloadSchema>;
/** Forma de SAÍDA (depois dos transforms) — o que o merge recebe. */
export type SyncPayload = z.output<typeof syncPayloadSchema>;
