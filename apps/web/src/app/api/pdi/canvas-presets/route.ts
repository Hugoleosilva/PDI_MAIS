import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setCanvasPresets } from "@/lib/pdi-repo";
import { groupSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const posSchema = z.record(z.string(), z.object({ x: z.number(), y: z.number() }));
const frameSchema = z.record(
  z.string(),
  z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
);

const presetSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(60),
  createdAt: z.string(),
  layout: z.string().max(30),
  showGroups: z.boolean(),
  positions: posSchema,
  frames: frameSchema,
  groups: z.array(groupSchema).max(24),
});

const bodySchema = z.object({ presets: z.array(presetSchema).max(30) });

/** PUT /api/pdi/canvas-presets — substitui a lista de versões salvas do canvas. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  await setCanvasPresets(session.user.id, parsed.data.presets);
  return NextResponse.json({ ok: true });
}
