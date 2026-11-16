# Log de erros — extensão (sincronização Qulture → PDI+)

## 2026-11-16 — Teste antes da apresentação

### Contexto
Usuário com PDI real no Qulture (16 áreas de desenvolvimento, muitas ações)
testou a extensão em produção (`pnpm start`, `localhost:3000`) logado com o
e-mail do CESAR, pra ensaiar o fluxo da apresentação. Resultado: canvas
gerado com só 2 áreas e poucas ações, sem nenhum aviso visível durante o
processo.

### Erro 1 — sincronização "não fez nada"
**Sintoma**: clicou no botão "PDI+" da página do Qulture, esperou, abriu uma
aba nova sozinha sem nenhum resultado visível; só depois de clicar "PDI+" de
novo nessa aba é que algo foi gerado (incompleto).

**Evidência**: console do navegador mostrou:
```
Uncaught (in promise) Error: A listener indicated an asynchronous response
by returning true, but the message channel closed before a response was
received
  at content.js:220
```

**Causa raiz**: o service worker da extensão (`background.js`, Manifest V3)
é derrubado pelo Chrome depois de um tempo sem nenhuma chamada de API ativa.
A sincronização inteira (`runSync`) pode levar minutos — extrai do Qulture,
preenche e confirma o import no PDI+ — e passa boa parte desse tempo em
`await sleep(...)`/polls de DOM dentro de uma aba escondida, sem nenhuma
chamada de API da extensão nesse meio tempo. Isso deixa o worker tempo
demais "ocioso" do ponto de vista do Chrome, que o mata NO MEIO da
sincronização. Quando isso acontece, o canal de mensagem entre `content.js`
e `background.js` fecha, e a chamada `chrome.runtime.sendMessage(...)` em
`content.js` rejeita — mas o código não tinha nenhum `catch` ali, só
`try/finally`. O erro ficava só no console (`Uncaught`), o botão resetava
sozinho, e o usuário não recebia NENHUM aviso de que a sincronização tinha
morrido sem terminar.

**Como foi resolvido**:
1. `apps/extension/content.js` — adicionado `catch` no `onClick` do botão
   "PDI+", explicando o problema e sugerindo tentar de novo / abrir o popup.
2. `apps/extension/background.js` — adicionado um "keep-alive": durante
   `runSync`, um `setInterval` a cada 20s chama uma API trivial da extensão
   (`chrome.storage.local.get`) só pra manter o service worker vivo enquanto
   a sincronização roda. Limpo no `finally` (junto com `syncInFlight`).

### Erro 2 — só vieram 2 áreas de 16
**Sintoma**: o PDI real tem 16 áreas de desenvolvimento; o canvas gerado só
trouxe 2.

**Evidência**: usuário confirmou que a lista de áreas no Qulture é
**paginada** (não é carregamento infinito por rolagem): página 1 com 10
áreas, página 2 com 6 áreas (10 + 6 = 16), com paginador "‹ 1 2 ›" no
rodapé da lista.

**Causa raiz**: `apps/extension/extract.js` só sabia rolar a lista de áreas
pra carregar mais itens (mesma técnica usada pra lista de AÇÕES dentro de
cada área, que é virtualizada por rolagem de verdade). Na lista de ÁREAS,
rolar o último card pra vista não carrega a página seguinte — o código
achava que tinha acabado (10 rodadas sem nada novo) e parava, tendo lido só
a primeira página.

**Como foi resolvido**: `apps/extension/extract.js` — ao detectar que uma
rodada não trouxe nenhuma área nova, antes de desistir por rolagem, agora
procura um controle de paginação (botão com o número da próxima página, ou
seta "›"/"»") perto do fim da lista e clica nele, continuando a extração na
página seguinte. Mantido o scroll como segunda tentativa (defesa), caso
alguma parte da lista ainda seja virtualizada.

**Pendência / a verificar**: a busca pelo botão de paginação é uma
heurística (texto do número da página ou seta, posição logo abaixo do
último card) — escrita sem acesso direto ao DOM real do Qulture nesse
momento. Se não encontrar o botão certo, o aviso já existente
("Esperava N área(s), só consegui processar M") continua disparando, então
a falha fica visível — mas vale testar de novo com o PDI real de 16 áreas
antes da apresentação pra confirmar que pega as duas páginas certinho.

