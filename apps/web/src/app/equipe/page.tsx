import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPercent, overallProgress } from "@pdi-mais/core";
import { auth } from "@/auth";
import { getPdisSharedWithManager } from "@/lib/pdi-repo";
import { AppHeader } from "@/components/AppHeader";
import { brand } from "@/lib/theme";

export default async function EquipePage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const shared = session.user.email ? await getPdisSharedWithManager(session.user.email) : [];

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F4F5]">
      <AppHeader active="equipe" session={session} />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 p-6">
        <h1 className="mb-2 text-xl font-bold">Equipe</h1>
        <p className="mb-6 max-w-2xl text-sm text-neutral-500">
          PDIs que seus liderados compartilharam com você ({session.user.email}), só leitura.
        </p>

        {shared.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Ninguém compartilhou o PDI com você ainda. Quem quiser compartilhar faz isso na
            própria tela, em &quot;🔗 Compartilhar&quot; → &quot;Compartilhar com o gestor&quot;.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {shared.map((p) => (
              <Link
                key={p.userId}
                href={`/equipe/${p.userId}`}
                className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: brand.border }}
              >
                <div className="text-sm font-semibold" style={{ color: brand.ink }}>
                  {p.ownerName ?? p.root.title}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: brand.muted }}>
                  {p.root.title}
                </div>
                <div className="mt-1 text-xs" style={{ color: brand.muted }}>
                  {p.areas.length} área(s) · {formatPercent(overallProgress(p.areas))} concluído
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
