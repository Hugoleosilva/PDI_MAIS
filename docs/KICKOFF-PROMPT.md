# Prompt inicial — PDI+

> Use na primeira conversa do Claude Project, depois de subir
> `PDI-PLUS-SPEC.md` como conhecimento e configurar as instruções.

---

## Rodada 1 — Fundação e dados

```
Li a spec do PDI+ no conhecimento do projeto. Quero começar o MVP.

1. Proponha a estrutura de pastas do monorepo (app PWA + extensão),
   incluindo onde ficam schema, rotas de API e o pacote da extensão.
2. Defina o schema TypeScript + índices do MongoDB para o documento PDI
   (root, areas, actions, status, dueDate, layout, shareId), fiel à
   seção 5 da spec.
3. Especifique em detalhe o POST /api/sync: validação zod, merge por id
   determinístico, preservação de layout/description locais, resposta.

Só isso nesta rodada — não gere o front nem a extensão ainda.
```

## Rodada 2 — Canvas read-only

```
Agora o canvas. Com base na seção 7 da spec:
- Componente React Flow em tela cheia, layout LR, auto-layout inicial.
- Nós customizados para root / area / action com os 3 estados visuais.
- Arestas: sólida (done), animada (doing), discreta (todo).
- Consome GET /api/pdi. Sem edição ainda.
```

## Rodada 3 — Extensão Manifest V3

```
Agora a extensão. Lembre o alerta de validar com a TI antes de eu usar
de verdade. Entregue:
- manifest.json (M3, externally_connectable no domínio de produção).
- content script: parser tolerante do DOM -> payload do /api/sync.
- fluxo de auth: pegar token de sessão via mensagem com o PWA.
- botão "Sincronizar" no popup + feedback de sync parcial.
```

## Rodada 4 — Drawer, edição manual, Gemini, modo gestor, PWA

```
Fechar o MVP seguindo o roadmap: drawer de detalhes + PATCH de status/
prazo, deep link do Gemini com prompt executivo (lacunas + argumentos
para 1-on-1), shareId + rota /r/[id], e configuração PWA (manifest,
service worker, ícones).
```
