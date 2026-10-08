import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildInsightPrompt, type InsightKind, type InsightPerspective } from "@pdi-mais/core";
import { getPdiByUserId } from "@/lib/pdi-repo";

export const runtime = "nodejs";

// Flash: rápido e barato — cabe de sobra no nível gratuito do Google AI
// Studio pro volume de uso daqui (clique ocasional de cada pessoa perto do
// 1:1, não um app de alto tráfego). "-latest": alias que o próprio Google
// Cloud recomenda na hora de criar a chave — não trava numa versão
// específica que pode ser descontinuada.
const MODEL = "gemini-flash-latest";

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY não configurada no servidor (.env.local)." },
      { status: 500 },
    );
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

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error?.message ?? `Gemini respondeu ${res.status}` },
        { status: 502 },
      );
    }
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();
    if (!text) {
      return NextResponse.json({ ok: false, error: "Gemini não devolveu texto." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro ao chamar o Gemini." },
      { status: 502 },
    );
  }
}
