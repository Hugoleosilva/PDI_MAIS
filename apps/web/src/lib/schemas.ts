import { z } from "zod";

const hours = z.number().min(0).max(24);

export const weekCapacitySchema = z.object({
  mon: hours,
  tue: hours,
  wed: hours,
  thu: hours,
  fri: hours,
  sat: hours,
  sun: hours,
});

/** Um bloco (PdiGroup) — usado por /api/pdi/groups e /api/pdi/canvas-presets. */
export const groupSchema = z.object({
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(120),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  order: z.number().int().min(0),
  areaIds: z.array(z.string().trim().min(1).max(64)).max(64),
  note: z.string().max(20000).optional(),
  noteColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  capacity: weekCapacitySchema.optional(),
  paused: z.boolean().optional(),
});

/** Um quadro de anotação livre (PdiShape) — usado por /api/pdi/shapes e /api/pdi/canvas-presets. */
export const shapeSchema = z.object({
  id: z.string().trim().min(1).max(64),
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive().max(4000),
  h: z.number().positive().max(4000),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  text: z.string().max(500).optional(),
});
