# Checklist de Testes Manuais — PDI+ MVP (Rodadas 1–5)

> Marque `[x]` conforme for validando. Ordem pensada para isolar
> problemas cedo — se algo falhar num bloco, resolva antes de seguir
> pro próximo (cada bloco depende do anterior estar funcionando).
>
> Convenção: `[ ]` pendente · `[x]` ok · `[!]` bug encontrado (anote
> abaixo do item o que aconteceu).

---

## 0. Pré-requisitos de ambiente

- [ ] `.env.local` com `MONGODB_URI`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
      `GOOGLE_CLIENT_SECRET` preenchidos
- [ ] Cluster MongoDB Atlas acessível (IP liberado / whitelist)
- [ ] Índices criados na coleção `pdis`:
  - [ ] `{ userId: 1 }` único
  - [ ] `{ shareId: 1 }` único + sparse
- [ ] `pnpm install` na raiz do monorepo sem erro
- [ ] `pnpm --filter web dev` sobe em `localhost:3000` sem erro no console

---

## 1. Fundação — Auth (Rodada 1)

- [ ] Acessar `/` deslogado → redireciona pro login (ou mostra estado
      "faça login")
- [ ] Login com Google funciona e volta pro app
- [ ] Sessão persiste depois de dar refresh na página
- [ ] Logout funciona e bloqueia rotas de novo

**Bugs encontrados:**
```

```

---

## 2. Import manual — plano B (Rodada 5)

> Testar isso antes do canvas porque é o jeito mais rápido de ter dado
> no banco sem depender da extensão.

- [ ] Acessar `/` logado sem nenhum PDI ainda → aparece o
      `EmptyState` com link "Importar manualmente"
- [ ] Ir em `/import`
- [ ] Preencher "Objetivo de carreira"
- [ ] Colar uma tabela de teste (copiar do bloco abaixo, colar direto
      na textarea):

  ```
  Arquitetura de Software,Curso DDD,doing,2026-10-31
  Arquitetura de Software,Design de sistemas distribuídos,todo,
  Backend,Certificação AWS,done,
  Backend,Estudar Kubernetes,todo,2027-01-15
  ```

- [ ] Clicar "Pré-visualizar" → mostra contagem correta (2 áreas, 4 ações)
- [ ] Clicar "Confirmar import" → redireciona pro canvas (`/`)
- [ ] **Caso de erro proposital**: colar uma linha com status inválido
      (ex. `Backend,Item X,xyz,`) → aparece warning, mas o resto do
      import continua funcionando (sync parcial, não tudo-ou-nada)
- [ ] **Caso de erro proposital**: colar uma linha com área ou ação
      vazia → warning, linha ignorada, resto processa normal
- [ ] Testar upload de arquivo `.csv` (mesmo conteúdo do bloco acima
      salvo como arquivo) em vez de colar — resultado deve ser idêntico
- [ ] Testar separador por vírgula E por tab (copiar de uma planilha
      real do Excel/Google Sheets) — os dois devem parsear certo

**Bugs encontrados:**
```

```

---

## 3. Canvas read-only (Rodada 2) + edição (Rodada 4)

- [ ] Depois do import, `/` mostra o canvas com:
  - [ ] Nó raiz (objetivo) na extrema esquerda
  - [ ] Áreas na coluna central
  - [ ] Ações na coluna direita
- [ ] Auto-layout (dagre) não deixa nós sobrepostos na primeira carga
- [ ] Zoom (scroll) e pan (arrastar fundo) funcionam
- [ ] Cores/estados batem com os dados importados:
  - [ ] `done` → verde, aresta sólida
  - [ ] `doing` → amarelo, aresta **animada**
  - [ ] `todo` → cinza esmaecido, aresta discreta
- [ ] Clicar num nó de **ação** abre o drawer lateral
- [ ] Clicar no nó **raiz** NÃO abre drawer (comportamento esperado)
- [ ] No drawer, mudar o status → salva e o nó no canvas muda de cor
      sem precisar dar refresh
- [ ] No drawer, mudar o prazo → salva
- [ ] No drawer, escrever uma nota e clicar fora (blur) → salva
- [ ] Arrastar um nó de **área** para outra posição → soltar → dar
      refresh na página → posição persistiu
- [ ] Arrastar um nó de **ação** → mesmo teste de persistência
- [ ] Fechar o drawer (botão `✕`) funciona

**Teste de não-regressão do merge (importante):**
- [ ] Editar manualmente o status de uma ação pelo drawer (ex. marcar
      "Curso DDD" como `done`)
