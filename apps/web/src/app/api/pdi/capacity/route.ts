import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setLooseCapacity } from "@/lib/pdi-repo";
import { weekCapacitySchema } from "@/lib/schemas";

export const runtime = "nodejs";

/** PUT /api/pdi/capacity — capacidade semanal para o que está fora de bloco. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = weekCapacitySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  await setLooseCapacity(session.user.id, parsed.data);
  return NextResponse.json({ ok: true });
}
