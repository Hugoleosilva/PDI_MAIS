# Investigação — por que a sincronização da extensão leva ~16-35min

Objetivo: entender ONDE o tempo de sincronização se concentra, antes de tentar
otimizar qualquer coisa às cegas. Registro feito pra aprender com o
comportamento real, não só documentar o fix.

## Instrumentação adicionada (2026-11-23)

- `apps/extension/extract.js`: cada área processada passa a medir
  `{ area, ms, attempts, actions }` num array `timings`, devolvido junto com
  o resultado final.
- `apps/extension/background.js`: ao fim da sincronização, salva esse array em
  `chrome.storage.local` (`lastTimings` / `lastTimingsTotalS`) — sobrevive a
  fechar/reabrir o DevTools, não depende de estar com o console aberto na
  hora certa. Pra consultar depois, no console do service worker
  (`chrome://extensions` → PDI+ → "service worker"):

  ```js
  chrome.storage.local.get("lastTimings").then(r => console.table(r.lastTimings))
  ```

## Medição real (1ª rodada, 17 áreas, 119 ações)

Total medido: **2097,1s (~35min)**. Todas as áreas com `tentativas: 1` — nenhum
retry aconteceu nessa rodada (descarta a hipótese de que `MAX_AREA_ATTEMPTS`
reabrindo área fosse o vilão principal).

| # | Área | Segundos | Ações |
|---|---|---:|---:|
| 1 | Udemy - Formação Completa em Inteligência Artificial 2026 | 736,0 | 18 |
| 2 | Udemy - GitHub Copilot: Do Zero à Produtividade Máxima com GenAI | 576,0 | 12 |
| 3 | Tecnologias de Software (Backend, Frontend DevOps e Low-Code) | 467,1 | 8 |
| 4 | Udemy - DOCKER Completo do Zero ao Avançado | 173,0 | 8 |
| 5 | OpenCode | 27,0 | 1 |
| 6 | IA - AI Driven Development - Formação DEV Cod3r | 17,4 | 12 |
| 7 | Udemy - PLN, LLMs e GenAI | 14,0 | 10 |
| 8 | Udemy - Kubernetes Descomplicado | 14,0 | 10 |
| 9 | Dados, Inteligência Artificial e Automação | 12,0 | 8 |
| 10 | Engenharia de Plataforma e Orquestração Agêntica | 11,3 | 11 |
| 11 | Idiomas e Comunicação Internacional | 9,0 | 5 |
| 12 | Competências Comportamentais e Cultura | 9,0 | 5 |
| 13 | Projeto de Inovação (TideFlow / Protrack / Maré) | 8,0 | 4 |
| 14 | Projeto de Inovação (PDI+) | 7,0 | 3 |
| 15 | CESAR Hub PWA | 6,0 | 2 |
| 16 | Udemy - IDE Antigravity | 5,4 | 7 |
| 17 | Formação Acadêmica e Certificações | 4,9 | 2 |

(Nota: os prints originais dessa rodada ficaram só no chat da sessão —
screenshot de DevTools é dado de sessão, não arquivo de projeto; o que importa
pra análise é a tabela acima, transcrita exata dos números medidos.)

## Análise