- [ ] Voltar em `/import` e reimportar a MESMA tabela de teste da seção 2
      (com "Curso DDD" ainda como `doing` no CSV)
- [ ] Depois do reimport, conferir no canvas: o status de "Curso DDD"
      deve continuar `done` (edição manual não foi sobrescrita pelo sync)
- [ ] A posição (`layout`) que você arrastou manualmente também deve
      ter sido preservada

**Bugs encontrados:**
```

```

---

## 4. Deep link Gemini (Rodada 4)

- [ ] Botão "Gerar insight para 1-on-1" aparece no canto da tela
- [ ] Clicar nele:
  - [ ] Mostra feedback "✓ Copiado — cole no Gemini"
  - [ ] Abre `gemini.google.com` em nova aba
- [ ] Colar (Ctrl/Cmd+V) na caixa de prompt do Gemini → texto vem
      formatado com objetivo, progresso por área e pedido de resumo
      executivo
- [ ] Conferir se os dados no prompt batem com o que está no canvas
      (prazos, status, contagem de concluídas)

**Bugs encontrados:**
```

```

---

## 5. Modo gestor — share link (Rodada 4)

- [ ] Gerar `shareId` (botão/ação no PWA — conferir onde ficou no seu
      layout final)
- [ ] Abrir o link `/r/[shareId]` **numa aba anônima** (sem sessão
      logada) → canvas aparece read-only
- [ ] Na aba anônima: nós NÃO são arrastáveis, clique não abre drawer
- [ ] Revogar o share no PWA (autenticado)
- [ ] Recarregar a aba anônima com o link antigo → mostra
      "Link inválido ou revogado"
- [ ] Gerar um novo `shareId` → o link antigo continua inválido, o
      novo funciona

**Bugs encontrados:**
```

```

---

## 6. PWA (Rodada 4)

> Alguns destes só funcionam em build de produção (`pnpm build && pnpm start`),
> não em `pnpm dev` — o service worker se comporta diferente em dev.

- [ ] `pnpm --filter web build && pnpm --filter web start`
- [ ] Chrome DevTools → Application → Manifest: mostra nome, ícones,
      `theme_color` corretos
- [ ] Chrome DevTools → Application → Service Workers: `sw.js`
      registrado e ativo
- [ ] Ícone de "instalar app" aparece na barra de endereço (desktop)
- [ ] Instalar o PWA → abre em janela própria (sem barra de navegação
      do Chrome)
- [ ] Testar em mobile (Android/iOS) se possível: "Adicionar à tela
      inicial" funciona
- [ ] Desligar a rede (DevTools → Network → Offline) e recarregar →
      mostra o último estado cacheado (não tela em branco)

**Bugs encontrados:**
```

```

---

## 7. Extensão — apenas o que dá pra testar SEM tocar na plataforma real

> Lembrete: **não rodar o content script contra a plataforma interna
> do CESAR sem validação prévia de TI/Segurança.** Estes testes usam
> só uma página HTML de mentira, local.

- [ ] Carregar a extensão "unpacked" em `chrome://extensions`
      (Developer mode ativado) sem erro no manifest
- [ ] Copiar o `EXTENSION_ID` gerado e colocar em `ExtensionBridge.tsx`
- [ ] Com o PWA aberto e logado numa aba, confirmar no DevTools do
      **service worker da extensão** que o token chegou
      (`chrome://extensions` → "service worker" → console)
- [ ] Criar um HTML local simples com os atributos `data-pdi-*`
      (título raiz, uma área, uma ação) e abrir como `file://` ou
      servidor local — ajustar `host_permissions`/`matches` do
      manifest temporariamente para testar
- [ ] Clicar no popup "Sincronizar" contra essa página de teste →
      deve extrair e chamar `/api/sync` com sucesso
- [ ] Testar o caso de erro: remover um `data-pdi-action-title` do
      HTML de teste → popup deve mostrar "sync parcial" com o warning
      específico, sem quebrar o resto

**Bugs encontrados:**
```

```

---

## Resumo de bloqueios pendentes (preencher ao final)

| Item | Status | Observação |
|---|---|---|
| Aprovação de TI/Segurança para extensão | ☐ Pendente / ☐ Aprovado |  |
| Seletores reais do DOM da plataforma CESAR | ☐ Pendente |  |
| Ícones PWA (PNG 192/512/512-maskable) | ☐ Pendente |  |
| Decisão: `source: "manual"` por ação inteira ou por campo | ☐ Confirmar |  |
