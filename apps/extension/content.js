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
    if (!best) return null;
    // o grupinho achado pode vir DEPOIS de um ícone irmão (ex: a grade) que
    // mora no mesmo pai — nesse caso "antes de tudo" é o pai, não ele.
    const parent = best.parentElement;
    if (parent && parent !== bar && parent.children.length <= 6) {
      const pr = parent.getBoundingClientRect();
      if (pr.width > 0 && pr.width < barWidth * 0.6 && pr.left > window.innerWidth * 0.4) {
        return parent;
      }
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

  /** Uma tentativa só de subir o botão pra barra. true = conseguiu. */
  function placeInBar() {
    const bar = findOrangeBar(false);
    if (!bar) return false;
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
    return true;
  }

  async function tryMoveIntoBar() {
    const MAX_TRIES = 25; // ~10s
    for (let i = 0; i < MAX_TRIES; i++) {
      await new Promise((r) => setTimeout(r, 400));
      if (placeInBar()) return;
      if (i === MAX_TRIES - 1) findOrangeBar(true); // só loga amostras no fim
    }
    // nunca achou — fica flutuante mesmo, já está visível desde o começo.
  }
  tryMoveIntoBar();

  // A SPA re-renderiza a barra do topo em vários momentos (abrir o menu
  // lateral, trocar de aba, redimensionar a janela) — e como o React não
  // sabe da existência do nosso <button>, qualquer re-render do container
  // onde ele mora apaga ele do DOM (visto em teste real: some ao fechar o
  // DevTools, que muda a largura da janela). Esse observer detecta quando o
  // botão saiu do DOM e reinsere, com um pequeno debounce pra não brigar com
  // a própria re-renderização em andamento.
  let healTimer = null;
  function scheduleHeal() {
    if (healTimer || btn.isConnected) return;
    healTimer = setTimeout(() => {
      healTimer = null;
      if (btn.isConnected) return;
      document.documentElement.appendChild(btn);
      btn.classList.add("pdi-mais-btn--float");
      btn.classList.remove("pdi-mais-btn--bar");
      placeInBar();
    }, 300);
  }
  new MutationObserver(scheduleHeal).observe(document.body, { childList: true, subtree: true });

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
