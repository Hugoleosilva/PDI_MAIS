import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildDiagnosisPrompt, parseDiagnosisResponse } from "@pdi-mais/core";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { callGemini } from "@/lib/gemini";

export const runtime = "nodejs";

/**
 * POST /api/diagnosis
 * "Assistente de desenvolvimento": o Gemini analisa o PDI atual e devolve
 * pontos fortes/a melhorar + sugestão de novas áreas/ações — nada é criado
 * aqui, só devolvido pro usuário revisar (ver DevelopmentAssistant.tsx).
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const pdi = await getPdiByUserId(session.user.id);
  if (!pdi) {
    return NextResponse.json({ ok: false, error: "PDI não encontrado" }, { status: 404 });
  }

  const prompt = buildDiagnosisPrompt(pdi);
  const result = await callGemini(prompt);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  try {
    const suggestion = parseDiagnosisResponse(result.text);
    return NextResponse.json({ ok: true, ...suggestion });
  } catch (e) {
    // loga a resposta crua inteira no terminal do servidor — se isso
    // acontecer de novo, dá pra ver exatamente o que o Gemini mandou, sem
    // precisar reproduzir às cegas.
    console.error("[diagnosis] falha ao interpretar resposta do Gemini:", result.text);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Não consegui interpretar a resposta." },
      { status: 502 },
    );
  }
}
