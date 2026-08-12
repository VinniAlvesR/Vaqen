# Checklist de Segurança de Produção — Vaqen

Use este checklist antes de publicar ou depois de qualquer troca de ambiente.

## Vercel

- `BETTER_AUTH_URL` aponta para o domínio oficial HTTPS, exemplo `https://www.vaqen.work`.
- `DATABASE_URL` e `DIRECT_URL` estão apenas em Environment Variables da Vercel, nunca no Git.
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` estão configurados em produção; sem eles o rate limit não bloqueia.
- `CRON_SECRET` tem pelo menos 32 caracteres aleatórios e não foi reutilizado em outro serviço.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` pertencem ao mesmo par VAPID se Web Push estiver ativo.
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` são do app Google OAuth de produção.
- OAuth Google possui redirect URI de produção: `https://www.vaqen.work/api/auth/callback/google`.
- Secrets antigos foram rotacionados se apareceram em print, log, chat ou commit.
- Variáveis de preview/staging não usam o banco de produção.
- Logs de produção não exibem tokens, URLs de banco, payload completo da Stripe ou senha de app Gmail.

## Neon Postgres

- Banco/branch de produção separado de development/staging.
- Backups/PITR ativos e restauração testada.
- Conexões usam SSL.
- Usuário de runtime do app não é owner/superuser.
- Usuário/URL de migration (`DIRECT_URL`) fica separado do usuário/URL de runtime (`DATABASE_URL`) quando possível.
- Credenciais foram rotacionadas após qualquer exposição em print/log/chat.
- Acesso ao painel Neon restrito a contas necessárias com 2FA.
- Tabelas de dados do usuário possuem `userId` e índices nos principais filtros por usuário.

## Verificações antes de deploy

```bash
pnpm security:secrets
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Opcional em staging com servidor rodando:

```bash
pnpm test:e2e tests/e2e/auth-security.spec.ts
```

## Aceite mínimo

- APIs privadas sem sessão retornam `401`.
- Escritas com `Origin` inválido retornam `403`.
- Rate limit retorna `429` quando Upstash está configurado.
- Frontend não acessa variáveis server-only.
- `/api/billing/status` não retorna IDs internos da Stripe.
- Webhook Stripe rejeita assinatura inválida.
- Cron rejeita chamada sem `CRON_SECRET` correto.