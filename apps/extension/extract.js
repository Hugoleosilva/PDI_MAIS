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

  /**
   * A lista de ações provavelmente é virtualizada (só o que está visível na
   * rolagem entra no DOM) — rolar o último item pra vista força o próximo
   * lote a renderizar. Para quando bate a contagem esperada (lida do rótulo
   * "Ações (N)" da aba) ou quando para de crescer por algumas rodadas.
   */
  async function loadAllActionItems(expectedCount) {
    let items = [...document.querySelectorAll('[data-testid="idp-action-item"]')];
    let stableRounds = 0;
    for (let i = 0; i < 40; i++) {
      if (expectedCount && items.length >= expectedCount) break;
      const last = items[items.length - 1];
      if (!last) break;
      last.scrollIntoView({ block: "end" });
      await sleep(200);
      const next = [...document.querySelectorAll('[data-testid="idp-action-item"]')];
      if (next.length === items.length) {
        stableRounds += 1;
        if (stableRounds >= 3) break;
      } else {
        stableRounds = 0;
      }
      items = next;
    }
    return items;
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

  const rows = [
    ["Área de desenvolvimento", "Descrição da área", "Ação", "Descrição da ação", "Tipo da ação", "Prazo", "Status"],
  ];
  const warnings = [];
  let actionCount = 0;

  // SPA: a aba pode "terminar de carregar" (HTML/JS) bem antes dos dados
  // chegarem da API e os cards renderizarem — espera de verdade em vez de
  // checar uma vez só, principalmente numa aba nova em segundo plano.
  await waitFor(() => document.querySelectorAll('[data-testid="idp-goal-item"]').length > 0, 12000, 300);
  const goalCount = document.querySelectorAll('[data-testid="idp-goal-item"]').length;
  if (goalCount === 0) {
    return { error: 'Não achei nenhuma área nesta página (esperei 12s). Confere se está em ".../my-idp".' };
  }

  for (let i = 0; i < goalCount; i++) {
    // re-consulta a cada volta: depois de "Voltar" o React pode ter
    // remontado a lista, então segurar a referência antiga quebraria.
    const card = document.querySelectorAll('[data-testid="idp-goal-item"]')[i];
    if (!card) continue;
    const areaTitle = leftoverTitle(card);
    if (!areaTitle) {
      warnings.push(`Área #${i + 1}: não consegui ler o título — pulei.`);
      continue;
    }

    card.click();
    const opened = await waitFor(() => document.querySelector('[data-testid="idp-action-item"]') || findBackButton());
    if (!opened) {
      warnings.push(`Área "${areaTitle}": o painel não abriu a tempo — pulei.`);
      continue;
    }
    await sleep(300);

    // Lê as ações PRIMEIRO, com a aba "Ações" já ativa por padrão (é onde o
    // painel abre) — antes a gente visitava "Mais informações" e tentava
    // clicar de volta em "Ações (N)" antes de ler, e se esse clique de volta
    // falhasse (texto com espaçamento diferente, por exemplo), a área inteira
    // ficava com ZERO ações, silenciosamente. Lendo antes, esse passo frágil
    // nem precisa mais existir. Guarda num buffer — a descrição da área (lida
    // depois, na aba "Mais informações") entra em cada linha só no final.
    const actionsTabLabel = findByText("button, div[role='tab'], a", /^Ações\s*\(\d+\)$/i);
    const expectedCount = Number(actionsTabLabel?.textContent?.match(/\((\d+)\)/)?.[1]) || undefined;
    const actionItems = await loadAllActionItems(expectedCount);
    const areaRows = [];
    for (const item of actionItems) {
      const text = item.textContent || "";
      const statusMatch = text.match(STATUS_RE);
      const kindMatch = text.match(KIND_RE);
      const dateMatch = text.match(/Prazo:\s*(\d{2}\/\d{2}\/\d{2,4})/);
      const title = leftoverTitle(item);
      if (!title) continue;

      let desc = "";
      const descToggle = findByText("a,button,span,div", /^Mostrar descri[cç][aã]o/i);
      if (descToggle && item.contains(descToggle)) {
        const before = item.textContent.length;
        descToggle.click();
        await sleep(250);
        const after = item.textContent || "";
        if (after.length > before) {
          desc = after.slice(before).replace(/^Fechar descri[cç][aã]o\s*/i, "").trim();
        }
      }

      areaRows.push([
        title,
        desc,
        kindMatch ? kindMatch[0] : "Treinamento e estudo",
        dateMatch ? dateMatch[1] : "",
        statusMatch ? statusMatch[0] : "Não iniciado",
      ]);
    }
    if (areaRows.length === 0) {
      warnings.push(`Área "${areaTitle}": não encontrei nenhuma ação.`);
    } else if (expectedCount && areaRows.length < expectedCount) {
      warnings.push(
        `Área "${areaTitle}": esperava ${expectedCount} ação(ões), só consegui ler ${areaRows.length}.`,
      );
    }

    // aba "Mais informações" -> descrição da área (só depois de já ter as
    // ações garantidas — se isso falhar agora, não perde ação nenhuma).
    let areaDesc = "";
    const infoTab = findByText("button, div[role='tab'], a", /^Mais informações$/i);
    if (infoTab) {
      infoTab.click();
      await sleep(400);
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
      await sleep(300);
    } else {
      warnings.push(`Área "${areaTitle}": não achei o botão "Voltar" — a extração pode ter parado aqui.`);
      break;
    }
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  return { csv, areaCount: goalCount, actionCount, warnings };
})();
