import { z } from "zod";

export const statusSchema = z.enum(["todo", "doing", "done"]);

/** Data ISO simples (YYYY-MM-DD). */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate deve estar no formato YYYY-MM-DD");

/**
 * Ação como chega no payload de sync (da extensão ou do import manual).
 * IDs e status derivado NÃO vêm daqui — são calculados no merge.
 */
export const incomingActionSchema = z.object({
  title: z.string().trim().min(1, "título da ação vazio"),
  status: statusSchema.default("todo"),
  dueDate: isoDate.optional(),
  description: z.string().trim().min(1).optional(),
});

export const incomingAreaSchema = z.object({
  title: z.string().trim().min(1, "título da área vazio"),
  actions: z.array(incomingActionSchema).default([]),
});

/** Corpo aceito por POST /api/sync. */
export const syncPayloadSchema = z.object({
  root: z.object({
    title: z.string().trim().min(1, "objetivo de carreira vazio"),
    note: z.string().trim().min(1).optional(),
  }),
  areas: z.array(incomingAreaSchema).default([]),
});

export type IncomingAction = z.infer<typeof incomingActionSchema>;
export type IncomingArea = z.infer<typeof incomingAreaSchema>;
export type SyncPayload = z.infer<typeof syncPayloadSchema>;
