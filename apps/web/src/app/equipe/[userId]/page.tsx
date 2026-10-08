import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { ReadOnlyCanvas } from "@/components/canvas/ReadOnlyCanvas";
import { GeminiButton } from "@/components/GeminiButton";
import { brand } from "@/lib/theme";

export const dynamic = "force-dynamic";

/** Visão de gestor — PDI de um liderado que autorizou este e-mail, sem link. */
export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { userId } = await params;
  const pdi = await getPdiByUserId(userId);
  // mesma resposta pra "não existe" e "existe mas não autorizou" — não
  // revela pra quem não tem acesso se o userId é válido ou não.
  if (!pdi || !session.user.email || pdi.sharedWithManagerEmail !== session.user.email) {
    notFound();
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: brand.pageBg }}>
      <header
        className="flex h-12 shrink-0 items-center gap-3 border-b bg-white px-4"
        style={{ borderColor: brand.border }}
      >
        <Link href="/equipe" className="text-sm font-medium hover:underline" style={{ color: brand.muted }}>
          ← Equipe
        </Link>
        <span className="truncate text-sm" style={{ color: brand.ink }}>{pdi.root.title}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <GeminiButton pdi={pdi} perspective="manager" />
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: brand.blueSoft, color: brand.blue }}
          >
            Visão de gestor — só leitura
          </span>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <ReadOnlyCanvas pdi={pdi} />
      </main>
    </div>
  );
}