### Observação à parte
Também foi esclarecido (não é bug, é comportamento intencional do design
atual): a extração e o preenchimento do formulário de import rodam numa
janela escondida/minimizada e o import é confirmado automaticamente — o
usuário nunca vê a tela de pré-visualização/relatório no meio do processo,
só o resultado final (ou um alerta de erro). Isso explica por que "não
abriu pra eu ver o relatório do que estava sendo gerado".

### Erro 3 — "Cannot read properties of undefined (reading 'local')"
**Sintoma**: depois dos ajustes do Erro 1/2, ao recarregar a extensão e
clicar em "PDI+" na página do Qulture, o alerta passou a aparecer quase
instantâneo (não depois de minutos) com essa mensagem. Testado: F5 na aba,
aba nova, até remover e reinstalar a extensão inteira — mesmo erro todas as
vezes. Em paralelo, testar `chrome.storage` direto no console da aba também
voltava `undefined`.

**Investigação**: a mensagem vem da primeira linha do `onClick` em
`content.js` (`chrome.storage.local.get(...)`), ou seja, `chrome.storage`
estava `undefined` dentro do content script. Testado o mesmo em outro
contexto — o console do **service worker** da extensão (`chrome://extensions`
→ "service worker" → `chrome.storage.local.get(["lastCsv","lastStatus"],
console.log)`) — e ali funcionou normalmente (voltou `{}`), provando que a
API de storage da extensão em si estava saudável. Isso descartou de vez a
hipótese de bloqueio de política do Chrome Enterprise do CESAR (navegador
gerenciado pela organização) — se fosse isso, teria quebrado desde o
primeiro teste do dia, e não funcionou nem parcialmente antes.

**Causa raiz real**: o teste manual de `chrome.storage` direto no console da
aba do Qulture é **inconclusivo por padrão** — o DevTools avalia no contexto
"top" (a página em si, que tem seu próprio `window.chrome` reduzido, sem
`storage`), não no contexto isolado do content script, a menos que se troque
o seletor de contexto manualmente. Isso gerou um falso sinal "undefined" nos
dois testes manuais, mascarando o diagnóstico. O erro real (o alerta, que
esse sim vem de dentro do `onClick` de verdade) tinha uma causa mais simples:
**permissão opcional perdida**. Remover e reinstalar a extensão zera as
`optional_host_permissions` concedidas (a autorização pra `localhost:3000`,
dada uma vez via popup → "Criar PDI+") — depois do reinstall, o fluxo volta
pro estado de primeiro uso, e o botão da página (que não pode pedir
permissão sozinho) só consegue avisar que falta autorizar.

**Como foi resolvido**: sem mudança de código — só reautorizar via popup da
extensão → "Criar PDI+" → aceitar o prompt de permissão do Chrome pra
`http://localhost:3000/*`. Depois disso o botão da página voltou a funcionar.
Adicionado um `console.log("[PDI+ diag]", {...})` temporário no topo do
`content.js` durante a investigação, removido depois de confirmar a causa.

**Lição pra não repetir**: testar `chrome.storage` (ou qualquer API da
extensão) direto no console de uma aba comum SEM trocar o contexto de
execução (dropdown "top" no DevTools) não prova nada sobre o content
script — só serve testando a partir do console do **service worker**, ou de
um `console.log` colocado dentro do próprio arquivo da extensão.

### Melhoria — aviso de progresso visível na página
**Pedido do usuário**: a sincronização não mostrava NADA na tela enquanto
rodava (só o botão com spinner parado por minutos) — risco real de clique
repetido, F5, fechamento da aba ou desistência achando que travou,
especialmente na apresentação. Pediu também um percentual tipo barra de
download, não só texto.

**Como foi resolvido**:
1. `apps/extension/background.js` — `sendProgress(text, percent)` ganhou um
   segundo parâmetro opcional, repassado pra quem já escutava
   (`chrome.runtime.sendMessage({ type: "progress", text, percent })`).
   Marcos: 0% (abrindo a janela de leitura), 70% (extração terminou,
   preenchendo o PDI+), 100% (confirmado).
