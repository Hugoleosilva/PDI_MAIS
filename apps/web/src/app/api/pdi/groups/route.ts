import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setGroups } from "@/lib/pdi-repo";
import { groupSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const bodySchema = z.object({ groups: z.array(groupSchema).max(24) });

/** PUT /api/pdi/groups — substitui a lista de blocos. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  await setGroups(session.user.id, parsed.data.groups);
  return NextResponse.json({ ok: true });
}