**93% do tempo (1952,1s de 2097,1s) está concentrado nas 4 primeiras áreas.**
Da 5ª em diante, tudo roda rápido e estável (a maioria < 15s), mesmo em áreas
com bastante conteúdo (ex.: #10, 11 ações, 11,3s).

O que isso **descarta**:
- **Volume de conteúdo não explica**: a área mais lenta (736s/18 ações) não é
  proporcionalmente pior que a #6 (17,4s/12 ações) — é ordem de grandeza, não
  proporção.
- **Retentativa não explica**: `tentativas: 1` em todas as 17.
- **Custo fixo por área não explica**: se fosse, a curva seria parecida do
  início ao fim, não essa queda abrupta.

O que isso **sugere**: um custo de "aquecimento" pago só nas primeiras
interações — compatível com code-splitting da SPA (o JS do painel de detalhe
de uma área sendo baixado/compilado pela 1ª vez) ou com o próprio processo
"esquentando" (JIT, cache de conexão, etc.) logo após a janela escondida
abrir. Não é um custo por área repetido — é um custo de "primeira vez".

## Teste do aquecimento (concluído — refutado)

**Hipótese testada**: abrir e fechar uma área descartável (a 1ª da lista),
ANTES do loop real de extração, pagaria esse custo de aquecimento fora do que
é medido/salvo. Se a hipótese estivesse certa, as áreas reais (inclusive a 1ª
de verdade, que entra no loop depois do aquecimento) deveriam se comportar
como as áreas #5-17 da 1ª rodada (rápidas), não como #1-4.

Implementado em `extract.js` (abrir/esperar/voltar numa área antes do loop
principal, sem gravar `rows` nem `timings`) e testado. **Removido** depois do
resultado abaixo, por não trazer benefício nenhum.

**Resultado da 2ª rodada (com aquecimento)**: hipótese **refutada** — piorou.

| # | Área | Segundos | Tentativas | Ações |
|---|---|---:|---:|---:|
| 1 | Udemy - Formação Completa em Inteligência Artificial 2026 | 1200,9 | 2 | 18 |
| 2 | OpenCode | 960,1 | 1 | 1 |
| 3 | Tecnologias de Software (Backend, Frontend DevOps e Low-Code) | 557,4 | 1 | 8 |
| 4 | Udemy - Kubernetes Descomplicado | 357,4 | 1 | 10 |
| 5 | Idiomas e Comunicação Internacional | 300,0 | 1 | 5 |
| 6 | Competências Comportamentais e Cultura | 300,0 | 1 | 5 |
| 7 | Projeto de Inovação (TideFlow / Protrack / Maré) | 240,0 | 1 | 4 |
| 8 | Projeto de Inovação (PDI+) | 180,0 | 1 | 3 |
| 9 | Dados, Inteligência Artificial e Automação | 121,0 | 1 | 8 |
| 10 | CESAR Hub PWA | 120,0 | 1 | 2 |
| 11 | Formação Acadêmica e Certificações | 120,0 | 1 | 2 |
| 12 | Udemy - PLN, LLMs e GenAI | 73,1 | 1 | 10 |
| 13 | IA - AI Driven Development | 16,1 | 1 | 12 |
| 14 | Udemy - GitHub Copilot | 16,0 | 1 | 12 |
| 15 | Engenharia de Plataforma e Orquestração Agêntica | 12,7 | 1 | 11 |
| 16 | Udemy - DOCKER Completo do Zero ao Avançado | 11,6 | 1 | 8 |
| 17 | Udemy - IDE Antigravity | 5,2 | 1 | 7 |

Total medido: **4591,5s (~76,5min)** — mais que o DOBRO da 1ª rodada (2097,1s),
mesmo removendo (supostamente) o "custo de primeira vez" via aquecimento.

**Por que isso refuta a hipótese**:
- A 1ª área real continua entre as mais lentas (1200,9s) — e agora com
  **2 tentativas** (retry), coisa que não aconteceu na 1ª rodada. O aquecimento
  não evitou o custo, só **somou um ciclo inteiro a mais** em cima do mesmo
  problema.
- As áreas lentas **não são as mesmas** entre as rodadas. Na 1ª, eram sempre as
  4 primeiras da lista. Nesta, "OpenCode" (27s → 960s) e "Kubernetes" (14s →
  357s) viraram as mais lentas, enquanto "Docker" (173s → 11,6s) e "GitHub
  Copilot" (576s → 16s) — as piores antes — ficaram rápidas. Se fosse
  code-splitting (custo de baixar/compilar JS na 1ª vez), a lentidão seguiria
  sempre a mesma área ou posição. Ela não segue — muda de rodada pra rodada.

**Conclusão revisada**: a lentidão concentrada não é um custo fixo de
"aquecimento" da SPA. É mais consistente com **fator externo variável** —
rede, throttling do Chrome na janela minimizada, ou carga da máquina no
momento do teste — que afeta áreas diferentes a cada execução. O aquecimento
implementado em `extract.js` não ajuda (só adiciona overhead) e deve ser
**removido** antes de qualquer outra tentativa de otimização.

**Próximos passos possíveis**:
- ~~Reverter o aquecimento~~ — feito (não tinha benefício medido, só custo).
- ~~Testar uma janela pequena e NÃO minimizada~~ — feito, ver "Experimento 3" abaixo.
- Reduzir o `sleep(700)` fixo em `loadActionRows` (ver relatório técnico maior)
  — ganho pequeno mas garantido, independente da causa da lentidão variável.
- Aceitar que o tempo total é inerentemente variável (depende de rede/SO no
  momento) e focar em UX de espera (progresso mais claro) em vez de reduzir o
  tempo bruto.

## Experimento 3 — janela sem minimizar (2026-11-23)

**Hipótese**: a janela escondida roda `state: "minimized"`, o que deixa
`document.visibilityState === "hidden"` — o nível de throttling MAIS agressivo
que o Chrome aplica (mais forte que só "aba sem foco"). A lentidão concentrada
mas em áreas diferentes a cada rodada (ver análise acima) bate com throttling
variando com a carga do momento, não com um custo fixo — plausível que
minimizar seja o fator.

**Mudança**: `openHiddenWindow` em `background.js` não minimiza mais — abre
uma janela pequena (420x300) num canto da tela (`left: 2, top: 2`), sem foco.
Tecnicamente "visible" pro Chrome (não devia levar o throttling de página
oculta), mas discreta.

**Trade-off consciente**: a janela agora aparece de verdade na tela (pequena,
no canto) durante a sincronização — antes era 100% invisível. Se isso incomodar
na prática, dá pra voltar a minimizar (throttling e tudo) ou tentar outro
tamanho/posição.

**Resultado**: **refutado também**. Total 2362,0s (~39min) — mesma ordem de
grandeza da rodada 1 (minimizada), não uma melhora. Revertido de volta pra
`state: "minimized"` (não tem motivo pra pagar o custo de UX de uma janela
visível sem ganho nenhum).

**Achado mais importante desse experimento** — olhando as 3 rodadas por
**posição** na lista processada, não por nome da área:

| Rodada | 1ª área processada | 2ª área processada |
|---|---|---|
| 1 (minimizada) | Udemy Formação IA — 736,0s | GitHub Copilot — 576,0s |
| 2 (minimizada + aquecimento) | Udemy Formação IA — 1200,9s | **OpenCode — 960,1s** |
| 3 (não minimizada) | **OpenCode — 961,0s** | IA AI Driven — 414,0s |

A área lenta muda de identidade entre rodadas (não é sobre qual área tem mais
conteúdo — "OpenCode" tem **1 única ação** e ainda assim levou ~960s nas
rodadas 2 e 3, contra 27s na rodada 1, quando estava na 5ª posição). O que se
repete é a **posição**: a 1ª (e quase sempre a 2ª) área processada é sempre
anormalmente lenta, não importa qual é. Isso também descarta minimização de
janela como causa principal — testamos com e sem, o padrão persiste igual.

## Experimento 4 — instrumentação por sub-etapa (em andamento)

Em vez de continuar testando no nível da janela "às cegas", `extract.js` e
`background.js` agora registram, por TENTATIVA de cada área, a duração de
cada sub-etapa: abrir o painel, esperar a aba "Ações", carregar a lista de
ações (quantos "rounds" de rolagem precisou e quanto tempo os `sleep(700)`
levaram de verdade — pra flagrar se o Chrome está atrasando os timers da aba
em segundo plano), aba "Mais informações" e "Voltar".

No console do service worker, depois de rodar uma sincronização:
```js
chrome.storage.local.get("lastTimings").then(r => console.table(r.lastTimings))
// detalhe completo (todas as tentativas) da área no topo da tabela acima:
chrome.storage.local.get("lastTimingsRaw").then(r => console.log(r.lastTimingsRaw[0]))
```

**Resultado**: achou a causa. Sub-etapa `carregar_acoes_s` (dentro de
`loadActionRows`/`extractActionRow`) concentra quase 100% do tempo das 2
primeiras áreas, e só dela:

| Área (posição) | Ações | carregar_ações | custo por ação |
|---|---:|---:|---:|
| Udemy Formação IA (1ª) | 18 | 818,3s | 45,5s |
| Udemy PLN/LLMs (2ª) | 10 | 479,0s | 47,9s |
| OpenCode (3ª) | 1 | 9,6s | 9,6s (normal) |

O custo por ação é **quase idêntico** nas duas primeiras áreas (45,5s e
47,9s) e `carregar_acoes_rounds` ficou em 1 nas duas — ou seja, não precisou
rolar pra carregar mais nada; o tempo inteiro foi gasto DENTRO do
processamento de cada ação já visível. Isso aponta direto pro único
`setTimeout` chamado uma vez POR AÇÃO: `extractActionRow` clica em "Mostrar
descrição" e dá `sleep(400)` antes de ler o texto expandido.

**Causa real**: throttling de timers do Chrome em aba em 2º plano (mais forte
ainda por estar minimizada). `setTimeout`/`setInterval` levam até ~1 execução
por minuto quando a aba está escondida tempo suficiente — isso bate quase
exato com os ~45-48s medidos por ação. Não é sobre qual área é, nem sobre
volume de conteúdo da área — é sobre em que momento da sincronização aquele
`setTimeout` específico caiu (os primeiros minutos após abrir a janela
escondida), e some depois porque o navegador parece "liberar" o throttling
conforme o processo segue.

**Correção aplicada**: trocado o `sleep(400)` pós-clique por
`waitForMutation(item, 1500)` — espera via `MutationObserver` em vez de
`setTimeout`. MutationObserver dispara no instante em que o React atualiza o
DOM de verdade, SEM depender de um timer agendado — não leva o throttling.
Mantém um `setTimeout` só como rede de segurança (1500ms) caso a mutação
nunca aconteça, mas no caso normal resolve quase instantâneo.

**Próximo teste**: rodar de novo e comparar `carregar_acoes_s` das 2 primeiras
áreas contra esta tabela — se a correção funcionar, deve cair de ~45-48s/ação
pra perto de 0 (o tempo real da mutação, não mais o timer).

**Resultado real (2026-11-24)**: a correção NÃO resolveu — ficou pior (total
4006,2s, ~67min). Mas o padrão mudou de um jeito que confirma a causa:

| Área (posição) | Ações | carregar_ações | por ação |
|---|---:|---:|---:|
| Udemy Docker (1ª) | 8 | 801,1s | **100,1s** |
| OpenCode (2ª) | 1 | 807,4s (13 rounds) | — |
| Udemy Formação IA (4ª, agora corrigida) | 18 | 1,3s | **quase 0** ✓ |

A área "Formação IA" (que antes era sempre a pior) ficou rápida de verdade —
a correção funcionou ONDE foi aplicada. Mas o custo só **migrou**: a 1ª área
processada agora é lenta na mesma sub-etapa (Docker, 100,1s/ação — pior ainda
que antes), e a 2ª (OpenCode) ficou lenta no LOOP DE ROLAGEM de
`loadActionRows` (807,4s em 13 rounds ≈ 62s/round, mesmo `sleep(700)` que
ficava ali, só que agora exercido por causa de só ter 1 ação só — menos óbvio
qual sub-etapa seria afetada).

**Diagnóstico revisado**: o problema não está numa chamada específica — é o
THROTTLING EM SI, ligado nos primeiros minutos de qualquer sincronização
(aba escondida sempre sem foco, minimizada ou não). Qualquer `setTimeout`
usado durante essa janela "pega" o custo, não importa qual. Corrigir uma
chamada de cada vez só empurra o problema pra próxima que for usada. Também
achado provável: o toggle "Mostrar descrição" pode mudar só uma CLASSE/
atributo (não texto/filho), e o `MutationObserver` da 1ª correção não
observava `attributes` — por isso ainda caía no timeout de segurança (que
também é um `setTimeout`, também throttlado).

## Experimento 5 — generalizar para mutação em vez de timer (em andamento)

Em vez de corrigir chamada por chamada, generalizado: `waitForMutation` passou
a observar `attributes` também (cobre toggle por classe/estilo, não só texto
novo), e a função `waitFor` (usada em quase toda espera do arquivo — abrir
painel, aba Ações, aba Mais informações, botão Voltar, paginação) deixou de
reconferir a cada `setTimeout(intervalMs)` e passou a reagir a qualquer
mutação no documento inteiro antes de reconferir. O loop de rolagem de
`loadActionRows` (o `sleep(700)` que pegou o OpenCode) também passou a usar
`waitForMutation` em vez de um `sleep` fixo. Mantém o mesmo teto de tempo em
todo lugar (sem risco de regressão se nada mudar) — a diferença é resolver
quase na hora quando o DOM muda de verdade, em vez de esperar o próximo tick
de um timer que pode estar levando ~60s pra disparar.

**Resultado (2026-11-24)**: **resolvido**. Total caiu de até 4591,5s (~76min)
pra **~52,1s** — mesma sincronização, 17 áreas, 119 ações.

| Área | Antes (pior caso visto) | Depois |
|---|---:|---:|
| OpenCode | ~960s | 18,3s |
| Udemy Formação IA (18 ações) | ~1200,9s | 3,1s |
| Udemy DOCKER (8 ações) | 1045s | 2,1s |

Confirma a causa raiz: throttling de `setTimeout`/`setInterval` do Chrome na
aba em 2º plano (minimizada). Generalizar `waitFor`/`waitForMutation` pra
reagir a mutação real do DOM em vez de reconferir num timer resolveu de
verdade — não é mais sobre qual área ou posição, porque não existe mais
nenhuma espera presa num timer pra ser throttlada.

**Conclusão final**: a sincronização que levava 16-76 minutos (dependendo da
sorte com o throttling) agora leva **menos de 1 minuto**. Confirmado
visualmente pelo usuário: áreas, ações e blocos no canvas continuam os
mesmos de antes — o `mergePdi` preservou tudo, só os dados foram atualizados.
Confirmado também que o resultado é **consistente**, não sorte de uma rodada
só — 2ª rodada de controle deu 68,6s (1ª tinha dado 52,1s), mesma faixa.
**Problema fechado.**

## O que ficou aprendido

- Throttling de `setTimeout`/`setInterval` do Chrome em aba em 2º plano é
  MUITO mais severo do que parece na documentação superficial — passou de
  ~ms nominal pra até ~60s por timer em certos pontos, e o custo migra pra
  qualquer timer "na ativa" no momento certo, não fica fixo num lugar.
- Testar no nível da JANELA (minimizar ou não, tamanho, posição) não resolveu
  nada sozinho — o que resolveu foi tirar a DEPENDÊNCIA de timer da lógica de
  espera em si (`MutationObserver`, que reage a mudança real no DOM).
- Corrigir ponto a ponto (Experimento 4) só empurrou o sintoma pra outro
  lugar — generalizar a correção (Experimento 5) é que resolveu de vez.
- Medição por sub-etapa (Experimento 4) foi o que permitiu ver isso com
  precisão, em vez de ficar chutando no nível da janela inteira.

## Encerramento (2026-11-25)

- 3ª rodada de controle (ainda com instrumentação): 57,1s em 17 áreas.
- Instrumentação temporária removida de `extract.js` e `background.js`
  (`timings`, `attemptSteps`, `lastTimings*`). Ficou só a correção:
  `waitForMutation` + `waitFor` orientado a mutação.
- Teste final SEM instrumentação, cronometrado à mão: **1min08s**. Mesma
  faixa das rodadas anteriores (52s, 68s, 57s). Investigação encerrada.
