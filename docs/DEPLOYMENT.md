# Deploy do Beta — Vaqen

## Escopo do Beta

No Beta, o Vaqen será lançado sem cobrança Stripe ativa e sem Sentry obrigatório. Esses dois pontos ficam para a preparação da versão oficial.

O Beta precisa obrigatoriamente de:

- Vercel para deploy;
- Neon Postgres para banco;
- Better Auth com email/senha e Google;
- Gmail SMTP ou Resend para emails transacionais;
- Upstash Redis para rate limit;
- Google Cloud OAuth configurado;
- domínio/URL final configurado em `BETTER_AUTH_URL`.

## Variáveis obrigatórias do Beta

Configure na Vercel:

```env
DATABASE_URL=""
DIRECT_URL=""
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GMAIL_SMTP_USER=""
GMAIL_SMTP_APP_PASSWORD=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
BETA_INVITE_ONLY="true"
LEGAL_TERMS_VERSION="2026-07-01"
LEGAL_PRIVACY_VERSION="2026-07-01"
```

`RESEND_API_KEY` pode substituir Gmail SMTP se um domínio de email transacional for configurado.

## Neon

- Use `DATABASE_URL` com pooler para runtime.
- Use `DIRECT_URL` para Prisma Migrate.
- Separe ambientes: development, staging/preview e production.
- Antes de promover deploy, rode:

```bash
pnpm db:deploy
```

- Confirme:

```bash
pnpm prisma migrate status
```

## Google OAuth

No Google Cloud, configure:

- nome público do app: `Vaqen`;
- email de suporte: `vaqen.suporte@gmail.com`;
- URI local: `http://localhost:3000/api/auth/callback/google`;
- URI produção: `https://SEU_DOMINIO/api/auth/callback/google`.

Não altere Client ID/Secret depois de publicados sem atualizar a Vercel.

## Emails transacionais

Para Beta com Gmail SMTP:

- use conta própria de suporte;
- ative verificação em duas etapas;
- gere senha de app;
- preencha `GMAIL_SMTP_USER` e `GMAIL_SMTP_APP_PASSWORD`.

Riscos conhecidos:

- Gmail pode cair em spam;
- Gmail tem limites de envio;
- para a versão oficial, migrar para domínio próprio com SPF/DKIM/DMARC.

## Rate limit

Upstash Redis precisa estar ativo para proteger:

- login;
- cadastro;
- recuperação de senha;
- reenvio de verificação;
- APIs de escrita.

## E2E de staging

Para rodar E2E em staging, configure:

- `E2E_BASE_URL`;
- `E2E_TEST_EMAIL`;
- `E2E_TEST_PASSWORD`;
- `E2E_SIGNUP_INVITE`;
- `E2E_SIGNUP_EMAIL`;
- `E2E_DATABASE_URL`.

Use banco e conta exclusivos de teste. Nunca use produção real com dados de cliente.

## Fora do Beta

Ficam para a versão oficial:

- Stripe Checkout;
- Stripe Customer Portal;
- webhooks live;
- Sentry completo com upload de sourcemaps;
- alertas operacionais avançados.
