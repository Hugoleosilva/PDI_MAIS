import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateRoot } from "@/lib/pdi-repo";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  track: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

/** PATCH /api/pdi/root — edita título do ciclo, trilha e o objetivo geral. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  await updateRoot(session.user.id, parsed.data);
  return NextResponse.json({ ok: true });
}
