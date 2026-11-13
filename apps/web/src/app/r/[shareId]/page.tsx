import { notFound } from "next/navigation";
import { getPdiByShareId } from "@/lib/pdi-repo";
import { ReadOnlyCanvas } from "@/components/canvas/ReadOnlyCanvas";
import { brand } from "@/lib/theme";

export const dynamic = "force-dynamic";

/** Modo Gestor — visão pública read-only de um PDI, por link de compartilhamento. */
export default async function SharedPdiPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const pdi = await getPdiByShareId(shareId);
  if (!pdi) notFound();

  return (
    <div className="flex h-screen flex-col" style={{ background: brand.pageBg }}>
      <header
        className="flex h-12 shrink-0 items-center gap-3 border-b bg-white px-4"
        style={{ borderColor: brand.border }}
      >
        <span className="text-sm font-bold tracking-tight" style={{ color: brand.orange }}>
          PDI+
        </span>
        <span className="truncate text-sm font-semibold" style={{ color: brand.ink }}>
          {pdi.ownerName ?? "Sem nome"}
        </span>
        <span className="truncate text-xs" style={{ color: brand.muted }}>
          {pdi.root.title}
        </span>
        <span
          className="ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: brand.blueSoft, color: brand.blue }}
        >
          Modo Gestor — só leitura
        </span>
      </header>
      <main id="main-content" className="min-h-0 flex-1">
        <ReadOnlyCanvas pdi={pdi} />
      </main>
    </div>
  );
}
