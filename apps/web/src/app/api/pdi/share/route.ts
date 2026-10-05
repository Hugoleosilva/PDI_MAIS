import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPdiByUserId, setShareId } from "@/lib/pdi-repo";

export const runtime = "nodejs";

/** POST /api/pdi/share — liga o compartilhamento (Modo Gestor), gera shareId se ainda não tiver. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const existing = await getPdiByUserId(session.user.id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "PDI não encontrado" }, { status: 404 });
  }

  const shareId = existing.shareId ?? randomUUID();
  if (!existing.shareId) await setShareId(session.user.id, shareId);
  return NextResponse.json({ ok: true, shareId });
}

/** DELETE /api/pdi/share — desliga o compartilhamento (o link antigo para de funcionar). */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  await setShareId(session.user.id, null);
  return NextResponse.json({ ok: true });
}
