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
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // data solta, sem o prefixo "Prazo:" — defesa extra
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

  /**
   * Espera o DOM de `container` mudar (MutationObserver — childList,
   * characterData E attributes, porque o toggle de "Mostrar descrição" pode
   * ser só uma CLASSE/estilo mudando, não texto novo), com um `setTimeout`
   * só como rede de segurança. Motivo (ver medição real em
   * docs/testes/2026-11-23-performance-sincronizacao.md, "Experimento 4" e
   * "5"): QUALQUER espera baseada só em `setTimeout` leva o throttling de
   * aba em 2º plano do Chrome (minimizada = ainda mais forte) — um
   * `sleep()`/poll que custaria ms vira até ~60s de verdade enquanto o
   * throttling está "ligado" (os primeiros minutos da janela escondida). Já
   * vimos esse custo migrar pra 3 pontos diferentes do código conforme cada
   * um foi corrigido — por isso `waitFor` (usado em quase toda espera do
   * arquivo) também passou a ser orientado a mutação, não só esse ponto.
   * MutationObserver não é timer — dispara no instante em que o React
   * atualiza o DOM de verdade, mesmo com a aba throttlada.
   */
  function waitForMutation(container, timeoutMs = 1500) {
    if (!container || typeof MutationObserver === "undefined") return sleep(timeoutMs);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        obs.disconnect();
        clearTimeout(timer);
        resolve();
      };
      const obs = new MutationObserver(finish);
      obs.observe(container, { childList: true, subtree: true, characterData: true, attributes: true });
      const timer = setTimeout(finish, timeoutMs);
    });
  }

  // Generalizado (ver comentário de `waitForMutation` acima): em vez de só
  // reconferir `check()` a cada `intervalMs` via `setTimeout` (exposto ao
  // mesmo throttling), espera por uma mutação real no documento inteiro
  // antes de reconferir — resolve quase na hora quando o DOM muda de
  // verdade, e só cai no teto de `intervalMs` (ainda sujeito a throttling,
  // igual já era) quando nada muda mesmo.
  async function waitFor(check, timeoutMs = 6000, intervalMs = 150) {
    const start = Date.now();
    const immediate = check();
    if (immediate) return immediate;
    while (Date.now() - start < timeoutMs) {
      const remaining = timeoutMs - (Date.now() - start);
      await waitForMutation(document.body, Math.max(50, Math.min(intervalMs, remaining)));
      const v = check();
      if (v) return v;
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

  // Avisa o progresso ao vivo na página do PDI+ (ver content.js) — extração
  // = até 70% da barra, o restante (preencher/confirmar) é o background.js.
  // Best-effort: se o contexto não tiver chrome.runtime por algum motivo,
  // só ignora (nunca deixa a extração quebrar por causa de um aviso).
  function sendAreaProgress(done, total) {
    try {
      const text = total
        ? `Lendo áreas do Qulture: ${done}/${total}...`
        : `Lendo áreas do Qulture: ${done} lida(s)...`;
      const percent = total ? Math.round((done / total) * 70) : undefined;
      chrome.runtime?.sendMessage?.({ type: "progress", text, percent })?.catch?.(() => {});
    } catch {
      /* ignora — aviso de progresso nunca pode derrubar a extração */
    }
  }

  // Descrição rica (editor de texto da Qulture) usa formatos variados,
  // confirmados no DOM real: lista com marcadores (<ul><li>) OU parágrafos
  // (<p>) com formatação inline (<strong>/<em>) misturada no meio do texto.
  // "sem filho nenhum" (children.length === 0) rejeitava um <p> com
  // <strong> dentro — tinha 1 filho — perdendo o parágrafo inteiro. O que
  // importa não é "zero filhos", é "nenhum BLOCO aninhado" (outro
  // div/p/li/lista dentro) — formatação inline não desqualifica.
  function leafTexts(container) {
    return [...container.querySelectorAll("div,span,p,li")].filter((el) => {
      if (el.querySelector("div,p,li,ul,ol")) return false;
      return (el.textContent?.trim().length ?? 0) > 2;
    });
  }

  /**
   * Título do card/ação. O card SEMPRE mostra o tipo ("Treinamento e
   * estudo"...) logo ABAIXO do título (visto no DOM real) — vocabulário
   * pequeno e fixo, super confiável de achar. Ancorar nele é mais preciso
   * que só "primeiro texto desconhecido" (esse método antigo pegava uma
   * data solta no card — "31/12/26", sem o prefixo "Prazo:" — achando que
   * era o título, confirmado em teste real).
   */
  function leftoverTitle(container) {
    const candidates = leafTexts(container);
    const kindIndex = candidates.findIndex((el) => KIND_RE.test(el.textContent.trim()));
    if (kindIndex > 0) {
      const before = candidates[kindIndex - 1].textContent.trim();
      if (!IGNORE_RES.some((re) => re.test(before))) return before;
    }
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
      // Conjunto de textos ANTES de expandir — comparar por TEXTO (não por
      // tamanho total do card) é mais robusto: o rótulo do botão muda de
      // "Mostrar descrição" (17 letras) pra "Fechar descrição" (16 letras)
      // ao clicar, e um corte por CONTAGEM de caractere perdia a 1ª letra
      // da descrição toda vez (confirmado em teste real: "Conhecimentos"
      // virava "onhecimentos" em toda ação, sempre faltando exatamente 1
      // caractere — a diferença de tamanho entre os dois rótulos).
      const before = new Set(leafTexts(item).map((el) => el.textContent.trim()));
      descToggle.click();
      await waitForMutation(item, 1500);
      const newTexts = leafTexts(item)
        .map((el) => el.textContent.trim())
        .filter((t) => t && !before.has(t) && !/^Fechar descri[cç][aã]o/i.test(t));
      desc = newTexts.join(" ").trim();
    } else {
      // Sem toggle: quando o texto é curto, a Qulture pode mostrar a
      // descrição direto, sem precisar truncar/expandir. Sobra de
      // `leftoverTitle` igual, só que pulando o texto que já virou título e
      // juntando o resto que não é status/tipo/prazo/menu.
      const candidates = leafTexts(item)
        .map((el) => el.textContent.trim())
        .filter((t) => t && t !== title && !IGNORE_RES.some((re) => re.test(t)));
      desc = candidates.join(" ").trim();
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

      // NÃO desiste mais só por não ter nenhum item ainda (`current` vazio)
      // — bem no instante em que o painel da área abre, a lista de ações
      // pode levar um instante a mais pra chegar da API do que o próprio
      // painel (confirmado em teste real: 2 áreas com bastante ação, 11 e
      // 18, voltavam "não encontrei nenhuma ação" — a 1ª rodada via a lista
      // ainda vazia e desistia na hora, igual ao mesmo bug já corrigido na
      // lista de ÁREAS). Só rola se tiver algo pra rolar; espera sempre.
      const last = current[current.length - 1];
      if (last) {
        last.scrollIntoView({ block: "end" });
      }
      // MUITO generoso de propósito: a janela roda minimizada (Chrome não
      // deixa posicionar de verdade fora da tela) e isso throttla scroll/
      // IntersectionObserver/timers da página — o carregamento de mais
      // itens fica mais lento e inconsistente, não trava de vez. Mais vale
      // esperar bastante do que desistir cedo e perder ação.
      // `waitForMutation` (orientado a mutação, não timer) em vez de um
      // `sleep(700)` puro: o Chrome throttla timers de abas em segundo plano
      // (ver docs/testes/2026-11-23-performance-sincronizacao.md).
      await waitForMutation(document.body, 700);

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
  let pagerPage = 1;
  // "Área de Desenvolvimento (N)" mostra o total da PÁGINA atual, não o
  // total geral (confirmado em teste real: 16 áreas reais, rótulo mostrando
  // "(10)" na página 1) — por isso é uma estimativa que cresce ao avançar de
  // página, não uma constante.
  let areaTotalGuess = expectedAreaCount;
  sendAreaProgress(0, areaTotalGuess);

  for (let round = 0; round < 120; round++) {
    const goalItems = [...document.querySelectorAll('[data-testid="idp-goal-item"]')];
    let processedThisRound = 0;

    for (const card of goalItems) {
      const areaTitle = leftoverTitle(card);
      if (!areaTitle || processedTitles.has(areaTitle)) continue;
      processedTitles.add(areaTitle);
      processedThisRound += 1;

      // A contagem tem que bater EXATO com "Ações (N)" — não "pelo menos".
      // Se não bater, sai da área e entra de novo (a lista pode renderizar
      // diferente na 2ª vez) antes de aceitar um número errado.
      const MAX_AREA_ATTEMPTS = 3;
      let areaRows = [];
      let expectedActionCount;
      let opened = false;

      for (let attempt = 1; attempt <= MAX_AREA_ATTEMPTS; attempt++) {
        const target =
          attempt === 1
            ? card
            : [...document.querySelectorAll('[data-testid="idp-goal-item"]')].find(
                (c) => leftoverTitle(c) === areaTitle,
              );
        if (!target) break;
        target.click();
        opened = await waitFor(
          () => document.querySelector('[data-testid="idp-action-item"]') || findBackButton(),
          15000,
        );
        if (!opened) continue;
        await waitForMutation(document.body, 400);

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
        expectedActionCount = parseCount(actionsTabLabel);
        areaRows = await loadActionRows(expectedActionCount);

        if (!expectedActionCount || areaRows.length === expectedActionCount) break;

        if (attempt < MAX_AREA_ATTEMPTS) {
          const back = findBackButton();
          if (back) {
            back.click();
            await waitForMutation(document.body, 500);
          }
        }
      }

      if (!opened) {
        warnings.push(`Área "${areaTitle}": o painel não abriu a tempo — pulei.`);
        continue;
      }

      if (areaRows.length === 0) {
        warnings.push(`Área "${areaTitle}": não encontrei nenhuma ação.`);
      } else if (expectedActionCount && areaRows.length !== expectedActionCount) {
        warnings.push(
          `Área "${areaTitle}": esperava ${expectedActionCount} ação(ões) (tentei ${MAX_AREA_ATTEMPTS}x), só consegui ler ${areaRows.length} — dado pode estar incompleto.`,
        );
      }

      let areaDesc = "";
      const infoTab = findByText("button, div[role='tab'], a", /^Mais informações$/i);
      if (infoTab) {
        infoTab.click();
        // Era um sleep(600) fixo + 1 checagem só — mesma classe de bug já
        // corrigida nas listas de área/ação: se "Mais informações" demorar
        // um pouco mais que isso pra trocar de aba/renderizar (confirmado
        // em teste real: área "OpenCode" veio sem descrição nenhuma, mesmo
        // tendo uma de verdade), a checagem única batia vazio e `areaDesc`
        // ficava "" pro resto da área. Agora espera de verdade o cabeçalho
        // aparecer antes de desistir.
        const descHeader = await waitFor(
          () => findByText("div,h2,h3,span,label", /^Descri[cç][aã]o\b/i),
          6000,
          200,
        );
        // "Descrição" sozinho (igualdade exata) falhava sempre que o
        // cabeçalho vinha com algo a mais (dois pontos, ícone de
        // expandir...) — agora basta COMEÇAR com a palavra.
        // mesmo padrão truncado das ações pode existir aqui — expande se
        // tiver um "Mostrar mais"/"Mostrar descrição" por perto.
        const moreToggle = findByText(
          "a,button,span,div",
          /^(Mostrar mais|Mostrar descri[cç][aã]o|Ver mais)/i,
        );
        if (moreToggle) {
          moreToggle.click();
          await waitForMutation(document.body, 400);
        }
        for (const container of [descHeader?.parentElement, descHeader?.parentElement?.parentElement]) {
          if (areaDesc || !container) continue;
          const full = container.textContent || "";
          const idx = full.search(/Descri[cç][aã]o/i);
          const sliced = idx >= 0 ? full.slice(idx).replace(/^Descri[cç][aã]o\b:?\s*/i, "").trim() : "";
          if (sliced) areaDesc = sliced;
        }
      }

      for (const [title, desc, kind, dueDate, status] of areaRows) {
        rows.push([areaTitle, areaDesc, title, desc, kind, dueDate, status]);
        actionCount += 1;
      }

      sendAreaProgress(processedTitles.size, areaTotalGuess);

      // Antes, não achar o "Voltar" na hora abortava a extração INTEIRA e
      // devolvia só o que tinha lido até ali — sem exceção, sem erro, só um
      // retorno silencioso. Isso explica os "só vieram N áreas" vistos em
      // teste real variando a cada tentativa (2, 8, 9, 10...): não tinha
      // relação com paginação, era essa saída batendo em pontos diferentes
      // dependendo de qual área demorava mais a renderizar o botão. Dá mais
      // uma chance esperando antes de desistir de vez.
      let backBtn = findBackButton();
      if (!backBtn) {
        backBtn = await waitFor(() => findBackButton(), 5000, 200);
      }
      if (backBtn) {
        backBtn.click();
        await waitForMutation(document.body, 500);
      } else {
        warnings.push(
          `Área "${areaTitle}": não achei o botão "Voltar" mesmo esperando — a extração pode ter parado aqui.`,
        );
        // não retorna mais: deixa o loop seguir. Se de fato ficou preso
        // nessa tela (sem conseguir voltar pra lista), a próxima rodada não
        // vai achar nenhum "idp-goal-item" novo e o loop termina sozinho
        // pela via normal (areaStableRounds), já com o aviso acima incluído.
      }

    }

    // (sem parada antecipada aqui por "bateu o total esperado" — esse total
    // é só da página atual, ver comentário acima; parar com base nele fazia
    // o loop achar que tinha terminado exatamente ao fim da página 1, nunca
    // chegando a tentar a paginação abaixo. Confirmado em teste real: parou
    // em 9/10 da página 1, nunca viu as 6 áreas da página 2.)

    if (processedThisRound > 0) {
      areaStableRounds = 0;
      continue;
    }

    areaStableRounds += 1;

    // A lista de áreas aqui é PAGINADA de verdade (confirmado em teste real:
    // 16 áreas = 10 na página 1 + 6 na página 2, com paginador "< 1 2 >" no
    // rodapé) — diferente da lista de AÇÕES dentro de cada área, que é
    // virtualizada por rolagem. Rolar não carrega mais nada aqui; precisa
    // clicar no número/seta da página seguinte.
    const lastGoalRect = goalItems[goalItems.length - 1]?.getBoundingClientRect();
    const clickable = [...document.querySelectorAll("button, a, [role='button']")];
    const isNearPagerPosition = (el) => {
      if (!lastGoalRect) return true;
      const r = el.getBoundingClientRect();
      return r.top >= lastGoalRect.bottom - 20 && r.top < lastGoalRect.bottom + 400;
    };
    const nextPageBtn =
      clickable.find(
        (el) =>
          el.textContent?.trim() === String(pagerPage + 1) &&
          !el.disabled &&
          isNearPagerPosition(el),
      ) ||
      clickable.find((el) => {
        const t = el.textContent?.trim() ?? "";
        return (
          (t === ">" || t === "›" || t === "»") &&
          !el.disabled &&
          el.getAttribute("aria-disabled") !== "true" &&
          isNearPagerPosition(el)
        );
      });
    if (nextPageBtn) {
      nextPageBtn.click();
      pagerPage += 1;
      areaStableRounds = 0;
      await waitFor(() => document.querySelectorAll('[data-testid="idp-goal-item"]').length > 0, 8000, 200);
      await waitForMutation(document.body, 500);
      // recalcula a estimativa do total: o que já foi processado + o
      // rótulo "(N)" da página nova (pode ser menor que a página 1, como
      // no caso real de 10 + 6).
      const newHeading = findByText("h1,h2,h3,div,span", /Área\s+de\s+Desenvolvimento\s*\(\d+\)/i);
      const newPageCount = parseCount(newHeading);
      if (newPageCount) areaTotalGuess = processedTitles.size + newPageCount;
      sendAreaProgress(processedTitles.size, areaTotalGuess);
      continue;
    }

    // 20, não 10: cada rodada agora espera 700ms de verdade (ver correção
    // acima), então 20 rodadas = ~14s de paciência real antes de desistir —
    // barato perto do custo de perder área de verdade por impaciência.
    if (areaStableRounds >= 20) break;
    // sem paginador achado e nada novo — tenta rolar mesmo assim (resta
    // como era antes, de defesa, caso alguma parte da página ainda seja
    // virtualizada por rolagem).
    const currentCards = [...document.querySelectorAll('[data-testid="idp-goal-item"]')];
    const lastCard = currentCards[currentCards.length - 1];
    if (lastCard) {
      lastCard.scrollIntoView({ block: "end" });
    }
    // sempre espera, mesmo sem card nenhum pra rolar — logo depois de
    // clicar "Voltar", a lista fica vazia por um instante até a SPA
    // recarregar; sem essa espera, as 10 "rodadas de estabilidade" se
    // esgotavam quase instantâneo nesse vazio, antes da lista ter a menor
    // chance de voltar a aparecer (confirmado em teste real: contagem final
    // variando sem padrão — 2, 7, 8, 9, 10 — a cada tentativa, dependendo
    // só de quão rápido a Qulture respondia naquele instante).
    await waitForMutation(document.body, 700);
  }

  if (areaTotalGuess && processedTitles.size < areaTotalGuess) {
    warnings.push(
      `Esperava ${areaTotalGuess} área(s), só consegui processar ${processedTitles.size}.`,
    );
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  return { csv, areaCount: processedTitles.size, actionCount, warnings };
})();
