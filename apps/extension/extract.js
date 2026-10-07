// Injetado via chrome.scripting.executeScript — roda DENTRO da página do
// Qulture.rocks, só leitura. Não faz fetch/XHR nenhum: só devolve o resultado
// pro popup, que é quem decide se copia pra área de transferência.
//
// Formato de saída (CSV) tem que bater exatamente com as 7 colunas que
// packages/core/src/import.ts (`parseImportTable`) espera:
//   Área | Descrição da área | Ação | Descrição da ação | Tipo | Prazo | Status
//
// Os nomes de classe do Qulture.rocks (styled-components) têm um sufixo de
// hash que muda a cada build deles — por isso aqui a extração usa sobretudo
// `data-testid` (estável) e padrões de TEXTO (status conhecido, "Prazo:",
// "Mostrar descrição"), não className exato. Se a Qulture mudar o texto dos
// rótulos, isso quebra e precisa ajustar os regex abaixo.
//
// IMPORTANTE sobre listas virtualizadas (áreas E ações): rolar a tela pra
// carregar mais itens faz os itens já vistos SAIREM do DOM. A versão antiga
// só lia tudo no fim da rolagem e perdia os primeiros itens (confirmado em
// teste real: "Ações (17)" no rótulo, só 13 chegavam no PDI+; "Área de
// Desenvolvimento (10)", só 5 eram processadas). Por isso aqui cada item é
// extraído NO INSTANTE em que aparece, antes de rolar mais — nunca se
// confia em reconsultar o DOM depois de já ter avançado.
(async () => {
  const KIND_RE = /^(Treinamento e estudo|Desafio profissional|Mentoria e feedbacks?)$/i;
  const STATUS_RE = /(N[aã]o iniciad[oa]|Em progresso|Em andamento|Finalizad[oa]|Conclu[ií]d[oa])/i;
  const IGNORE_RES = [
    KIND_RE,
    STATUS_RE,
    /^Prazo:/i,
    /^Mostrar descri[cç][aã]o/i,
    /^Fechar descri[cç][aã]o/i,
    /^\d{1,3}(,\d+)?%$/,
    /^\d+\s+a[cç][oõ]es?$/i,
    /^Ações\s*\(\d+\)$/i,
    /^Área\s+de\s+Desenvolvimento\s*\(\d+\)$/i,
    /^Mais informações$/i,
    /^Criar\s*\+?$/i,
  ];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(check, timeoutMs = 6000, intervalMs = 150) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const v = check();
      if (v) return v;
      await sleep(intervalMs);
    }
    return null;
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function findByText(selector, matcher) {
    return [...document.querySelectorAll(selector)].find((el) => {
      const t = el.textContent?.trim() ?? "";
      return typeof matcher === "string" ? t === matcher : matcher.test(t);
    });
  }

  function findBackButton() {
    return findByText("button, a, div[role='button']", /^voltar$/i);
  }

  function parseCount(label) {
    return Number(label?.textContent?.match(/\((\d+)\)/)?.[1]) || undefined;
  }

  // Primeiro bloco de texto "solto" (sem filhos) que não bate com nenhum
  // padrão conhecido — na prática, o título do card/ação.
  function leftoverTitle(container) {
    const candidates = [...container.querySelectorAll("div,span")].filter(
      (el) => el.children.length === 0 && (el.textContent?.trim().length ?? 0) > 2,
    );
    for (const el of candidates) {
      const t = el.textContent.trim();
      if (IGNORE_RES.some((re) => re.test(t))) continue;
      return t;
    }
    return "";
  }

  /** Extrai os dados de UMA ação imediatamente — o item ainda está montado. */
  async function extractActionRow(item, title) {
    const text = item.textContent || "";
    const statusMatch = text.match(STATUS_RE);
    const kindMatch = text.match(KIND_RE);
    const dateMatch = text.match(/Prazo:\s*(\d{2}\/\d{2}\/\d{2,4})/);

    let desc = "";
    // escopado DENTRO do item — com vários itens na tela ao mesmo tempo,
    // buscar no document inteiro pegava sempre o primeiro "Mostrar
    // descrição" da página, nunca o do item certo.
    const descToggle = [...item.querySelectorAll("a,button,span,div")].find((el) =>
      /^Mostrar descri[cç][aã]o/i.test(el.textContent?.trim() ?? ""),
    );
    if (descToggle) {
      const before = item.textContent.length;
      descToggle.click();
      await sleep(400);
      const after = item.textContent || "";
      if (after.length > before) {
        desc = after.slice(before).replace(/^Fechar descri[cç][aã]o\s*/i, "").trim();
      }
    }

    return [
      title,
      desc,
      kindMatch ? kindMatch[0] : "Treinamento e estudo",
      dateMatch ? dateMatch[1] : "",
      statusMatch ? statusMatch[0] : "Não iniciado",
    ];
  }

  /**
   * Lê todas as ações de uma área, rolando pra carregar mais conforme
   * precisa — mas cada item só é lido UMA VEZ, na primeira vez que aparece,
   * nunca depois de rolar (pode já ter sumido do DOM).
   *
   * Dedup por TÍTULO, não por referência de nó: clicar em "Mostrar
   * descrição" pode disparar um re-render que remonta os itens seguintes da
   * lista como nós NOVOS — um WeakSet por nó deixava passar o mesmo card
   * extraído duas vezes (ids "area->ação" duplicados no payload final, que
   * o merge guardava como duas entradas e o React Flow via como chave
   * repetida no canvas).
   */
  async function loadActionRows(expectedCount) {
    const rows = [];
    const seenTitles = new Set();
    let stableRounds = 0;

    for (let round = 0; round < 150; round++) {
      const current = [...document.querySelectorAll('[data-testid="idp-action-item"]')];
      let gotNew = false;
      for (const el of current) {
        const title = leftoverTitle(el);
        if (!title || seenTitles.has(title)) continue;
        seenTitles.add(title);
        const row = await extractActionRow(el, title);
        if (row) {
          rows.push(row);
          gotNew = true;
        }
      }

      if (expectedCount && rows.length >= expectedCount) break;

      const last = current[current.length - 1];
      if (!last) break;
      last.scrollIntoView({ block: "end" });
      // MUITO generoso de propósito: a janela roda minimizada (Chrome não
      // deixa posicionar de verdade fora da tela) e isso throttla scroll/
      // IntersectionObserver/timers da página — o carregamento de mais
      // itens fica mais lento e inconsistente, não trava de vez. Mais vale
      // esperar bastante do que desistir cedo e perder ação.
      await sleep(700);

      if (gotNew) {
        stableRounds = 0;
      } else {
        stableRounds += 1;
        if (stableRounds >= 12) break;
      }
    }
    return rows;
  }

  const rows = [
    ["Área de desenvolvimento", "Descrição da área", "Ação", "Descrição da ação", "Tipo da ação", "Prazo", "Status"],
  ];
  const warnings = [];
  let actionCount = 0;

  // SPA: a aba pode "terminar de carregar" (HTML/JS) bem antes dos dados
  // chegarem da API e os cards renderizarem — espera de verdade em vez de
  // checar uma vez só, principalmente numa aba nova em segundo plano.
  await waitFor(() => document.querySelectorAll('[data-testid="idp-goal-item"]').length > 0, 20000, 300);
  if (document.querySelectorAll('[data-testid="idp-goal-item"]').length === 0) {
    return { error: 'Não achei nenhuma área nesta página (esperei 20s). Confere se está em ".../my-idp".' };
  }

  const areaHeading = findByText("h1,h2,h3,div,span", /Área\s+de\s+Desenvolvimento\s*\(\d+\)/i);
  const expectedAreaCount = parseCount(areaHeading);

  // mesmo problema de virtualização da lista de ações, um nível acima: a
  // lista de áreas também pode só ter um subconjunto montado por vez.
  // Processa (clica, extrai, volta) cada área só UMA VEZ, por TÍTULO — não
  // por referência de nó, porque "Voltar" pode remontar a lista do zero.
  const processedTitles = new Set();
  let areaStableRounds = 0;

  for (let round = 0; round < 120; round++) {
    const goalItems = [...document.querySelectorAll('[data-testid="idp-goal-item"]')];
    let processedThisRound = 0;

    for (const card of goalItems) {
      const areaTitle = leftoverTitle(card);
      if (!areaTitle || processedTitles.has(areaTitle)) continue;
      processedTitles.add(areaTitle);
      processedThisRound += 1;

      card.click();
      const opened = await waitFor(
        () => document.querySelector('[data-testid="idp-action-item"]') || findBackButton(),
        15000,
      );
      if (!opened) {
        warnings.push(`Área "${areaTitle}": o painel não abriu a tempo — pulei.`);
        continue;
      }
      await sleep(400);

      // Lê as ações PRIMEIRO, com a aba "Ações" já ativa por padrão (é onde
      // o painel abre) — a descrição da área (aba "Mais informações") entra
      // em cada linha só no final, depois que as ações já estão garantidas.
      // O rótulo "Ações (N)" pode demorar um instante a mais que o painel
      // pra atualizar com a contagem real — espera ele aparecer de verdade
      // em vez de ler uma vez só (senão expectedCount vem undefined e a
      // rolagem para cedo demais, só no "estabilizou 12 rounds").
      const actionsTabLabel = await waitFor(
        () => findByText("button, div[role='tab'], a", /^Ações\s*\(\d+\)$/i),
        8000,
        200,
      );
      const expectedActionCount = parseCount(actionsTabLabel);
      const areaRows = await loadActionRows(expectedActionCount);

      if (areaRows.length === 0) {
        warnings.push(`Área "${areaTitle}": não encontrei nenhuma ação.`);
      } else if (expectedActionCount && areaRows.length < expectedActionCount) {
        warnings.push(
          `Área "${areaTitle}": esperava ${expectedActionCount} ação(ões), só consegui ler ${areaRows.length}.`,
        );
      }

      let areaDesc = "";
      const infoTab = findByText("button, div[role='tab'], a", /^Mais informações$/i);
      if (infoTab) {
        infoTab.click();
        await sleep(600);
        const descHeader = findByText("div,h2,h3", "Descrição");
        if (descHeader?.parentElement) {
          // o container pode embrulhar o painel INTEIRO (Responsável/Líder/
          // Ciclo vêm juntos, antes) — corta pelo texto literal "Descrição"
          // em vez de só o prefixo, assim só sobra o que vem depois dele.
          const full = descHeader.parentElement.textContent || "";
          const idx = full.indexOf("Descrição");
          areaDesc = idx >= 0 ? full.slice(idx + "Descrição".length).trim() : full.trim();
        }
      }

      for (const [title, desc, kind, dueDate, status] of areaRows) {
        rows.push([areaTitle, areaDesc, title, desc, kind, dueDate, status]);
        actionCount += 1;
      }

      const backBtn = findBackButton();
      if (backBtn) {
        backBtn.click();
        await sleep(500);
      } else {
        warnings.push(`Área "${areaTitle}": não achei o botão "Voltar" — a extração pode ter parado aqui.`);
        const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
        return { csv, areaCount: processedTitles.size, actionCount, warnings };
      }
    }

    if (expectedAreaCount && processedTitles.size >= expectedAreaCount) break;

    if (processedThisRound > 0) {
      areaStableRounds = 0;
    } else {
      areaStableRounds += 1;
      if (areaStableRounds >= 10) break;
      // nada novo nesta rodada — tenta rolar a LISTA de áreas pra carregar
      // mais (mesma técnica das ações: rola o último card atual pra vista).
      const currentCards = [...document.querySelectorAll('[data-testid="idp-goal-item"]')];
      const lastCard = currentCards[currentCards.length - 1];
      if (lastCard) {
        lastCard.scrollIntoView({ block: "end" });
        await sleep(700);
      }
    }
  }

  if (expectedAreaCount && processedTitles.size < expectedAreaCount) {
    warnings.push(
      `Esperava ${expectedAreaCount} área(s), só consegui processar ${processedTitles.size}.`,
    );
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  return { csv, areaCount: processedTitles.size, actionCount, warnings };
})();