2. `apps/extension/extract.js` — nova `sendAreaProgress(done, total)`,
   chamada antes do loop e depois de cada área processada, usando o total
   real (`expectedAreaCount`, lido de "Área de Desenvolvimento (N)") pra
   calcular um percentual dentro da faixa 0-70% (a extração é a parte mais
   lenta, pesa mais no total).
3. `apps/extension/content.js` — agora escuta `chrome.runtime.onMessage`
   (type "progress") e mostra um aviso fixo no canto da tela (texto + barra
   de progresso), igual a um download. Antes só o popup escutava isso;
   clicar direto no botão da página (o caminho mais comum) não mostrava
   nada. Começa a aparecer já no clique ("Iniciando sincronização...") e
   some no `finally` do `onClick`.
4. `apps/extension/content.css` — estilo da barra (`.pdi-mais-progress`,
   `__bar`, `__fill`), consistente com o visual do botão "PDI+" existente.

### Erro 4 — a correção da paginação (Erro 2) não disparava: parava em 9-10/16
**Sintoma**: com a barra de progresso nova, ficou visível em tempo real que a
extração parava em "9/10" (ou "10/10") e nunca chegava na página 2 — o
canvas final saiu com só 9 áreas de 16.

**Causa raiz**: o rótulo "Área de Desenvolvimento (N)" no Qulture mostra o
total da **página atual**, não o total geral (confirmado: "(10)" na página
1, de um total real de 16). O código guardava esse número numa `const
expectedAreaCount` e usava ele numa condição de parada antecipada:
```js
if (expectedAreaCount && processedTitles.size >= expectedAreaCount) break;
```
Como essa checagem vinha ANTES da lógica de paginação (adicionada no Erro
2), assim que a página 1 terminava de ser processada (`processedTitles.size
>= 10`), o loop saía achando que tinha acabado — nunca chegava a executar o
clique pra página 2. A correção do Erro 2 nunca tinha chance de rodar nesse
cenário.

**Como foi resolvido**: `apps/extension/extract.js` —
1. Removida a parada antecipada baseada nesse total (agora é só uma
   estimativa, não uma trava).
2. Nova variável `areaTotalGuess` (em vez de `expectedAreaCount` fixo):
   recalculada toda vez que a paginação avança de página
   (`processedTitles.size` já confirmado + o "(N)" da página nova — ex.:
   10 + 6 = 16), usada tanto no aviso final de áreas faltando quanto no
   percentual da barra de progresso.
3. A parada de verdade do loop continua sendo a mesma de antes (10 rodadas
   seguidas sem nenhuma área nova E sem botão de próxima página disponível).

### Erro 5 — a causa real por trás dos números variando a cada tentativa (2, 8, 9, 10...)
**Sintoma**: mesmo depois do Erro 4, tentativas seguidas vieram com números
bem diferentes e sem padrão (8, depois 2) — não convergia pra 16, e nem
sempre melhorava.

**Causa raiz**: existia (desde antes de hoje) um retorno antecipado logo
depois de processar cada área, no clique do botão "Voltar":
```js
const backBtn = findBackButton();
if (backBtn) { ... } else {
  warnings.push(...);
  return { csv, areaCount: processedTitles.size, actionCount, warnings }; // saía JÁ
}
```
Se `findBackButton()` (que exige o texto EXATO "voltar", via
`/^voltar$/i`) não achasse o botão bem na hora — qualquer instabilidade de
timing, aba em segundo plano mais lenta pra renderizar — a função inteira
retornava ALI MESMO, sem erro, sem exceção, só com o que já tinha lido até
aquele ponto. Como é uma corrida (timing), cada tentativa parava num lugar
diferente — por isso os números sem padrão. Isso nunca teve relação com a
paginação (Erro 2/4); são bugs independentes que se mascaravam um ao outro.

