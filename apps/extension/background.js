// Service worker (MV3) — roda a sincronização inteira aqui, não no popup.
// Motivo: o popup.html FECHA SOZINHO assim que perde o foco (comportamento
// padrão do Chrome), e abrir uma aba nova rouba esse foco — então qualquer
// lógica que morasse no popup.js morria no meio do caminho assim que a gente
// tentava abrir a aba do PDI+. Aqui ela sobrevive o tempo todo.
//
// As páginas usadas (Qulture duplicado + PDI+) abrem numa JANELA separada,
// não como aba da janela atual — uma aba com `active:false` ainda aparece na
// barra de abas que o usuário está olhando (dá pra clicar nela sem querer).
//
// Ela é MINIMIZADA (`state: "minimized"`) pra não aparecer em lugar nenhum.
// Tentamos posicionar fora da tela em vez de minimizar (minimizada =
// `document.visibilityState === "hidden"`, que o Chrome throttla mais forte
// — e a extração depende de rolar listas virtualizadas/paginadas pra
// carregar mais itens, sensível a esse throttling) — mas o Chrome REJEITA
// bounds majoritariamente fora da tela ("Bounds must be at least 50% within
// visible screen space"), então essa saída não existe. Em vez de brigar com
// isso, compensamos o throttling dando bem mais paciência (esperas maiores,
// mais tentativas) na extração — ver extract.js. Se der erro, a janela é
// trazida de volta pra área visível pra dar pra inspecionar; se der certo,
// ela é fechada e o resultado final abre como uma aba normal, na janela que
// o usuário está de fato usando.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openHiddenWindow(url) {
  const win = await chrome.windows.create({ url, focused: false, state: "minimized", type: "popup" });
  return { windowId: win.id, tabId: win.tabs[0].id };
}

async function closeHiddenWindow(windowId) {
  if (windowId == null) return;
  await chrome.windows.remove(windowId).catch(() => {});
}

async function revealWindow(windowId) {
  if (windowId == null) return;
  await chrome.windows.update(windowId, { state: "normal", focused: true }).catch(() => {});
}

// 90s, não 15s: em dev o Next.js compila cada rota só na primeira vez que
// alguém bate nela depois do servidor subir, e isso já levou mais de 2min
// pra rotas pesadas (confirmado em teste real) — 15s estourava antes do
// servidor sequer responder, abortando a sincronização sem nunca chegar na
// aba final.
function waitTabComplete(tabId, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("A aba demorou demais para carregar."));
    }, timeoutMs);
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function sendProgress(text) {
  // guarda o último status (o popup pode ter fechado nesse meio tempo —
  // ele lê isso ao abrir de novo) e tenta avisar ao vivo se ainda estiver aberto.
  chrome.storage.local.set({ lastStatus: text });
  chrome.runtime.sendMessage({ type: "progress", text }).catch(() => {});
}

/**
 * Preenche e confirma o formulário de importação do PDI+ — injetada via
 * chrome.scripting.executeScript. Usa os data-testid do ImportForm (código
 * nosso), não seletor adivinhado.
 */
function fillAndSubmitImport(csv) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(check, timeoutMs, intervalMs = 150) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const v = check();
      if (v) return v;
      await sleep(intervalMs);
    }
    return null;
  }

  return (async () => {
    // mesmo motivo do waitTabComplete em background.js: a janela do PDI+
    // tá minimizada (throttle do Chrome) e em dev a rota pode levar mais de
    // 1min pra compilar na primeira chamada — 15s estourava antes de o
    // formulário sequer montar.
    const textarea = await waitFor(
      () => document.querySelector('[data-testid="import-table-textarea"]'),
      90000,
    );
    if (!textarea) {
      return {
        ok: false,
        error: "Não achei o formulário de importação — confere se está logado em /import.",
      };
    }

    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(textarea, csv);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    // era um sleep(200) fixo + 1 checagem só — único passo não-pollado desta
    // função. Com a janela minimizada (throttle do Chrome), o re-render do
    // React que habilita o botão podia não ter acontecido ainda nesses
    // 200ms, dando falso negativo. Poll, igual ao resto da função.
    const previewBtn = await waitFor(
      () => {
        const el = document.querySelector('[data-testid="import-preview-button"]');
        return el && !el.disabled ? el : null;
      },
      5000,
    );
    if (!previewBtn) {
      return { ok: false, error: "Botão de pré-visualizar não habilitou." };
    }
    previewBtn.click();

    const confirmBtn = await waitFor(
      () => document.querySelector('[data-testid="import-confirm-button"]'),
      10000,
    );
    if (!confirmBtn) {
      const errEl = document.querySelector('[data-testid="import-error"]');
      return { ok: false, error: errEl?.textContent || "Pré-visualização não apareceu." };
    }
    await sleep(250);
    confirmBtn.click();

    // generoso de propósito: em dev o Next.js compila a rota na primeira
    // chamada (já vimos passar de 1min pra rotas pesadas), e um PDI grande
    // (dezenas de ações) demora mais pra processar — 30s ainda estourava.
    const outcome = await waitFor(() => {
      if (!location.pathname.includes("/import")) return "done";
      if (document.querySelector('[data-testid="import-error"]')) return "error";
      return null;
    }, 90000);

    if (outcome === "done") return { ok: true };
    if (outcome === "error") {
      const errEl = document.querySelector('[data-testid="import-error"]');
      return { ok: false, error: errEl?.textContent || "Erro ao confirmar import." };
    }
    return { ok: false, error: "Não consegui confirmar se deu certo — confere manualmente na aba." };
  })();
}

