// Botão "PDI+" na página do Qulture.rocks. Ao clicar, dispara a MESMA
// sincronização do popup (extrai em segundo plano + preenche o import do
// PDI+) via background.js — este arquivo só cuida da UI, a lógica pesada
// mora lá.
//
// Mostra o botão FLUTUANTE imediatamente (garantido, sempre funciona) e, em
// paralelo, tenta por alguns segundos encontrar a barra de navegação
// LARANJA do topo pra "subir" o botão pra lá — confirmado por teste real:
// no instante em que o content script roda, a SPA ainda não tinha terminado
// de desenhar a barra (todas as amostras de cor vinham brancas), então uma
// checagem única sempre falhava.
(function () {
  const BUTTON_ID = "pdi-mais-btn";
  if (document.getElementById(BUTTON_ID)) return;

  function parseRgb(str) {
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
  }

  function isOrange({ r, g, b }) {
    return r > 170 && g > 40 && g < 180 && b < 110 && r - b > 80;
  }

  /** Elemento com fundo laranja REALMENTE desenhado num ponto da tela. */
  function orangeElementAt(x, y) {
    const stack = document.elementsFromPoint(x, y);
    let best = null;
    for (const el of stack) {
      const rgb = parseRgb(getComputedStyle(el).backgroundColor);
      if (rgb && isOrange(rgb)) {
        if (!best || el.getBoundingClientRect().width > best.getBoundingClientRect().width) {
          best = el;
        }
      }
    }
    return best;
  }

  function findOrangeBar(logSamplesIfNotFound) {
    const width = window.innerWidth;
    const xs = [10, width * 0.25, width * 0.5, width * 0.75, width - 10];
    const ys = [5, 15, 25, 40];
    let best = null;
    const sampled = [];
    for (const y of ys) {
      for (const x of xs) {
        const el = orangeElementAt(x, y);
        if (logSamplesIfNotFound) {
          sampled.push({ x, y, bg: getComputedStyle(el || document.elementFromPoint(x, y) || document.body).backgroundColor });
        }
        if (el && (!best || el.getBoundingClientRect().width > best.getBoundingClientRect().width)) {
          best = el;
        }
      }
    }
    if (!best && logSamplesIfNotFound) console.log("[PDI+] não achei barra laranja — amostras:", sampled);
    return best;
  }

  /**
   * `bar` (acima) é o container INTEIRO da faixa laranja — inserir direto
   * nele (firstChild) bota o botão antes até do menu-hambúrguer/logo, lá no
   * extremo esquerdo. O que queremos é só o grupinho de ícones da direita
   * (grade/"?"/sino/avatar): menor container, do lado direito da tela, com
   * poucos filhos — não o bar inteiro.
   */
  function findIconCluster(bar) {
    const barWidth = bar.getBoundingClientRect().width;
    let best = null;
    for (const el of bar.querySelectorAll("*")) {
      const n = el.children.length;
      if (n < 2 || n > 6) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.width >= barWidth * 0.5) continue;
      if (r.left < window.innerWidth * 0.5) continue;
      if (!best || r.width < best.getBoundingClientRect().width) best = el;
    }
    return best;
  }

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.type = "button";
  btn.textContent = "PDI+";
  btn.title = "Sincronizar com o PDI+";
  btn.classList.add("pdi-mais-btn--float");
  btn.addEventListener("click", onClick);
  document.documentElement.appendChild(btn);

  async function tryMoveIntoBar() {
    const MAX_TRIES = 25; // ~10s
    for (let i = 0; i < MAX_TRIES; i++) {
      await new Promise((r) => setTimeout(r, 400));
      const bar = findOrangeBar(i === MAX_TRIES - 1);
      if (bar) {
        btn.classList.remove("pdi-mais-btn--float");
        btn.classList.add("pdi-mais-btn--bar");
        // antes do grupinho de ícones da direita (grade/"?"/sino/avatar), não
        // no início da barra inteira — senão fica antes até do hambúrguer/logo.
        const cluster = findIconCluster(bar);
        if (cluster && cluster.firstElementChild) {
          cluster.insertBefore(btn, cluster.firstElementChild);
        } else {
          bar.insertBefore(btn, bar.firstChild);
        }
        return;
      }
    }
    // nunca achou — fica flutuante mesmo, já está visível desde o começo.
  }
  tryMoveIntoBar();

  async function onClick(e) {
    const el = e.currentTarget;
    if (el.dataset.pdiSyncing === "true") return;
    el.dataset.pdiSyncing = "true";
    const original = el.textContent;
    el.innerHTML = '<span class="pdi-mais-spinner"></span>';

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
      el.dataset.pdiSyncing = "false";
      el.textContent = original;
    }
  }
})();
