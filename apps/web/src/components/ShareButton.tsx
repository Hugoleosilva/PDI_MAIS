"use client";

import { useState } from "react";
import type { PdiDoc } from "@pdi-mais/core";
import { Modal } from "./Modal";

/** Liga/desliga o Modo Gestor (link público) e a autorização direta ao gestor (aba "Equipe"). */
export function ShareButton({ pdi }: { pdi: PdiDoc }) {
  const [open, setOpen] = useState(false);
  const [shareId, setShareId] = useState<string | null>(pdi.shareId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const [managerEmail, setManagerEmail] = useState(pdi.sharedWithManagerEmail ?? "");
  const [savedManagerEmail, setSavedManagerEmail] = useState(pdi.sharedWithManagerEmail ?? "");
  const [managerBusy, setManagerBusy] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [managerSaved, setManagerSaved] = useState(false);

  const link = shareId && typeof window !== "undefined" ? `${window.location.origin}/r/${shareId}` : "";

  const enable = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/pdi/share", { method: "POST" });
      const data = await res.json();
      if (data.ok) setShareId(data.shareId);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!window.confirm("Desligar o link de compartilhamento? Quem já tinha o link deixa de ver seu PDI.")) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/pdi/share", { method: "DELETE" });
      const data = await res.json();
      if (data.ok) setShareId(null);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
    }
  };

  const saveManagerEmail = async (email: string | null) => {
    if (
      email === null &&
      !window.confirm(`Revogar o acesso de ${savedManagerEmail}? Ele deixa de ver seu PDI na aba "Equipe" dele.`)
    ) {
      return;
    }
    setManagerBusy(true);
    setManagerError(null);
    setManagerSaved(false);
    try {
      const res = await fetch("/api/pdi/manager", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) throw new Error(data.error || "não consegui salvar");
      setSavedManagerEmail(email ?? "");
      setManagerEmail(email ?? "");
      setManagerSaved(true);
      setTimeout(() => setManagerSaved(false), 2000);
    } catch (e) {
      setManagerError(e instanceof Error ? e.message : "Não consegui salvar.");
    } finally {
      setManagerBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
      >
        🔗 Compartilhar
      </button>

      {open && (
        <Modal title="Modo Gestor" onClose={() => setOpen(false)}>
            <div className="border-b border-neutral-100 pb-3">
              <p className="mb-2 text-xs font-semibold text-neutral-700">
                Compartilhar com o gestor (sem link)
              </p>
              <p className="mb-2 text-xs text-neutral-500">
                Digite o e-mail do seu gestor — ele passa a ver seu PDI na aba &quot;Equipe&quot;
                dele, sem precisar de link novo toda vez.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="gestor@empresa.com"
                  className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => saveManagerEmail(managerEmail.trim() || null)}
                  disabled={managerBusy || managerEmail.trim() === savedManagerEmail}
                  aria-busy={managerBusy}
                  className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
                >
                  {managerBusy ? "Salvando…" : "Salvar"}
                </button>
              </div>
              {savedManagerEmail && (
                <button
                  type="button"
                  onClick={() => saveManagerEmail(null)}
                  disabled={managerBusy}
                  className="mt-2 text-xs font-medium text-red-700 hover:underline disabled:opacity-40"
                >
                  Revogar acesso de {savedManagerEmail}
                </button>
              )}
              {managerSaved && <p className="mt-1 text-xs text-emerald-600">Salvo!</p>}
              {managerError && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {managerError}
                </p>
              )}
            </div>

            <p className="text-xs text-neutral-500">
              Ou gere um link — quem abrir vê seu PDI exatamente como está organizado no canvas,
              sem conseguir editar nada.
            </p>

            {shareId ? (
              <>
                <div className="flex items-center gap-2 rounded-md border border-neutral-200 p-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 truncate bg-transparent text-xs text-neutral-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={copy}
                    className="shrink-0 rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100"
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={disable}
                  disabled={busy}
                  aria-busy={busy}
                  className="self-start rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {busy ? "Desligando…" : "Desligar compartilhamento"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={enable}
                disabled={busy}
                aria-busy={busy}
                className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {busy ? "Gerando…" : "Gerar link de compartilhamento"}
              </button>
            )}
            {error && (
              <p role="alert" className="text-xs text-red-600">
                Não consegui fazer isso agora. Tenta de novo.
              </p>
            )}
        </Modal>
      )}
    </>
  );
}
