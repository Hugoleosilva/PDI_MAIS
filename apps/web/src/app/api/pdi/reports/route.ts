import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addReportSnapshot } from "@/lib/pdi-repo";

export const runtime = "nodejs";

/** POST /api/pdi/reports — gera um relatório de andamento agora e anexa ao histórico. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const snapshot = await addReportSnapshot(session.user.id);
  if (!snapshot) {
    return NextResponse.json({ ok: false, error: "PDI não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, snapshot });
}
