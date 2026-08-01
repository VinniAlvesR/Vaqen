# 🚀 Vaqen — Documentação Oficial

> **Versão atual: Beta**

Vaqen é uma plataforma web de gestão para freelancers, desenvolvedores, designers, pequenas agências e empreendedores que precisam organizar clientes, projetos e tarefas em um único lugar.

Mais do que armazenar informações, o Vaqen ajuda o usuário a identificar prioridades, acompanhar o trabalho e decidir o próximo passo.

## 1. Visão do Produto

### Missão

Simplificar a gestão do trabalho diário, aumentando a organização e a produtividade.

### Visão

Tornar-se uma plataforma de gestão moderna e acessível para profissionais autônomos e pequenas empresas.

### Valores

- Simplicidade
- Produtividade
- Organização
- Velocidade
- Evolução contínua
- Foco na experiência do usuário

## 2. Problema que o Vaqen Resolve

Freelancers e pequenas empresas costumam enfrentar:

- perda de controle sobre clientes;
- tarefas espalhadas em diferentes aplicativos;
- dificuldade para acompanhar projetos;
- falta de prioridade nas atividades;
- perda de prazos;
- excesso de informações sem organização.

O Vaqen reúne essas informações em uma plataforma centralizada, organizada e fácil de utilizar.

## 3. Público-Alvo

- Freelancers
- Desenvolvedores
- Designers e Web Designers
- Pequenas agências
- Social Media
- Gestores de tráfego
- Empreendedores digitais
- Pequenas empresas prestadoras de serviço

## 4. Objetivos

O Vaqen permite:

- organizar clientes, projetos e tarefas;
- acompanhar o progresso do trabalho;
- manter o histórico das atividades;
- visualizar prioridades e prazos;
- reduzir o tempo gasto com organização;
- aumentar a produtividade.

## 5. Filosofia do Produto

> **Toda funcionalidade precisa resolver uma dor real do usuário.**

Cada melhoria deve tornar o sistema mais simples, útil e eficiente. Funcionalidades não são adicionadas apenas por serem interessantes.

## 6. Funcionalidades Principais

### Clientes

- Cadastro e edição
- Arquivamento e reativação
- Soft delete, restauração e exclusão definitiva
- Página de detalhes com projetos, tarefas, métricas e atividades

### Projetos

- Criação e acompanhamento
- Prioridades, prazo e progresso
- Conclusão, reabertura e arquivamento
- Página de detalhes com tarefas e histórico

### Tarefas

- Prioridades, status e prazos
- Conclusão e reabertura
- Checklist e barra de progresso
- Subtarefas
- Comentários
- Histórico automático

### Tela Hoje

Central diária de produtividade com:

- tarefas atrasadas;
- tarefas urgentes;
- tarefas vencendo hoje;
- projetos próximos do prazo;
- progresso semanal;
- conclusão e comentários rápidos.

### Fluxo Rápido

- Botão global de criação
- Modal para cliente, projeto ou tarefa
- Menus de contexto nas listas
- Atalhos entre registros relacionados
- Últimos itens acessados

### Histórico e Lixeira

- Registro das principais ações
- Filtros e pesquisa
- Exclusão individual de atividades
- Restauração ou exclusão definitiva de registros

### Busca Global

Pesquisa por clientes, projetos e tarefas.

### Configurações

Área destinada a:

- perfil;
- preferências;
- segurança;
- exportação de dados;
- exclusão da conta.

## 7. Arquitetura Tecnológica

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS

### Backend

- Next.js API Routes
- Neon Postgres
- Prisma ORM e Prisma Migrate
- Better Auth
- Upstash Redis para rate limiting
- Gmail SMTP ou Resend para emails transacionais
- Stripe Billing planejado para a versão oficial

### Arquitetura

```text
Better Auth → Rotas e APIs protegidas → Prisma → Neon Postgres
```

## 8. Segurança

O Vaqen possui:

- cadastro, login e logout;
- sessão autenticada;
- proteção de páginas e APIs;
- isolamento de dados por usuário;
- soft delete para preservar histórico;
- validação de propriedade dos registros.

## 9. Roadmap

### Desenvolvimento concluído

- V1 — MVP
- V2 — UX e organização
- V3 — Identidade e segurança
- V4 — Produtividade
- V5 — Workflow

### Beta

- [x] Base Postgres e migrações versionadas
- [x] Better Auth com email/senha e Google
- [x] Planos e limites do Beta sem cobrança ativa
- [x] Exportação e exclusão de conta
- [x] CI e testes-base
- [ ] Provisionamento dos serviços externos do Beta
- [ ] Validação E2E em staging e Beta fechado

### Versão 1.0

Primeiro lançamento oficial e estável do Vaqen.

## 10. Monetização

O produto seguirá um modelo SaaS por assinatura:

- Plano Gratuito: 5 clientes, 10 projetos e 50 tarefas
- Plano Pro: R$ 39/mês
- Trial Pro de 30 dias para novos usuários
- Cobrança recorrente após o período de teste

## 11. Privacidade e LGPD

Recursos previstos:

- consentimento no cadastro;
- Política de Privacidade;
- Termos de Uso;
- exportação de dados;
- exclusão da conta;
- exclusão definitiva mediante solicitação.

## 12. Execução Local

### Requisitos

- Node.js
- pnpm

### Instalação

```bash
pnpm install
copy .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### Desenvolvimento

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Validação

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

As credenciais Neon, Better Auth e dos serviços externos devem ser preenchidas no `.env`. O seed só cria convite quando `BETA_SEED_INVITE` estiver definido.


## 13. Documentação Técnica

- [Documentação V5](./docs/documentacao_v5.md)
- [Sprint 1 — Ciclo de Vida](./docs/sprint1_conclusao_arquivamento.md)
- [Sprint 2 — Páginas de Detalhes](./docs/sprint2_paginas_detalhes.md)
- [Sprint 4 — Tela Hoje](./docs/sprint4_tela_hoje.md)
- [Sprint 5 — Tarefas Avançadas](./docs/sprint5_tarefas_avancadas.md)
- [Sprint 6 — Fluxo Rápido](./docs/sprint6_fluxo_rapido.md)
- [Proteção de Rotas](./docs/protecao_rotas.md)
- [Deploy do Beta](./docs/DEPLOYMENT.md)
- [Runbook](./docs/RUNBOOK.md)
- [Checklist de lançamento](./docs/BETA_RELEASE_CHECKLIST.md)

## 14. Objetivo Final

O Vaqen não pretende ser apenas mais um sistema de gestão. Seu objetivo é tornar o trabalho mais organizado, produtivo e simples, permitindo que profissionais gastem menos tempo administrando tarefas e mais tempo entregando resultados.
