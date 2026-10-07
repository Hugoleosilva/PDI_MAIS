const runBtn = document.getElementById("run");
const copyBtn = document.getElementById("copy");
const out = document.getElementById("out");
const statusEl = document.getElementById("status");
const urlInput = document.getElementById("url");

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = kind ?? "";
}

// lembra a URL do PDI+ entre usos (só local, chrome.storage.local).
chrome.storage.local.get(["pdiPlusUrl"], (r) => {
  urlInput.value = r.pdiPlusUrl || "http://localhost:3000";
});
urlInput.addEventListener("change", () => {
  chrome.storage.local.set({ pdiPlusUrl: urlInput.value.trim() });
});

/**
 * Injetada na aba do PDI+ (`/import?tab=paste`) — preenche a tabela colada e
 * confirma, usando os mesmos data-testid do ImportForm (código nosso, não
 * seletor adivinhado). Roda como função isolada: não pode fechar sobre
 * variáveis de fora, só recebe `csv` por parâmetro.
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

    // sucesso = sai de /import; erro = aparece o parágrafo de erro
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

function waitTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("A aba do PDI+ demorou demais para carregar."));
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

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  copyBtn.disabled = true;
  out.value = "";
  try {
    const baseUrl = (urlInput.value || "http://localhost:3000").trim().replace(/\/$/, "");
    chrome.storage.local.set({ pdiPlusUrl: baseUrl });

    // Pede a permissão do domínio do PDI+ JÁ NO INÍCIO do clique — o Chrome
    // só aceita chrome.permissions.request() dentro do "gesto do usuário";
    // se isso rodar depois de uns `await` (ex.: só depois de extrair do
    // Qulture), o navegador pode recusar por já não considerar mais um clique
    // direto. Pedir aqui, antes de qualquer outra coisa assíncrona, é a opção
    // mais segura mesmo sem poder testar ao vivo.
    const origin = `${new URL(baseUrl).origin}/*`;
    const granted = await chrome.permissions.request({ origins: [origin] });
    if (!granted) {
      throw new Error("Preciso da permissão pra abrir e preencher a aba do PDI+ — tenta de novo e aceita.");
    }

    setStatus("Lendo o PDI no Qulture.rocks...");
    const [qulture] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!qulture?.id) throw new Error("Nenhuma aba ativa.");
    if (!/^https:\/\/app\.qulture\.rocks\//.test(qulture.url ?? "")) {
      throw new Error("Abra a página do seu PDI no Qulture.rocks primeiro.");
    }

    const [{ result: extracted }] = await chrome.scripting.executeScript({
      target: { tabId: qulture.id },
      files: ["extract.js"],
    });
    if (!extracted) throw new Error("A extração não devolveu nada.");
    if (extracted.error) throw new Error(extracted.error);

    out.value = extracted.csv;
    copyBtn.disabled = false;

    setStatus(`Lido: ${extracted.areaCount} área(s), ${extracted.actionCount} ação(ões). Abrindo o PDI+...`);
    const pdiTab = await chrome.tabs.create({ url: `${baseUrl}/import?tab=paste`, active: true });
    await waitTabComplete(pdiTab.id);
    await new Promise((r) => setTimeout(r, 400)); // app ainda hidratando

    setStatus("Preenchendo e confirmando no PDI+...");
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: pdiTab.id },
      func: fillAndSubmitImport,
      args: [extracted.csv],
    });

    if (result?.ok) {
      const warnLine = extracted.warnings?.length ? ` (${extracted.warnings.join(" ")})` : "";
      setStatus(`✓ PDI+ atualizado — ${extracted.areaCount} área(s), ${extracted.actionCount} ação(ões).${warnLine}`, "ok");
    } else {
      throw new Error(result?.error || "Não consegui confirmar no PDI+ — vê a tabela extraída abaixo e cola manualmente.");
    }
  } catch (e) {
    setStatus(e.message || String(e), "error");
  } finally {
    runBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(out.value);
    setStatus("Copiado!", "ok");
  } catch {
    setStatus("Não consegui copiar automaticamente — selecione o texto e copie manualmente.", "error");
  }
});
