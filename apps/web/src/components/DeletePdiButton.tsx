"use client";

import { useState } from "react";

/** "Apagar tudo" — pede confirmação antes de chamar DELETE /api/pdi. */
export function DeletePdiButton() {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const ok = window.confirm(
      "Apagar TODO o seu PDI (áreas, ações e canvas)? Essa ação não pode ser desfeita.",
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/pdi", { method: "DELETE" });
      if (!res.ok) throw new Error("falhou");
      window.location.href = "/";
    } catch {
      alert("Não consegui apagar — tenta de novo.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full rounded-md px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "Apagando..." : "Apagar tudo"}
    </button>
  );
}
