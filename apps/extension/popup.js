const runBtn = document.getElementById("run");
const copyBtn = document.getElementById("copy");
const out = document.getElementById("out");
const statusEl = document.getElementById("status");

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "error" : "";
}

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  copyBtn.disabled = true;
  out.value = "";
  setStatus("Lendo a página...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("Nenhuma aba ativa.");
    if (!/^https:\/\/app\.qulture\.rocks\//.test(tab.url ?? "")) {
      throw new Error("Abra a página do seu PDI no Qulture.rocks primeiro.");
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["extract.js"],
    });

    if (!result) throw new Error("A extração não devolveu nada.");
    if (result.error) throw new Error(result.error);

    out.value = result.csv;
    copyBtn.disabled = false;
    const warnLine = result.warnings?.length ? ` ${result.warnings.join(" ")}` : "";
    setStatus(`Pronto — ${result.areaCount} área(s), ${result.actionCount} ação(ões).${warnLine}`);
  } catch (e) {
    setStatus(e.message || String(e), true);
  } finally {
    runBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(out.value);
    setStatus("Copiado! Cole em PDI+ > Importar > Colar tabela.");
  } catch {
    setStatus("Não consegui copiar automaticamente — selecione o texto e copie manualmente.", true);
  }
});