**Como foi resolvido**: `apps/extension/extract.js` — antes de desistir,
agora espera até 5s pelo botão "Voltar" (`waitFor`, igual ao resto do
arquivo) antes de aceitar que não apareceu. E mesmo se continuar sem achar,
**não retorna mais** — só registra o aviso e deixa o loop seguir; se
realmente ficou preso fora da lista, a rodada seguinte não acha nenhuma
área nova e o loop termina sozinho pela via normal (rodadas estáveis),
preservando tudo que já foi lido com um aviso claro no resultado final.

### Erro 6 — a causa raiz de verdade da contagem variando sem padrão
**Sintoma**: mesmo depois do Erro 5, tentativas seguidas ainda vinham com
números bem diferentes (9, 8, 2, 7) — sempre dentro da página 1 (nunca
chegava nem perto da página 2), sem nenhum erro reportado.

**Causa raiz**: no trecho que decide desistir (depois de várias "rodadas"
sem achar área nova), a espera só acontecia SE houvesse algum card pra
rolar:
```js
if (lastCard) {
  lastCard.scrollIntoView({ block: "end" });
  await sleep(700); // só esperava DENTRO do if!
}
```
Bem no instante em que a lista de áreas fica vazia (um lapso curto, logo
depois de clicar "Voltar", antes da SPA recarregar os cards), `lastCard` é
`undefined` — e sem nenhum card, o código pulava a espera INTEIRA. Isso
fazia as rodadas de "parece que estabilizou" se esgotarem quase
instantâneas, bem no meio desse vazio passageiro, antes de dar qualquer
chance real da lista voltar a aparecer. Como a duração desse lapso varia a
cada vez (depende de quão rápido a API da Qulture responde naquele
instante), o ponto de parada também variava — exatamente o padrão visto.

**Como foi resolvido**: `apps/extension/extract.js` —
1. O `sleep(700)` saiu de dentro do `if (lastCard)` — agora espera sempre,
   tenha ou não card pra rolar.
2. O limite de "rodadas estáveis" antes de desistir subiu de 10 pra 20
   (agora que cada rodada espera de verdade, isso dá ~14s de paciência real
   em vez de alguns milissegundos).

Resultado depois desse: **16 de 16 áreas** extraídas pela primeira vez.
Sobrou só um aviso em 2 delas: "não encontrei nenhuma ação" — confirmado
com o usuário que essas 2 áreas (11 e 18 ações cada, conferido na tela real
do Qulture) têm ações de verdade, não estavam vazias. Virou o Erro 7.

### Erro 7 — mesmo bug, agora na lista de AÇÕES dentro da área
**Sintoma**: 2 áreas específicas (com bastante ação — 11 e 18) sempre
voltavam com 0 ações lidas, mesmo tendo ações reais.

**Causa raiz**: idêntica ao Erro 6, só que um nível abaixo —
`loadActionRows()` tinha a mesma desistência instantânea:
```js
const last = current[current.length - 1];
if (!last) break; // sem nenhum item ainda = desiste JÁ, sem esperar
```
Entre o painel da área abrir e a LISTA de ações chegar da API, existe um
instante em que `current` (os `[data-testid="idp-action-item"]` na tela)
está vazio — nesse instante exato, a função desistia na hora, devolvendo
`[]`. Áreas com mais ações (API maior, demora um pouco mais) caíam nesse
instante com mais frequência.

**Como foi resolvido**: `apps/extension/extract.js` — mesmo ajuste do Erro
6: só rola se tiver algo pra rolar, mas espera (`sleep(700)`) sempre,
mesmo com a lista ainda vazia.

Resultado depois desse: **16 áreas, 119 ações, zero avisos** — primeira vez
o relatório saiu limpo. Sobrou só mais um caso, de escopo bem menor.

