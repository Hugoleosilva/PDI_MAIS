# Progresso do PDI+

Registro do que foi entregue por rodada. Roadmap completo: seção 9 de
[`PDI-PLUS-SPEC.md`](PDI-PLUS-SPEC.md).

---

## ✅ Rodada 1 — Fundação

Monorepo pnpm com `apps/web` (Next.js 15 App Router) e `packages/core`.

**`packages/core`** — lógica pura, testada com Vitest:
- `types.ts` — modelo do PDI (`PdiDoc`, `Area`, `Action`, `PdiLink`, `Status`).
- `labels.ts` — conversão dos rótulos da plataforma (`"Não iniciado"`,
  `"Finalizada"`, `"Desenvolver"`, `"Treinamento e estudo"`…) para os valores
  canônicos internos.
- `progress.ts` — `areaProgress` (ações done ÷ total) e `overallProgress`
  (**média** dos percentuais das áreas — confirmado na plataforma).
- `ids.ts` — id determinístico (hash cyrb53, puro JS) a partir do título
  normalizado; garante merge idempotente.
- `schema.ts` — validação Zod do payload de sync.
- `merge.ts` — `mergePdi(existing, payload)`: aplica um sync preservando
  edições locais (`layout`, `description`) e o status/prazo de ações marcadas
  como `manual`; recalcula o status derivado das áreas.

**`apps/web`**:
- Autenticação **Google OAuth** via Auth.js v5 (sessão JWT; `userId` = `sub`
  do Google). Cada usuário só acessa o próprio PDI.
- Cliente **MongoDB** singleton (`lib/mongo.ts`) + repositório (`lib/pdi-repo.ts`).
- `POST /api/sync` — recebe o PDI, valida sessão + payload, faz upsert.
- `GET /api/pdi` — devolve o documento do usuário.
- Tela de login/logout.

**Infra**: `docs/SETUP.md` com o passo a passo de MongoDB Atlas + Google Cloud.
Deploy alvo: Vercel.

---

## ✅ Rodada 2 — Canvas visual

Canvas interativo em `apps/web/src/components/canvas/` usando **React Flow**
(`@xyflow/react`) + **Dagre** para auto-layout.

**Visual** (paleta da plataforma — `lib/theme.ts`):
- 🟠 laranja = Em progresso · ⚪ cinza = Não iniciado · 🟢 verde-água = Finalizado.
- Nó **raiz** destacado (fundo azul, selo "PDI", barra de progresso geral);
  título e trilha **editáveis por duplo clique** (`PATCH /api/pdi/root`).
- Nós de **área** (status, % e nº de ações, 🕒 se tem ação não iniciada) e de
  **ação** (status, prazo, área, tipo).
- **Painel lateral** ao clicar num nó, com a descrição/comentário (estilo FigJam).

**Formatos de layout** (o usuário escolhe na barra de ferramentas):
| Formato | Descrição |
|---|---|
| Árvore → | raiz → áreas → ações, da esquerda para a direita |
| Árvore ↓ | mesma coisa, de cima para baixo |
| Kanban (status) | 3 colunas: Não iniciado / Em progresso / Finalizado |
| Raias (área) | uma faixa horizontal por área, com suas ações |
| Radial | raiz no centro, áreas em volta |

**Interações**:
- Arrastar nós; **guias de alinhamento** estilo FigJam (linha + snap ao alinhar
  com outro card).
- **Conexões manuais estilo n8n**: arrasta da bolinha de um card até outro para
  ligar áreas/ações que se complementam. Salvas no banco
  (`PdiDoc.links`, `POST`/`DELETE /api/pdi/link`). Não entram no auto-layout.
  Remover: clicar na conexão → botão **×** (ou tecla Delete).
- **Seleção múltipla**: Shift + arraste; move o bloco junto.
- **Desfazer** (Ctrl+Z / botão): posições e conexões, na mesma pilha.
- **Reorganizar**: volta ao auto-layout.
- `GET /api/dev/seed` (só em dev): popula o canvas com o PDI real de exemplo
  (8 áreas, 32 ações) transcrito dos prints.

**Ainda não persiste**: as posições que você arrasta e o formato de layout
escolhido são por sessão (persistência = Rodada 4).

---

## ✅ Rodada 2.5 — Blocos de agrupamento

Frames coloridos (estilo FigJam) que agrupam áreas semelhantes em grandes
blocos estratégicos. Modelo: `PdiDoc.groups` (`PdiGroup` = id, título, cor,
`areaIds`). Pré-configurados 5 blocos para o PDI do Hugo
(`core/groups.ts` → `SEED_GROUPS`):

| Bloco | Áreas |
|---|---|
| Core · Engenharia Full-Stack | Backend · Frontend · TideFlow |
| Inteligência · IA, Agentes & Automação | Inteligência Artificial / Automação |
| Plataforma · Dados & Integrações | Engenharia e Análise de Dados |
| Institucional & Carreira | Comportamental · Inglês |
| Opcional · Plataformas Alternativas | Low-Code |

**Regra de participação (geométrica):** um card pertence ao bloco quando a
**área de desenvolvimento** está dentro do frame. As ações seguem a área.
Recalculado ao mover/redimensionar frame ou mover um card (`recapture`).

**Interação (sem modos):**
- Arrastar um **card** → move só o card.
- Arrastar o **frame** → move o frame + os cards das áreas que estão dentro.
- **Clique / 2 cliques** no bloco → seleciona só o bloco (alças de
  redimensionar + `✕ Excluir`); não seleciona card nenhum.
- **Alças** nas 4 pontas redimensionam; quem entrar/sair pela borda ganha/perde
  o vínculo.
- **Shift+arrastar** → caixa de seleção só de cards.
- **Espaço+arrastar** ou botão do meio → navega.
- Título editável (duplo clique), cor (bolinha), `+ Bloco`, `★ Sugeridos`,
  `💾 Salvar`, toggle `▦ Blocos`.
- Persistência: `PUT /api/pdi/groups` (blocos) + `PUT /api/pdi/canvas`
  (posições + caixas dos frames). Só nos layouts em árvore.

---

## ⏭️ Próximas rodadas

| Rodada | Escopo |
|---|---|
| 3 | Extensão Chrome (Manifest V3): parser do DOM da plataforma + sync 1-clique + link "PDI+" na navbar. **Validar com TI/Segurança do CESAR antes.** |
| 4 | Edição no canvas (status/prazo/nota), persistir layout, deep link Gemini, modo gestor (share link), PWA |
| 5 | Import manual (colar tabela / CSV) — plano B se a extensão não for aprovada |

Checklist de teste manual: [`TEST-CHECKLIST.md`](TEST-CHECKLIST.md).
