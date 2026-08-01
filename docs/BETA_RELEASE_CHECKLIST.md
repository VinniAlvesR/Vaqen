# Checklist de lançamento do Beta — Vaqen

## Obrigatório antes de convidar usuários

- [ ] Deploy Vercel usando variáveis do Beta.
- [ ] Neon production criado e migrações aplicadas.
- [ ] `pnpm prisma migrate status` sem pendências.
- [ ] Google OAuth exibindo nome `Vaqen`.
- [ ] Callback Google local e produção configurados.
- [ ] Email de verificação chegando corretamente.
- [ ] Gmail SMTP ou Resend configurado.
- [ ] Upstash Redis ativo para rate limit.
- [ ] Cadastro por convite testado.
- [ ] Login email/senha testado.
- [ ] Login Google testado.
- [ ] Recuperação de senha testada.
- [ ] Criar cliente, projeto e tarefa testado.
- [ ] Tela Hoje testada com dados e vazia.
- [ ] Exportação de dados testada.
- [ ] Exclusão de conta testada em conta descartável.
- [ ] Termos e Política publicados.
- [ ] Mobile revisado nos fluxos principais.

## E2E

- [ ] E2E público executado.
- [ ] E2E segurança auth executado.
- [ ] E2E crítico do Beta executado em staging com variáveis próprias.

## Não obrigatório no Beta

- [ ] Stripe live.
- [ ] Sentry completo.
- [ ] Cobrança real.
- [ ] Painel administrativo de feedback.

## Gate de abertura

Abrir Beta somente se:

- [ ] build de produção passa;
- [ ] zero P0 conhecido;
- [ ] zero P1 que bloqueia uso diário;
- [ ] convite, login, criação e feedback funcionam;
- [ ] backup Neon validado;
- [ ] suporte por `vaqen.suporte@gmail.com` operacional.
