# @pdi-mais/extension — placeholder (Rodada 3)

A extensão Chrome (Manifest V3) entra aqui na **Rodada 3** do roadmap.

Estrutura prevista:

```
apps/extension/
├── manifest.json          # M3, externally_connectable restrito ao domínio de produção
├── src/
│   ├── content.ts         # parser tolerante do DOM -> payload de /api/sync
│   ├── background.ts      # service worker: guarda o token entregue pelo PWA
│   └── popup/             # botão "Sincronizar" + feedback de sync parcial
└── public/
```

Fluxo de autenticação: o PWA (`ExtensionBridge`) entrega um token de sessão
curto via `chrome.runtime.sendMessage`; a extensão manda esse token no header
do `POST /api/sync`.

> **Antes de rodar o content script contra a plataforma real do CESAR:**
> validar com TI/Segurança. Até lá, testar só contra uma página HTML local
> com atributos `data-pdi-*` (ver docs/TEST-CHECKLIST.md, seção 7).
