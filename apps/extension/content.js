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

  // Qulture.rocks é um SPA com rota em hash (".../#/v3/company/.../idp/...")
  // — trocar de "página" ali dentro NUNCA recarrega a aba, só muda a URL.
  // Esse content script roda UMA vez só, no carregamento inicial, então sem
  // isso o botão não tinha como saber que o usuário navegou pra outro lugar
  // (confirmado em teste real: o botão seguia pra Feedbacks, 1:1, Diretório
  // etc. — só devia aparecer na tela do PDI). Cobre o padrão real da URL:
  // .../idp/cycle/<id qualquer>/my-idp.
  const PDI_ROUTE_RE = /\/idp\/cycle\/\d+\/my-idp/i;
  const isPdiRoute = () => PDI_ROUTE_RE.test(location.href);

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
   * Em vez de adivinhar qual container "embrulha" o grupo de ícones (grade/
   * "?"/sino/avatar) — tentativa anterior, ainda ficava depois da grade —
   * acha o ÍCONE mais à esquerda direto pela geometria: pequeno, quadrado,
   * sem texto (ou quase), no lado direito da barra. Esse é a grade. Insere
   * como irmão ANTES dele, qualquer que seja a estrutura de containers.
   */
  function findLeftmostIcon(bar) {
    let best = null;
    let bestLeft = Infinity;
    for (const el of bar.querySelectorAll("button, a, [role='button'], svg")) {
      if (el === btn || el.id === BUTTON_ID || el.contains(btn)) continue;
      // se achou o <svg> do ícone, usa o <button>/<a> que o embrulha como
      // âncora — inserir irmão de um <svg> colocaria nosso <button> DENTRO
      // do botão deles (elemento interativo aninhado, clique quebrado).
      const anchor = el.closest("button, a, [role='button']") || el;
      if (!bar.contains(anchor) || anchor === btn) continue;
      const r = anchor.getBoundingClientRect();
      if (r.width < 14 || r.width > 60 || r.height < 14 || r.height > 60) continue;
      if (r.left < window.innerWidth * 0.5) continue;
      const textLen = (anchor.textContent || "").trim().length;
      if (textLen > 3) continue; // ícone puro, no máx. badge tipo "9+"
      if (r.left < bestLeft) {
        best = anchor;
        bestLeft = r.left;
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
  // NÃO insere no DOM aqui — só quando `syncVisibility()` confirmar que
  // estamos na rota certa (ver final do arquivo).

  /** Uma tentativa só de subir o botão pra barra. true = conseguiu. */
  function placeInBar() {
    const bar = findOrangeBar(false);
    if (!bar) return false;
    btn.classList.remove("pdi-mais-btn--float");
    btn.classList.add("pdi-mais-btn--bar");
    // antes do ícone mais à esquerda do grupo da direita (a grade), não
    // no início da barra inteira — senão fica antes até do hambúrguer/logo.
    const icon = findLeftmostIcon(bar);
    if (icon && icon.parentElement) {
      icon.parentElement.insertBefore(btn, icon);
    } else {
      bar.insertBefore(btn, bar.firstChild);
    }
    return true;
  }

  async function tryMoveIntoBar() {
    const MAX_TRIES = 25; // ~10s
    for (let i = 0; i < MAX_TRIES; i++) {
      if (!isPdiRoute()) return; // navegou pra fora enquanto tentava — desiste
      await new Promise((r) => setTimeout(r, 400));
      if (placeInBar()) return;
      if (i === MAX_TRIES - 1) findOrangeBar(true); // só loga amostras no fim
    }
    // nunca achou — fica flutuante mesmo, já está visível desde o começo.
  }

  function showButton() {
    if (btn.isConnected) return;
    document.documentElement.appendChild(btn);
    btn.classList.add("pdi-mais-btn--float");
    btn.classList.remove("pdi-mais-btn--bar");
    tryMoveIntoBar();
  }

  function hideButton() {
    if (btn.isConnected) btn.remove();
  }

  function syncVisibility() {
    if (isPdiRoute()) showButton();
    else hideButton();
  }

  // A SPA re-renderiza a barra do topo em vários momentos (abrir o menu
  // lateral, trocar de aba, redimensionar a janela) — e como o React não
  // sabe da existência do nosso <button>, qualquer re-render do container
  // onde ele mora apaga ele do DOM (visto em teste real: some ao fechar o
  // DevTools, que muda a largura da janela). Esse observer detecta quando o
  // botão saiu do DOM e reinsere — só se ainda estivermos na rota do PDI,
  // senão ficaria reaparecendo em toda página por causa desse "curativo".
  let healTimer = null;
  function scheduleHeal() {
    if (healTimer || btn.isConnected || !isPdiRoute()) return;
    healTimer = setTimeout(() => {
      healTimer = null;
      if (btn.isConnected || !isPdiRoute()) return;
      document.documentElement.appendChild(btn);
      btn.classList.add("pdi-mais-btn--float");
      btn.classList.remove("pdi-mais-btn--bar");
      placeInBar();
    }, 300);
  }
  new MutationObserver(scheduleHeal).observe(document.body, { childList: true, subtree: true });

  // Reage à navegação dentro do SPA: "hashchange" cobre a maioria dos
  // roteadores baseados em # (como este), mas alguns usam history.pushState
  // sem disparar esse evento — o poll é só uma rede de segurança leve.
  window.addEventListener("hashchange", syncVisibility);
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      syncVisibility();
    }
  }, 800);

  syncVisibility(); // estado inicial, de acordo com a URL de agora

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
