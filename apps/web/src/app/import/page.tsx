import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { ImportTabs } from "@/components/ImportTabs";
import type { DraftArea } from "@/components/ManualBuilder";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const pdi = await getPdiByUserId(session.user.id);

  const initialAreas: DraftArea[] = (pdi?.areas ?? []).map((a) => ({
    title: a.title,
    description: a.description ?? "",
    actions: a.actions.map((ac) => ({
      title: ac.title,
      description: ac.description ?? "",
      kind: ac.kind,
      dueDate: ac.dueDate ?? "",
      status: ac.status,
    })),
  }));

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {pdi ? "Editar / importar PDI" : "Montar PDI"}
        </h1>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← voltar ao canvas
        </Link>
      </div>
      <ImportTabs
        initialTitle={pdi?.root.title ?? "PDI 2026"}
        initialTrack={pdi?.root.track ?? ""}
        initialAreas={initialAreas}
        hasExisting={Boolean(pdi)}
      />
    </main>
  );
}
