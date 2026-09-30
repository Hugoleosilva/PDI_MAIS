import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setShapes } from "@/lib/pdi-repo";
import { shapeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const bodySchema = z.object({ shapes: z.array(shapeSchema).max(60) });

/** PUT /api/pdi/shapes — substitui a lista de quadros de anotação do canvas. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  await setShapes(session.user.id, parsed.data.shapes);
  return NextResponse.json({ ok: true });
}
