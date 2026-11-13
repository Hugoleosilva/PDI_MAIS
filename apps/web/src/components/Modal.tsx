"use client";

import { useEffect, useId, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Casca comum dos modais do app (Insight, Assistente, Compartilhar,
 * Relatório...) — antes cada um repetia a mesma estrutura
 * (`fixed inset-0 ... onClick={() => setOpen(false)}`) sem nenhuma semântica
 * de diálogo: sem `role="dialog"`, sem fechar com Escape, sem travar o Tab
 * dentro do modal, sem devolver o foco pra quem abriu. Centralizando aqui,
 * os 4 ganham isso de uma vez, sem repetir a lógica em cada um.
 */
export function Modal({
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
  scrollable = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Classe Tailwind de largura máxima — cada modal já tinha a sua. */
  maxWidth?: string;
  /** Alguns modais têm conteúdo que pode crescer (lista de relatórios, sugestões da IA) — limita a altura e rola por dentro. */
  scrollable?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex w-full ${maxWidth} flex-col gap-3 rounded-lg bg-white p-5 shadow-xl ${scrollable ? "max-h-[85vh] overflow-y-auto" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-sm font-bold">
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-lg leading-none text-neutral-500 hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
