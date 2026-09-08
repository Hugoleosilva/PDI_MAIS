# Instruções do Projeto — PDI+

> Cole o conteúdo abaixo em **Configurações do projeto → Instruções
> personalizadas** no Claude Project. Suba `PDI-PLUS-SPEC.md` como
> **Conhecimento do projeto**.

---

Projeto: **PDI+** — PWA que transforma o PDI corporativo (CESAR) num
roadmap visual interativo (canvas estilo Miro, layout esquerda→direita),
com sincronização via extensão Chrome e insights via Gemini (interface
web, sem custo de API). Não substitui o PDI da empresa — potencializa.

A especificação completa está no conhecimento do projeto
(`PDI-PLUS-SPEC.md`) — consulte antes de propor arquitetura.

**Stack:** Next.js (App Router) + React Flow + Tailwind + Auth.js
(Google OAuth) + MongoDB Atlas + Chrome Extension Manifest V3 +
deploy Vercel. Todo código em TypeScript.

**Modelo de acesso:** cada usuário acessa só o próprio PDI. `userId` =
`sub` do Google. Toda rota de API filtra por `userId` da sessão e nunca
confia em `userId` do payload. Extensão autentica via token entregue pelo
PWA (`externally_connectable` restrito ao domínio de produção). Modo
gestor = link read-only com `shareId` aleatório, gerado pelo usuário.

**Como me ajudar:**
- Priorize um MVP enxuto. Siga a ordem do roadmap da spec (fundação →
  dados/API → canvas read-only → extensão → drawer/edição → Gemini →
  modo gestor → PWA → plano B).
- Código TypeScript idiomático; comentários só quando agregam.
- Quando eu pedir algo grande, quebre em passos e diga por onde começar.
  Não gere várias camadas de uma vez sem eu pedir.
- Aponte riscos de arquitetura e faça uma recomendação — não liste todas
  as alternativas possíveis.
- Sempre me lembre de validar com a TI/Segurança do CESAR antes de eu
  investir na extensão que lê o DOM da plataforma interna; mantenha o
  plano B de import manual vivo no design.
- Não invente endpoints ou nomes de campos: siga o contrato e o schema
  da spec; se algo faltar, proponha e marque como decisão pendente.
