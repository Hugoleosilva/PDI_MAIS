import { NextResponse } from "next/server";
import { seedHugo, syncPayloadSchema } from "@pdi-mais/core";
import { auth } from "@/auth";
import { applySync } from "@/lib/pdi-repo";

export const runtime = "nodejs";

/**
 * GET /api/dev/seed — só em desenvolvimento.
 * Escreve o PDI de exemplo (packages/core/src/fixtures/seed-hugo.ts) para o
 * usuário logado e volta para o canvas. Serve pra testar a Rodada 2 sem a
 * extensão nem o import manual.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "disponível só em dev" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const payload = syncPayloadSchema.parse(seedHugo);
  await applySync(session.user.id, payload, "manual");

  return NextResponse.redirect(new URL("/", req.url));
}
