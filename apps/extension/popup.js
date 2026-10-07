const runBtn = document.getElementById("run");
const copyBtn = document.getElementById("copy");
const out = document.getElementById("out");
const statusEl = document.getElementById("status");
const urlInput = document.getElementById("url");

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = kind ?? "";
}

// lembra a URL do PDI+ e o último status entre usos — a sincronização roda
// no service worker (background.js), não aqui, então reabrir o popup no meio
// do processo (ou depois dele) ainda mostra onde parou.
chrome.storage.local.get(["pdiPlusUrl", "lastStatus", "lastCsv"], (r) => {
  urlInput.value = r.pdiPlusUrl || "http://localhost:3000";
  if (r.lastStatus) setStatus(r.lastStatus);
  if (r.lastCsv) {
    out.value = r.lastCsv;
    copyBtn.disabled = false;
  }
});
urlInput.addEventListener("change", () => {
  chrome.storage.local.set({ pdiPlusUrl: urlInput.value.trim() });
});

// atualização ao vivo, se o popup continuar aberto (best-effort — ele pode
// fechar a qualquer momento, por isso quem garante o trabalho é o
// background.js, não este listener).
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "progress") setStatus(msg.text);
});

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  try {
    const baseUrl = (urlInput.value || "http://localhost:3000").trim().replace(/\/$/, "");
    chrome.storage.local.set({ pdiPlusUrl: baseUrl });

    // chrome.permissions.request() só funciona dentro do gesto do usuário —
    // por isso roda aqui no clique, antes de passar a bola pro background.
    const origin = `${new URL(baseUrl).origin}/*`;
    const granted = await chrome.permissions.request({ origins: [origin] });
    if (!granted) {
      throw new Error("Preciso da permissão pra abrir e preencher a aba do PDI+ — tenta de novo e aceita.");
    }

    const [qulture] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!qulture?.url || !/^https:\/\/app\.qulture\.rocks\//.test(qulture.url)) {
      throw new Error("Abra a página do seu PDI no Qulture.rocks primeiro.");
    }

    setStatus("Rodando em segundo plano — pode fechar esta janela, se quiser.");
    // Dispara pro background.js e NÃO espera aqui: o processo inteiro roda
    // em abas de segundo plano (a aba que você está olhando não muda), e
    // sobrevive mesmo se este popup fechar no meio do caminho.
    // .catch no final: se o popup fechar antes do background terminar (o
    // normal, já que a sincronização demora minutos), a promessa rejeita com
    // "message channel closed" — inofensivo (o trabalho continua rodando
    // normalmente), mas sem isso virava um erro barulhento no
    // chrome://extensions. O status final já chega de qualquer forma via
    // chrome.storage.local (lido ao reabrir) e o listener de "progress" acima.
    chrome.runtime
      .sendMessage({ type: "start-sync", qultureUrl: qulture.url, baseUrl })
      .then((result) => {
        if (result?.ok) setStatus(`✓ ${result.message}`, "ok");
        else setStatus(`✕ ${result?.error ?? "Falhou."}`, "error");
      })
      .catch(() => {});
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
