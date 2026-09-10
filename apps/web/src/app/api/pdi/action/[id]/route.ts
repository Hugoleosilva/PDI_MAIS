import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateAction } from "@/lib/pdi-repo";

export const runtime = "nodejs";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const patchSchema = z.object({
  status: z.enum(["todo", "doing", "done"]).optional(),
  dueDate: isoDate.nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  estimatedHours: z.number().nonnegative().max(100000).nullable().optional(),
  unitsTotal: z.number().int().positive().max(100000).nullable().optional(),
  unitsDone: z.number().int().nonnegative().max(100000).nullable().optional(),
  unitsLabel: z.string().trim().min(1).max(30).nullable().optional(),
  hoursDone: z.number().nonnegative().max(100000).nullable().optional(),
});

/** PATCH /api/pdi/action/[id] — edita uma ação. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  const result = await updateAction(session.user.id, id, parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
