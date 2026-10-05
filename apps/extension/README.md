# @pdi-mais/extension — Rodada 3 (v0.1, aguardando aval de TI/Segurança)

Extensão Chrome (Manifest V3) que lê o PDI aberto no Qulture.rocks
(`app.qulture.rocks/.../my-idp`) e monta a mesma tabela de 7 colunas que
`packages/core/src/import.ts` (`parseImportTable`) já espera — você copia e
cola em **PDI+ → Importar → Colar tabela**, o fluxo que já existe e já é
testado.

## Por que não chama a API direto

O plano original (ver histórico deste README) previa a extensão chamar
`POST /api/sync` direto, com um token de sessão entregue pelo PWA. Como a
extensão ainda depende de aval de TI/Segurança do CESAR, a v0.1 ficou
deliberadamente mais simples **para facilitar a revisão**:

- **Zero chamada de rede.** `host_permissions` só serve pra rodar o script de
  leitura na aba; nada é enviado a lugar nenhum pela extensão.
- **Zero permissão além de ler a aba ativa** (`activeTab` + `scripting`).
- Nada é salvo nem sincronizado sozinho — o usuário decide o que colar,
  exatamente como já faz hoje colando de uma planilha.

Se/quando isso for aprovado e o usuário quiser automatizar o próximo passo
(enviar direto pro `/api/sync`), dá pra evoluir pra isso depois — mas como
mudança incremental, não como pré-requisito pra essa primeira versão rodar.

## Estrutura

```
apps/extension/
├── manifest.json   # MV3 — activeTab + scripting, host_permissions só qulture.rocks
├── popup.html       # botão "Extrair" + textarea com o CSV + "Copiar"
├── popup.js         # dispara a extração na aba ativa, mostra o resultado
└── extract.js       # injetado via chrome.scripting.executeScript — só leitura do DOM
```

## Como testar localmente

1. `chrome://extensions` → ativa "Modo do desenvolvedor" → **Carregar sem
   compactação** → aponta pra esta pasta (`apps/extension`).
2. Abre sua página de PDI no Qulture.rocks (`.../my-idp`), com a lista de
   áreas visível.
3. Clica no ícone da extensão → **Extrair PDI desta página**.
4. Confere a tabela gerada na caixa de texto, copia, e cola em
   **PDI+ → Importar → Colar tabela**.

## Limitação conhecida (v0.1, não testada contra a página real)

A extração abre cada área (clique), lê a aba "Ações" e "Mais informações",
fecha ("Voltar") e passa pra próxima — automaticamente, uma de cada vez.
Os seletores usam `data-testid` (estável) e padrões de **texto** (status
conhecido, "Prazo:", "Mostrar descrição") em vez de nomes de classe exatos,
porque o Qulture.rocks usa styled-components com sufixo de hash que muda a
cada deploy deles.

Isso foi escrito a partir de screenshots do DOM, sem rodar contra a página
real — é bem provável que precise de 1-2 ajustes depois do primeiro teste ao
vivo (timing de animação, texto de botão ligeiramente diferente, etc.). Teste
numa área só primeiro antes de confiar no resultado completo.

> **Antes de usar contra a plataforma real do CESAR**: validar com
> TI/Segurança, mesmo sendo só leitura local sem rede.
