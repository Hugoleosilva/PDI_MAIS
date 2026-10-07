# @pdi-mais/extension — Rodada 3 (v0.3, aguardando aval de TI/Segurança)

Extensão Chrome (Manifest V3) que lê o PDI aberto no Qulture.rocks
(`app.qulture.rocks/.../my-idp`) e preenche sozinha o formulário de
importação do PDI+ (**Importar → Colar tabela**, o fluxo que já existe e já
é testado) — tudo em segundo plano, sem mudar a aba que você está olhando.

## Por que não chama a API direto

O plano original (ver histórico deste README) previa a extensão chamar
`POST /api/sync` direto, com um token de sessão entregue pelo PWA. Como a
extensão ainda depende de aval de TI/Segurança do CESAR, ficou
deliberadamente mais simples **para facilitar a revisão**:

- **Zero chamada de rede própria.** `host_permissions` só serve pra rodar
  scripts de leitura/preenchimento nas abas; a extensão nunca manda nada pra
  lugar nenhum — ela só clica e digita numa aba do PDI+ que já está logada
  no seu navegador, reaproveitando o `POST /api/import` que o próprio
  formulário já faz.
- Nada é salvo/sincronizado sem o usuário rodar manualmente.

## Por que tem um `background.js` (service worker)

Versão inicial rodava tudo dentro do popup. Problema: **o popup do Chrome
fecha sozinho assim que perde o foco** — e abrir uma aba nova rouba esse
foco, matando o script no meio do caminho (sem nem logar erro nenhum). A
lógica inteira mora agora no service worker (`background.js`), que não tem
esse problema; o popup só dispara (`chrome.runtime.sendMessage`) e mostra
progresso se continuar aberto, mas o trabalho em si sobrevive mesmo que você
feche a janelinha.

Pelo mesmo motivo (e pra ser discreta — o usuário não precisa ficar vendo a
extensão clicar nos treinamentos), as abas do Qulture e do PDI+ usadas na
sincronização são sempre abertas com `active: false`: ficam em segundo
plano, nunca roubam a aba que você está olhando. Só a aba do PDI+ vem pra
frente no final, se der tudo certo, pra mostrar o resultado.

## Estrutura

```
apps/extension/
├── manifest.json    # MV3 — background service worker + host_permissions sob demanda
├── popup.html        # UI: URL do PDI+, botão "Criar PDI+", status, tabela de depuração
├── popup.js          # só dispara o background e escuta progresso — não faz o trabalho
├── background.js     # service worker: abre as abas em 2º plano, extrai, preenche, confirma
└── extract.js         # injetado no Qulture.rocks via chrome.scripting.executeScript
```

## Como testar localmente

1. `chrome://extensions` → ativa "Modo do desenvolvedor" → **Carregar sem
   compactação** → aponta pra esta pasta (`apps/extension`).
   - Se já tinha carregado uma versão anterior, clica no botão de **recarregar**
     da extensão (ícone de seta circular) depois de qualquer mudança no
     `manifest.json` — ele não recarrega sozinho.
2. Deixe o PDI+ aberto e logado em alguma aba (`pnpm dev`, localhost:3000).
3. Abra sua página de PDI no Qulture.rocks (`.../my-idp`).
4. Clique no ícone da extensão → confere a URL do PDI+ → **Criar PDI+**.
   O Chrome vai pedir permissão pra abrir/preencher a aba do PDI+ — aceite.
5. A aba que você está olhando **não deve mudar** — a sincronização roda em
   abas novas, em segundo plano. Pode fechar o popup, se quiser; reabra
   depois pra ver o status (ele é lembrado).
6. Se der certo, uma aba do PDI+ vem pra frente mostrando o resultado
   importado. Se der erro, a mensagem aparece no popup, e as abas usadas
   ficam abertas em segundo plano (não fecham) pra você poder inspecionar
   (F12 nelas) o que travou.

## Limitação conhecida (ainda não testada contra a página real)

Os seletores usam `data-testid` (estável) e padrões de **texto** (status
conhecido, "Prazo:", "Mostrar descrição") em vez de nomes de classe exatos,
porque o Qulture.rocks usa styled-components com sufixo de hash que muda a
cada deploy deles. Isso foi escrito a partir de screenshots do DOM — é bem
provável que precise de ajuste de timing/seletor no primeiro teste ao vivo
completo. Teste numa área só primeiro.

> **Antes de usar contra a plataforma real do CESAR**: validar com
> TI/Segurança, mesmo sendo só leitura local sem rede própria.
