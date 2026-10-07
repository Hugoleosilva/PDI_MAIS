import type { Session } from "next-auth";
import { signOut } from "@/auth";
import { brand } from "@/lib/theme";
import { DeletePdiButton } from "./DeletePdiButton";

const TABS = [
  { key: "canvas", label: "Canvas", href: "/" },
  { key: "planejamento", label: "Planejamento", href: "/planejamento" },
  { key: "progresso", label: "Progresso", href: "/progresso" },
  { key: "equipe", label: "Equipe", href: "/equipe" },
  { key: "import", label: "Importar", href: "/import" },
] as const;

/**
 * Header compartilhado das 3 páginas (canvas, planejamento, import) — barra
 * laranja + abas, no mesmo espírito visual da plataforma de PDI do CESAR.
 */
export function AppHeader({
  active,
  session,
  rightExtra,
}: {
  active: (typeof TABS)[number]["key"];
  session: Session;
  rightExtra?: React.ReactNode;
}) {
  const name = session.user?.name ?? session.user?.email ?? "";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="flex flex-col border-b" style={{ borderColor: brand.border, background: brand.card }}>
      <div className="flex h-12 shrink-0 items-center justify-between px-4" style={{ background: brand.orange }}>
        {/* <a> normal de propósito — força recarregar, sem cache de navegação */}
        <a href="/" className="text-sm font-bold tracking-tight text-white">
          PDI+
        </a>

        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 outline-none [&::-webkit-details-marker]:hidden">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-7 w-7 rounded-full border border-white/30"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
                {initial}
              </span>
            )}
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 text-black transition-transform group-open:rotate-180"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border bg-white p-1 text-sm shadow-lg" style={{ borderColor: brand.border }}>
            <p className="truncate px-3 py-2 text-xs" style={{ color: brand.muted }}>
              {session.user?.email}
            </p>
            <DeletePdiButton />
            <div className="my-1 border-t" style={{ borderColor: brand.border }} />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded-md px-3 py-2 text-left hover:bg-neutral-100"
                style={{ color: brand.ink }}
              >
                Sair
              </button>
            </form>
          </div>
        </details>
      </div>

      <div className="flex items-center justify-between px-4">
        <nav className="flex gap-5">
          {TABS.map((t) => (
            <a
              key={t.key}
              href={t.href}
              className="border-b-2 py-2.5 text-sm font-medium transition-colors"
              style={
                active === t.key
                  ? { borderColor: brand.orange, color: brand.ink }
                  : { borderColor: "transparent", color: brand.muted }
              }
            >
              {t.label}
            </a>
          ))}
        </nav>
        {rightExtra && <div className="flex items-center gap-2 py-1.5">{rightExtra}</div>}
      </div>
    </header>
  );
}
