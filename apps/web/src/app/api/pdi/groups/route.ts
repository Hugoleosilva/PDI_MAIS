import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setGroups } from "@/lib/pdi-repo";
import { weekCapacitySchema } from "@/lib/schemas";

export const runtime = "nodejs";

const groupSchema = z.object({
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(120),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  order: z.number().int().min(0),
  areaIds: z.array(z.string().trim().min(1).max(64)).max(64),
  note: z.string().max(2000).optional(),
  noteColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  capacity: weekCapacitySchema.optional(),
});

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
