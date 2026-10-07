// Service worker (MV3) — roda a sincronização inteira aqui, não no popup.
// Motivo: o popup.html FECHA SOZINHO assim que perde o foco (comportamento
// padrão do Chrome), e abrir uma aba nova rouba esse foco — então qualquer
// lógica que morasse no popup.js morria no meio do caminho assim que a gente
// tentava abrir a aba do PDI+. Aqui ela sobrevive o tempo todo.
//
// Além disso, as abas usadas (Qulture duplicado + PDI+) são sempre abertas
// com `active: false` — ficam em segundo plano, a aba que o usuário está
// olhando nunca muda. Só traz a aba do PDI+ pra frente no final, se der certo
// (pra ele ver o resultado), ou deixa em segundo plano mesmo em caso de erro
// (pra poder inspecionar sem atrapalhar).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitTabComplete(tabId, timeoutMs = 15000) {
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
    const textarea = await waitFor(
      () => document.querySelector('[data-testid="import-table-textarea"]'),
      8000,
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
    await sleep(200);

    const previewBtn = document.querySelector('[data-testid="import-preview-button"]');
    if (!previewBtn || previewBtn.disabled) {
      return { ok: false, error: "Botão de pré-visualizar não habilitou." };
    }
    previewBtn.click();

    const confirmBtn = await waitFor(
      () => document.querySelector('[data-testid="import-confirm-button"]'),
      5000,
    );
    if (!confirmBtn) {
      const errEl = document.querySelector('[data-testid="import-error"]');
      return { ok: false, error: errEl?.textContent || "Pré-visualização não apareceu." };
    }
    await sleep(250);
    confirmBtn.click();

    const outcome = await waitFor(() => {
      if (!location.pathname.includes("/import")) return "done";
      if (document.querySelector('[data-testid="import-error"]')) return "error";
      return null;
    }, 10000);

    if (outcome === "done") return { ok: true };
    if (outcome === "error") {
      const errEl = document.querySelector('[data-testid="import-error"]');
      return { ok: false, error: errEl?.textContent || "Erro ao confirmar import." };
    }
    return { ok: false, error: "Não consegui confirmar se deu certo — confere manualmente na aba." };
  })();
}

async function runSync({ qultureUrl, baseUrl }) {
  let qultureTab;
  let pdiTab;
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

    sendProgress("Abrindo o Qulture.rocks em segundo plano...");
    qultureTab = await chrome.tabs.create({ url: qultureUrl, active: false });
    await waitTabComplete(qultureTab.id);
    await sleep(500); // app ainda hidratando

    sendProgress("Lendo o PDI...");
    const [{ result: extracted }] = await chrome.scripting.executeScript({
      target: { tabId: qultureTab.id },
      files: ["extract.js"],
    });

    if (!extracted) throw new Error("A extração não devolveu nada.");
    if (extracted.error) throw new Error(extracted.error);

    // guarda a tabela crua — se a parte de preencher sozinho falhar lá na
    // frente, o popup ainda consegue mostrar isso pra copiar manualmente.
    await chrome.storage.local.set({ lastCsv: extracted.csv });

    sendProgress(
      `Lido: ${extracted.areaCount} área(s), ${extracted.actionCount} ação(ões). Abrindo o PDI+...`,
    );

    pdiTab = await chrome.tabs.create({ url: `${baseUrl}/import?tab=paste`, active: false });
    await waitTabComplete(pdiTab.id);
    await sleep(500);

    sendProgress("Preenchendo e confirmando no PDI+...");
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: pdiTab.id },
      func: fillAndSubmitImport,
      args: [extracted.csv],
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Não consegui confirmar no PDI+.");
    }

    // sucesso: fecha a aba duplicada do Qulture (não precisa mais dela) e
    // traz a aba do PDI+ pra frente, pra mostrar o resultado.
    await chrome.tabs.remove(qultureTab.id).catch(() => {});
    await chrome.tabs.update(pdiTab.id, { active: true });

    const warnLine = extracted.warnings?.length ? ` (${extracted.warnings.join(" ")})` : "";
    const okMsg = `PDI+ atualizado — ${extracted.areaCount} área(s), ${extracted.actionCount} ação(ões).${warnLine}`;
    sendProgress(`✓ ${okMsg}`);
    return { ok: true, message: okMsg };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // em erro, NÃO fecha as abas — deixa em segundo plano pra dar pra
    // inspecionar (F12) e ver onde travou, sem atrapalhar o que o usuário
    // estava olhando.
    sendProgress(`✕ ${msg}`);
    return { ok: false, error: msg };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "start-sync") {
    runSync(msg).then(sendResponse);
    return true; // mantém o canal aberto pra resposta assíncrona
  }
  return false;
});
