# 🚀 Vaqen — Documentação Oficial (V3)

## Status Atual

```text
Versão Atual: V3
Estado: Em desenvolvimento ativo
```

---

# 1. Visão do Produto

Vaqen é uma plataforma web para gerenciamento de clientes, projetos e tarefas desenvolvida para freelancers, desenvolvedores, designers e pequenas equipes.

Seu objetivo é centralizar o fluxo de trabalho em um ambiente simples, rápido e organizado.

Princípios:

* Simplicidade
* Velocidade
* Organização
* Produtividade

---

# 2. Estado Atual do Projeto

## V1 — Concluída

Implementações:

* CRUD de Clientes
* CRUD de Projetos
* CRUD de Tarefas
* Dashboard inicial
* API Routes
* Banco SQLite
* Persistência de dados

---

## V2 — Concluída

Implementações:

* Melhorias de UX
* Feedback visual
* Dashboard aprimorado
* Estrutura de componentes
* Organização da arquitetura
* Tipagem centralizada
* Integração completa com banco real

---

## V3 — Em Desenvolvimento

Foco:

```text
Identidade
Segurança
Métricas
```

---

# 3. Arquitetura Tecnológica

Frontend:

* Next.js App Router
* React
* TypeScript
* Tailwind CSS

Backend:

* API Routes do Next.js

Banco de Dados:

* SQLite

Persistência:

```text
database.sqlite
```

---

# 4. Estrutura do Sistema

```text
Dashboard
├ Clientes
├ Projetos
├ Tarefas
├ Configurações
├ Login
└ Cadastro
```

---

# 5. Módulos do Sistema

## Clientes

Funcionalidades:

* Criar
* Editar
* Excluir
* Listar

---

## Projetos

Funcionalidades:

* Criar
* Editar
* Excluir
* Listar

Status:

* Planejamento
* Em andamento
* Finalizado

---

## Tarefas

Funcionalidades:

* Criar
* Editar
* Excluir
* Listar

Status:

* Pendente
* Em andamento
* Concluída

---

# 6. Estrutura de Dados

## Cliente

```text
id
name
email
company
phone
createdAt
```

---

## Projeto

```text
id
name
clientId
status
startDate
description
```

---

## Tarefa

```text
id
title
projectId
status
dueDate
description
priority
week
```

---

# 7. Roadmap Oficial da V3

## Parte 1 — Autenticação

Objetivo:

Permitir que cada usuário possua uma conta própria.

### Funcionalidades

* Cadastro
* Login
* Logout
* Recuperação de senha
* Sessão persistente

### Estrutura

Tabela:

```text
users
```

Campos:

```text
id
name
email
password
createdAt
```

### Definição de pronto

```text
✔ Cadastro funcionando
✔ Login funcionando
✔ Logout funcionando
✔ Sessão persistente
```

---

## Parte 2 — Proteção de Rotas

Objetivo:

Garantir acesso apenas para usuários autenticados.

### Rotas protegidas

```text
/dashboard
/clients
/projects
/tasks
/settings
```

### Definição de pronto

```text
✔ Middleware funcionando
✔ Redirecionamento para login
✔ Controle de sessão
✔ Logout remove acesso
```

---

## Parte 3 — Dashboard Executivo

Objetivo:

Transformar dados em informações estratégicas.

### Indicadores

Clientes:

* Total de clientes

Projetos:

* Projetos ativos
* Projetos concluídos

Tarefas:

* Pendentes
* Concluídas
* Atrasadas

Produtividade:

* Taxa de conclusão
* Produtividade semanal

### Fórmula

```text
Tarefas concluídas ÷ Total de tarefas × 100
```

### Definição de pronto

```text
✔ Métricas reais
✔ Cards dinâmicos
✔ Dashboard executivo
✔ Dados por usuário
```

---

# 8. Objetivo Técnico da V3

Consolidar conhecimentos em:

* Autenticação
* Sessões
* Middleware
* Segurança de aplicações
* Relacionamento entre usuários e dados
* Métricas e dashboards

---

# 9. Visão de Futuro (V4+)

Planejado para versões futuras:

* PostgreSQL
* Deploy em produção
* Controle financeiro
* Sistema de pagamentos
* Notificações
* Multiusuário avançado
* SaaS por assinatura
* Relatórios avançados

---

# 10. Marco do Projeto

```text
V1 → Sistema funcional
V2 → Sistema profissional
V3 → Plataforma multiusuário
V4 → Produto comercial
```

---

# 11. Estrutura do Projeto (Diretórios)

```text
/app
  /api
    /clients
    /projects
    /tasks
    /auth (novo na V3)
  /clients
  /projects
  /tasks
  /dashboard
  /auth (novo na V3)
  layout.tsx
  page.tsx

/components
  ClientCard.tsx
  Navbar.tsx
  LoadingState.tsx
  EmptyState.tsx

/hooks
  useClients.ts
  useProjects.ts
  useTasks.ts

/services
  api.ts

/types
  client.ts
  project.ts
  task.ts
  user.ts (novo na V3)

/lib
  db.ts

/docs
  documentacao_v1.md
  documentacao_v2.md
  documentacao_v3.md (este arquivo)
```

---

# 12. Cronograma da V3

Estimativa:

* Autenticação: 1-2 sprints
* Proteção de Rotas: 1 sprint
* Dashboard Executivo: 1-2 sprints

Total: 3-5 sprints

---

# 13. Checklist de Desenvolvimento V3

### Autenticação

- [ ] Criar tabela users
- [ ] Implementar rota de cadastro
- [ ] Implementar rota de login
- [ ] Implementar rota de logout
- [ ] Implementar sessão persistente
- [ ] Hash de senha com bcrypt

### Proteção de Rotas

- [ ] Criar middleware de autenticação
- [ ] Proteger dashboard
- [ ] Proteger clientes
- [ ] Proteger projetos
- [ ] Proteger tarefas

### Dashboard Executivo

- [ ] Calcular métricas de clientes
- [ ] Calcular métricas de projetos
- [ ] Calcular métricas de tarefas
- [ ] Criar cards de métricas
- [ ] Exibir dados personalizados por usuário

---

# 14. Conclusão

Vaqen V3 marca a transição de um sistema pessoal para uma plataforma multiusuário completa.

Com autenticação, proteção de rotas e dashboards executivos, a plataforma estará pronta para escalar e receber múltiplos usuários de forma segura.

A V3 estabelece a base técnica e de segurança necessária para a comercialização do produto na V4.
