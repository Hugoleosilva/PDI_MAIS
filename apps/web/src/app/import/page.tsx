import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { ImportTabs } from "@/components/ImportTabs";
import type { DraftArea } from "@/components/ManualBuilder";
import { AppHeader } from "@/components/AppHeader";

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
      certificateUrl: ac.certificateUrl ?? "",
    })),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F4F5]">
      <AppHeader active="import" session={session} />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 p-6">
        <h1 className="mb-6 text-xl font-bold">
          {pdi ? "Editar / importar PDI" : "Montar PDI"}
        </h1>
        <ImportTabs
          initialTitle={pdi?.root.title ?? "PDI 2026"}
          initialTrack={pdi?.root.track ?? ""}
          initialAreas={initialAreas}
          hasExisting={Boolean(pdi)}
        />
      </main>
    </div>
  );
}
