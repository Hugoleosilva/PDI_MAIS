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
