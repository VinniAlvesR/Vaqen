# Runbook de incidentes

## Triagem

1. Verifique `/api/health`, Sentry, Vercel e o painel Neon.
2. Classifique: P0 (indisponibilidade, perda ou vazamento), P1 (fluxo crítico) ou P2 (degradação).
3. Em P0/P1, interrompa promoções e preserve logs sem dados sensíveis.

## Banco

- Antes de uma migração, confirme o backup ou branch de restauração no Neon.
- Para rollback de aplicação, promova o deployment Vercel anterior.
- Não reverta migração destrutiva automaticamente. Restaure em uma branch Neon, valide e só então faça o apontamento.

## Autenticação

- Confirme Better Auth, Redis e Resend.
- Em suspeita de segredo exposto, rotacione `BETTER_AUTH_SECRET`, Google OAuth e chaves Resend/Upstash. A rotação do segredo invalida sessões.

## Stripe

- Stripe é a fonte de verdade. Reenvie o evento pelo painel ou CLI.
- `StripeEvent.id` torna o replay idempotente.
- Não ajuste assinatura manualmente sem reconciliar com o objeto Stripe.

Registre horário, impacto, causa, mitigação, responsável e ação preventiva. Incidentes LGPD devem ser encaminhados imediatamente ao responsável jurídico.