### Erro 8 — descrição da ÁREA (aba "Mais informações") vindo vazia
**Sintoma**: a área "OpenCode" veio sem nenhuma descrição no PDI+, mesmo
tendo uma descrição de verdade e razoavelmente longa no Qulture (aba "Mais
informações" → "Descrição"). A ação dela, por outro lado, veio com a
descrição certinha.

**Causa raiz**: mesma classe de bug dos Erros 6/7 (checagem única em vez de
espera de verdade), só que essa ainda não tinha sido corrigida: depois de
clicar na aba "Mais informações", o código só esperava `sleep(600)` fixo
antes de procurar o cabeçalho "Descrição" uma única vez. Se a troca de aba
demorasse um pouco mais que isso pra renderizar o conteúdo, a busca batia
vazio e a área ficava sem descrição pro resto da extração — sem aviso
nenhum sobre isso (diferente das ações, que pelo menos geram um warning
quando o número não bate).

**Como foi resolvido**: `apps/extension/extract.js` — trocado o
`sleep(600)` + checagem única por um `waitFor` (até 6s) esperando o
cabeçalho "Descrição" aparecer de verdade antes de ler o texto.

**Pendência**: esse caminho (descrição da área) não gera nenhum aviso
quando falha — ao contrário da contagem de ações, que pelo menos avisa
quando não bate. Vale conferir manualmente, depois da apresentação, se
outras áreas também estão com a descrição vindo certa, já que esse tipo de
falha fica silenciosa no relatório.

## Próximos passos (depois da apresentação, não mexer agora — risco alto
## de quebrar o que acabou de estabilizar horas antes de apresentar)

### 1. Sincronização incremental (só ler o que mudou)
**Problema**: toda sincronização lê as 16 áreas do zero, mesmo que só uma
ação nova tenha sido criada — ~15-20 minutos sempre, por completo. Ruim
pra quem usa no dia a dia, não só hoje.

**Ideia técnica**: hoje não existe API oficial do Qulture pra perguntar "o
que mudou desde a última vez" — é tudo simulação de clique. Mas dá pra
ficar incremental mesmo assim:
1. Antes de abrir qualquer área, `background.js` busca o PDI+ atual (já
   tem endpoint pra isso) e passa esse snapshot pro `extract.js` (via
   `chrome.scripting.executeScript` args, igual já se faz com o CSV).
2. Na visão geral do Qulture, cada card de área já mostra status + "N
   ações" **sem precisar abrir** (confirmado nas telas de hoje: "Desenvolver
   · 1 ação", etc.). `extract.js` compara isso com o que já está salvo por
   título.
3. Área sem nenhuma mudança visível (mesmo status, mesma contagem): não
   abre — reaproveita as ações/descrição já salvas pra montar a linha do
   CSV dessa área.
4. Só abre de verdade (clica, lê ações, lê descrição) as áreas novas ou com
   contagem/status diferente do que já tinha.

Isso devia cortar a maior parte do tempo em sincronizações do dia a dia
(normalmente só 1-2 áreas mudam por vez), mantendo a leitura completa só
quando genuinamente necessário (ex.: primeira vez, ou card damos perdeu
confiança).

### 2. Velocidade de leitura em geral
**Problema**: mesmo com tudo funcionando certo, uma sincronização completa
das 16 áreas levou ~17-20 minutos — boa parte é espera deliberada (rodadas
de `sleep(700)`, até 20 rodadas de "estabilidade" por lista, 3 tentativas
por área quando a contagem de ações não bate de primeira) adicionada hoje
pra corrigir perda de dados. Corrigir a perda de dados era mais urgente que
a velocidade, mas sobrou gordura pra cortar depois com calma:
- Medir, de verdade (contagem de rounds/tempo gasto por fase), onde o tempo
  está concentrado — paginação, abrir/fechar área, ou ler ações dentro de
  cada área — antes de otimizar no escuro.
- A janela escondida/minimizada sofre throttling do Chrome (comentado no
  próprio `background.js`) — vale testar se usar uma aba normal (não
  minimizada, só fora da área visível) muda a working, já que o comentário
  já descarta "fora da tela" mas não necessariamente testou todas as
  variações de throttling.
- Os `MAX_AREA_ATTEMPTS = 3` tentativas (quando a contagem de ações não
  bate) multiplicam o tempo de áreas problemáticas por até 3x — ver se dá
  pra detectar mais rápido que não vai bater (ex.: comparando contagem já
  nas 2 primeiras tentativas) em vez de sempre tentar as 3.
- Separar "paciência contra timing flutuante" (o que foi corrigido hoje,
  não pode diminuir) de "espera desnecessariamente longa só por segurança"
  (o que pode ser encurtado com mais confiança, depois de testar).
