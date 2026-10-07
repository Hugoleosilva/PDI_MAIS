// Botão flutuante "PDI+" na página do Qulture.rocks. Ao clicar, dispara a
// MESMA sincronização do popup (extrai em segundo plano + preenche o import
// do PDI+) via background.js — este arquivo só cuida da UI, a lógica pesada
// mora lá.
//
// Não tenta mais encaixar DENTRO da barra de abas deles (ao lado de
// "Instruções de PDI") — tentamos clonar a aba e depois criar um elemento do
// zero, e nos dois casos o container ficou desenhando os dois itens um em
// cima do outro (provavelmente um grid/flex com número fixo de colunas, que
// não sabe o que fazer com um 3º item). Um botão flutuante, fora do fluxo
// normal da página, nunca esbarra nesse problema.
(function () {
  const BUTTON_ID = "pdi-mais-float-btn";
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.type = "button";
  btn.textContent = "PDI+";
  btn.title = "Sincronizar com o PDI+";
  document.documentElement.appendChild(btn);

  btn.addEventListener("click", async () => {
    if (btn.dataset.pdiSyncing === "true") return;
    btn.dataset.pdiSyncing = "true";
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
      btn.textContent = "PDI+";
    }
  });
})();
