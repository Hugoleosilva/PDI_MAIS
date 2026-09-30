import { NextResponse } from "next/server";
import { z } from "zod";
import { syncPayloadSchema } from "@pdi-mais/core";
import { auth } from "@/auth";
import { addHistoricalSnapshot } from "@/lib/pdi-repo";

export const runtime = "nodejs";

const bodySchema = z.object({
  date: z.string().date(),
  payload: syncPayloadSchema,
});

/**
 * POST /api/pdi/reports/backfill — gera um relatório de andamento RETROATIVO
 * (a partir de uma tabela colada de uma data passada) e anexa ao histórico,
 * sem tocar no PDI vivo (áreas/blocos/canvas).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  const snapshot = await addHistoricalSnapshot(
    session.user.id,
    parsed.data.date,
    parsed.data.payload,
  );
  if (!snapshot) {
    return NextResponse.json({ ok: false, error: "PDI não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, snapshot });
}
