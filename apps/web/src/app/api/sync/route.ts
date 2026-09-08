import { NextResponse } from "next/server";
import { syncPayloadSchema } from "@pdi-mais/core";
import { auth } from "@/auth";
import { applySync } from "@/lib/pdi-repo";

export const runtime = "nodejs";

/**
 * POST /api/sync
 * Recebe o PDI extraído pela extensão (ou pelo import manual, futuramente) e
 * faz upsert do documento do usuário autenticado.
 *
 * O `userId` vem SEMPRE da sessão — nunca do corpo da requisição.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "não autenticado" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 },
    );
  }

  const parsed = syncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "payload inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const doc = await applySync(session.user.id, parsed.data, "extension");
  const actions = doc.areas.reduce((n, area) => n + area.actions.length, 0);

  return NextResponse.json({
    ok: true,
    areas: doc.areas.length,
    actions,
    syncedAt: doc.syncedAt,
  });
}
