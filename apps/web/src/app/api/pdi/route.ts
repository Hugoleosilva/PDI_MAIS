import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";

export const runtime = "nodejs";

/**
 * GET /api/pdi
 * Retorna o documento PDI do usuário autenticado (ou null se ainda não existe).
 * Usado pelo canvas (Rodada 2).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "não autenticado" },
      { status: 401 },
    );
  }

  const pdi = await getPdiByUserId(session.user.id);
  return NextResponse.json({ ok: true, pdi });
}
