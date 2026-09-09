import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { addLink, removeLink } from "@/lib/pdi-repo";

export const runtime = "nodejs";

const nodeId = z.string().trim().min(1).max(64);

const createSchema = z.object({
  id: z.string().trim().min(1).max(64),
  source: nodeId,
  target: nodeId,
  label: z.string().trim().min(1).max(80).optional(),
});

/** POST /api/pdi/link — cria conexão manual entre dois nós. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  const result = await addLink(session.user.id, parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}

/** DELETE /api/pdi/link?id=... — remove uma conexão. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id ausente" }, { status: 400 });
  }

  await removeLink(session.user.id, id);
  return NextResponse.json({ ok: true });
}
