import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setManagerEmail } from "@/lib/pdi-repo";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().email().max(200).nullable(),
});

/** PUT /api/pdi/manager — autoriza (ou revoga, com email: null) o gestor a ver o PDI sem link. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "e-mail inválido" }, { status: 400 });
  }

  await setManagerEmail(session.user.id, parsed.data.email);
  return NextResponse.json({ ok: true });
}
