# Setup do ambiente — PDI+

Guia passo a passo pra rodar o `apps/web` local. Tempo: ~20 min.

---

## 1. Ferramentas

- **Node 20+** — confira com `node -v`.
- **pnpm 9** — se não tiver: `corepack enable` (vem junto com o Node).
  Confira com `pnpm -v`.

```bash
git clone https://github.com/Hugoleosilva/PDI_MAIS.git
cd PDI_MAIS
pnpm install
```

---

## 2. MongoDB Atlas (banco)

1. Crie conta em <https://www.mongodb.com/cloud/atlas> e um cluster gratuito (M0).
2. **Database Access** → adicione um usuário/senha (anote a senha).
3. **Network Access** → **Add IP Address** → em dev pode usar `0.0.0.0/0`
   (libera qualquer IP; troque por algo restrito antes de produção).
4. **Database** → **Connect** → **Drivers** → copie a connection string.
   Fica tipo:
   ```
   mongodb+srv://meu-user:<SENHA>@cluster0.ab12c.mongodb.net/?retryWrites=true&w=majority
   ```
   Troque `<SENHA>` pela senha real do passo 2.

---

## 3. Google OAuth (login)

1. Acesse <https://console.cloud.google.com/> e crie um projeto (ou use um).
2. **APIs e serviços** → **Tela de permissão OAuth**:
   - Tipo de usuário: **Externo**.
   - Preencha nome do app e e-mail de suporte.
   - Em "Usuários de teste", adicione seu próprio e-mail (senão o login é
     bloqueado enquanto o app está "em teste").
3. **APIs e serviços** → **Credenciais** → **Criar credenciais** →
   **ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - **Origens JavaScript autorizadas:** `http://localhost:3000`
   - **URIs de redirecionamento autorizados:**
     `http://localhost:3000/api/auth/callback/google`
4. Copie o **ID do cliente** e a **Chave secreta do cliente**.

---

## 4. Variáveis de ambiente

```bash
cp apps/web/.env.example apps/web/.env.local
```

Abra `apps/web/.env.local` e preencha:

| Variável | De onde vem |
|---|---|
| `MONGODB_URI` | connection string do passo 2 |
| `MONGODB_DB` | pode deixar `pdi_mais` |
| `AUTH_SECRET` | rode `npx auth secret` e cole o valor |
| `AUTH_GOOGLE_ID` | ID do cliente do passo 3 |
| `AUTH_GOOGLE_SECRET` | chave secreta do passo 3 |

> `.env.local` está no `.gitignore` — nunca vai pro GitHub. Não commite segredos.

---

## 5. Rodar

```bash
pnpm dev
```

Abra <http://localhost:3000>:

- A tela mostra "Entrar com Google".
- Depois do login, mostra seu e-mail e o botão "Sair".

Testes da lógica de merge:

```bash
pnpm test
```

---

## 6. Índices do MongoDB (opcional agora, necessário antes de produção)

O helper `ensureIndexes()` em `apps/web/src/lib/pdi-repo.ts` cria:

- `{ userId: 1 }` único
- `{ shareId: 1 }` único + sparse

Você pode chamá-lo de um script único, ou criar os índices na mão pela UI do
Atlas (**Database** → coleção `pdis` → **Indexes**).

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `MONGODB_URI não definida` | `.env.local` não existe ou está em pasta errada (tem que ser `apps/web/.env.local`) |
| `redirect_uri_mismatch` no login | o redirect no Google Cloud não é exatamente `http://localhost:3000/api/auth/callback/google` |
| Login trava em "app não verificado" | adicione seu e-mail em "Usuários de teste" na tela de permissão OAuth |
| `MongoServerError: bad auth` | senha errada na connection string, ou faltou trocar `<SENHA>` |
| Timeout ao conectar no Atlas | seu IP não está liberado em **Network Access** |
