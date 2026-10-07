// Botão "PDI+" na página do Qulture.rocks. Ao clicar, dispara a MESMA
// sincronização do popup (extrai em segundo plano + preenche o import do
// PDI+) via background.js — este arquivo só cuida da UI, a lógica pesada
// mora lá.
//
// Tentamos encaixar na barra de ABAS ("Instruções de PDI") de duas formas
// (clonando o elemento, depois criando um do zero) e nos dois casos o
// container deles desenhava os itens um em cima do outro — provavelmente um
// grid/flex com número fixo de colunas que não sabe lidar com um 3º item.
// Agora: procura a barra de navegação LARANJA no topo (pela cor de fundo
// computada, não por classe — sobrevive a troca de build deles) e encaixa
// o botão ali; se não achar, cai pro botão flutuante no canto da tela.
(function () {
  const BUTTON_ID = "pdi-mais-btn";
  if (document.getElementById(BUTTON_ID)) return;

  function parseRgb(str) {
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
  }

  function isOrange({ r, g, b }) {
    return r > 190 && g > 50 && g < 160 && b < 90;
  }

  /** Barra fixa/no topo da página com fundo alaranjado — a "topbar" da Qulture. */
  function findOrangeBar() {
    const candidates = [...document.querySelectorAll("header, nav, div")].filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top > 10 || rect.height < 30 || rect.height > 90 || rect.width < 200) return false;
      const rgb = parseRgb(getComputedStyle(el).backgroundColor);
      return rgb && isOrange(rgb);
    });
    // o menor (mais específico) tende a ser a barra em si, não um wrapper maior.
    candidates.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width);
    return candidates[0];
  }

  function makeButton() {
    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.type = "button";
    btn.textContent = "PDI+";
    btn.title = "Sincronizar com o PDI+";
    btn.addEventListener("click", onClick);
    return btn;
  }

  function inject() {
    if (document.getElementById(BUTTON_ID)) return;
    const bar = findOrangeBar();
    const btn = makeButton();
    if (bar) {
      btn.classList.add("pdi-mais-btn--bar");
      bar.appendChild(btn);
    } else {
      btn.classList.add("pdi-mais-btn--float");
      document.documentElement.appendChild(btn);
    }
  }

  async function onClick(e) {
    const btn = e.currentTarget;
    if (btn.dataset.pdiSyncing === "true") return;
    btn.dataset.pdiSyncing = "true";
    const original = btn.textContent;
    btn.innerHTML = '<span class="pdi-mais-spinner"></span>';

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

  // a SPA pode remontar a topbar conforme navega — observa e reinjeta.
  const observer = new MutationObserver(() => inject());
  observer.observe(document.body, { childList: true, subtree: true });
  inject();
})();
