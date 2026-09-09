import { NextResponse } from "next/server";
import { syncPayloadSchema } from "@pdi-mais/core";
import { auth } from "@/auth";
import { applySync } from "@/lib/pdi-repo";

export const runtime = "nodejs";

/**
 * POST /api/import
 * Recebe a payload já montada pelo import manual (colar tabela / CSV) e faz
 * upsert do PDI do usuário. `source: "manual"` — preserva edições locais.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = syncPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "payload inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const doc = await applySync(session.user.id, parsed.data, "manual");
  const actions = doc.areas.reduce((n, a) => n + a.actions.length, 0);
  return NextResponse.json({ ok: true, areas: doc.areas.length, actions });
}
