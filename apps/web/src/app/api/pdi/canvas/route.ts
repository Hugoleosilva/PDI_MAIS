import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setCanvas } from "@/lib/pdi-repo";

export const runtime = "nodejs";

const num = z.number().finite();
const pos = z.object({ x: num, y: num });
const box = z.object({ x: num, y: num, w: num.positive(), h: num.positive() });

const bodySchema = z.object({
  positions: z.record(z.string().max(64), pos).optional(),
  frames: z.record(z.string().max(64), box).optional(),
});

/** PUT /api/pdi/canvas — salva posições arrastadas e frames manuais. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  await setCanvas(session.user.id, parsed.data);
  return NextResponse.json({ ok: true });
}