// Com os timeouts acima girando em torno de 1-3min no total, ficou bem mais
// tentador clicar de novo (reabrindo o popup, ou clicando no botão da página
// enquanto um sync já tá rodando) — sem essa trava, isso disparava DOIS
// `runSync` concorrentes: duas janelas escondidas, duas escritas competindo
// no `chrome.storage.local`, e possivelmente duas abas finais abrindo.
let syncInFlight = false;

async function runSync({ qultureUrl, baseUrl }) {
  if (syncInFlight) {
    return { ok: false, error: "Já tem uma sincronização rodando — espera ela terminar." };
  }
  syncInFlight = true;
  let qultureWin;
  let pdiWin;
  try {
    // O botão "PDI+" injetado na página (content.js) não pode pedir
    // permissão sozinho — só o popup consegue (precisa do gesto do usuário
    // numa página da própria extensão). Primeiro uso sempre passa pelo popup.
    const origin = `${new URL(baseUrl).origin}/*`;
    const hasPermission = await chrome.permissions.contains({ origins: [origin] });
    if (!hasPermission) {
      return {
        ok: false,
        needsPermission: true,
        error: `Ainda não tenho permissão para ${origin}.`,
      };
    }

    sendProgress("Lendo o PDI em segundo plano (janela escondida)...");
    qultureWin = await openHiddenWindow(qultureUrl);
    await waitTabComplete(qultureWin.tabId);
    await sleep(500); // app ainda hidratando

    const [{ result: extracted }] = await chrome.scripting.executeScript({
      target: { tabId: qultureWin.tabId },
      files: ["extract.js"],
    });

    if (!extracted) throw new Error("A extração não devolveu nada.");
    if (extracted.error) throw new Error(extracted.error);

    // guarda a tabela crua — se a parte de preencher sozinho falhar lá na
    // frente, o popup ainda consegue mostrar isso pra copiar manualmente.
    await chrome.storage.local.set({ lastCsv: extracted.csv });

    await closeHiddenWindow(qultureWin.windowId);
    qultureWin = null;

    sendProgress(
      `Lido: ${extracted.areaCount} área(s), ${extracted.actionCount} ação(ões). Preenchendo o PDI+...`,
    );

    pdiWin = await openHiddenWindow(`${baseUrl}/import?tab=paste`);
    await waitTabComplete(pdiWin.tabId);
    await sleep(500);

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: pdiWin.tabId },
      func: fillAndSubmitImport,
      args: [extracted.csv],
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Não consegui confirmar no PDI+.");
    }

    // sucesso: fecha a janela escondida e abre o resultado como uma aba
    // normal, na janela que o usuário está de fato usando.
    await closeHiddenWindow(pdiWin.windowId);
    pdiWin = null;
    await chrome.tabs.create({ url: `${baseUrl}/`, active: true });

    const warnLine = extracted.warnings?.length ? ` (${extracted.warnings.join(" ")})` : "";
    const okMsg = `PDI+ atualizado — ${extracted.areaCount} área(s), ${extracted.actionCount} ação(ões).${warnLine}`;
    sendProgress(`✓ ${okMsg}`);
    return { ok: true, message: okMsg };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // em erro, restaura a janela escondida (fica visível) pra dar pra
    // inspecionar (F12) e ver onde travou — só nesse caso ela aparece.
    await revealWindow(qultureWin?.windowId);
    await revealWindow(pdiWin?.windowId);
    sendProgress(`✕ ${msg}`);
    return { ok: false, error: msg };
  } finally {
    syncInFlight = false;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "start-sync") {
    runSync(msg).then(sendResponse);
    return true; // mantém o canal aberto pra resposta assíncrona
  }
  return false;
});
