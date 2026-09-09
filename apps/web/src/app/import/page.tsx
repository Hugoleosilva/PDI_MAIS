import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { ImportForm } from "@/components/ImportForm";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const pdi = await getPdiByUserId(session.user.id);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Importar PDI</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← voltar ao canvas
        </Link>
      </div>
      <ImportForm
        initialTitle={pdi?.root.title ?? "PDI 2026"}
        initialTrack={pdi?.root.track ?? ""}
        hasExisting={Boolean(pdi)}
      />
    </main>
  );
}
