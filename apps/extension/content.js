// Injeta um item "PDI+" na barra de abas do Qulture.rocks (ao lado de
// "Instruções de PDI"). Ao clicar, dispara a MESMA sincronização do popup
// (extrai em segundo plano + preenche o import do PDI+) via background.js —
// este arquivo só cuida da UI dentro da página, a lógica pesada mora lá.
(function () {
  const BUTTON_ID = "pdi-mais-nav-btn";

  function findInstrucoesTab() {
    return [...document.querySelectorAll("button, a, div[role='tab']")].find(
      (el) => el.textContent?.trim() === "Instruções de PDI",
    );
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const refTab = findInstrucoesTab();
    if (!refTab) return;

    const btn = refTab.cloneNode(true);
    btn.id = BUTTON_ID;
    btn.removeAttribute("aria-selected");
    btn.textContent = "PDI+";
    btn.addEventListener("click", onClick);
    refTab.parentElement?.insertBefore(btn, refTab.nextSibling);
  }

  async function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    if (btn.dataset.pdiSyncing === "true") return;

    btn.dataset.pdiSyncing = "true";
    const original = btn.textContent;
    btn.innerHTML = '<span class="pdi-mais-spinner"></span> Sincronizando…';

    try {
      const { pdiPlusUrl } = await chrome.storage.local.get(["pdiPlusUrl"]);
      const baseUrl = pdiPlusUrl || "http://localhost:3000";

      const result = await chrome.runtime.sendMessage({
        type: "start-sync",
        qultureUrl: location.href,
        baseUrl,
      });

      if (!result?.ok) {
        alert(
          `PDI+: ${result?.error ?? "não consegui sincronizar."}` +
            (result?.needsPermission
              ? "\n\nAbra o ícone da extensão PDI+ e clique em \"Criar PDI+\" uma vez para autorizar — depois disso este botão funciona sozinho."
              : ""),
        );
      }
    } finally {
      btn.dataset.pdiSyncing = "false";
      btn.textContent = original;
    }
  }

  // a SPA troca a barra de abas conforme navega — observa e reinjeta sempre
  // que ela remontar, em vez de rodar só uma vez no carregamento.
  const observer = new MutationObserver(() => injectButton());
  observer.observe(document.body, { childList: true, subtree: true });
  injectButton();
})();
