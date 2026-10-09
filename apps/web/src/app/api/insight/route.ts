import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildInsightPrompt, type InsightKind, type InsightPerspective } from "@pdi-mais/core";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { callGemini } from "@/lib/gemini";

export const runtime = "nodejs";

/**
 * POST /api/insight
 * Chama o Gemini de verdade (a chave mora só aqui, nunca no navegador) e
 * devolve a resposta pronta — sem precisar colar o prompt manualmente no
 * site do Gemini. `userId` só é usado na perspectiva "manager" (o PDI de um
 * liderado); na perspectiva "self" o dono do PDI é sempre a sessão atual,
 * nunca o que o cliente mandar.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    kind?: InsightKind;
    perspective?: InsightPerspective;
    userId?: string;
  } | null;
  const kind = body?.kind;
  const perspective: InsightPerspective = body?.perspective === "manager" ? "manager" : "self";
  if (!kind) {
    return NextResponse.json({ ok: false, error: "kind obrigatório" }, { status: 400 });
  }

  let pdi;
  if (perspective === "manager") {
    if (!body?.userId) {
      return NextResponse.json({ ok: false, error: "userId obrigatório" }, { status: 400 });
    }
    pdi = await getPdiByUserId(body.userId);
    if (!pdi || !session.user.email || pdi.sharedWithManagerEmail !== session.user.email) {
      return NextResponse.json({ ok: false, error: "sem acesso a esse PDI" }, { status: 403 });
    }
  } else {
    pdi = await getPdiByUserId(session.user.id);
    if (!pdi) {
      return NextResponse.json({ ok: false, error: "PDI não encontrado" }, { status: 404 });
    }
  }

  const prompt = buildInsightPrompt(pdi, kind, perspective);
  const result = await callGemini(prompt);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, text: result.text });
}
