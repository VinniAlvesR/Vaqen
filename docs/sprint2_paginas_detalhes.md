# Sprint 2 — Páginas de Detalhes

## Complemento — páginas orientadas a contexto

### Cliente
- Informações completas e status ativo/arquivado.
- Resumo de projetos ativos, projetos concluídos e tarefas abertas.
- Projetos relacionados com status, prazo e prioridade.
- Atividades recentes do cliente, seus projetos e suas tarefas.
- Ações rápidas para editar e arquivar.

### Projeto
- Informações, prioridade, prazo e cliente relacionado.
- Progresso calculado por tarefas concluídas dividido pelo total.
- Resumo de tarefas totais, concluídas e abertas.
- Lista de tarefas com status, prioridade e prazo.
- Histórico de alterações do projeto, incluindo status e prazo.
- Ações rápidas para editar, concluir e arquivar.

### Tarefa
- Informações completas e link para o projeto relacionado.
- Checklist, subtarefas, comentários e histórico automático.
- Ações rápidas para editar, concluir e adicionar comentário.

## Data de implementação
18 de junho de 2026

## Objetivo
Criar páginas de detalhes ricas para cliente, projeto e tarefa, permitindo visualizar todas as informações relacionadas em um só lugar.

## O que foi feito

### 1. APIs REST criadas

#### `GET /api/clients/{id}`
- Retorna cliente com detalhes completos
- Inclui lista de projetos relacionados
- Inclui lista de tarefas relacionadas
- Filtra por usuário (multiuser safe)
- Exclui itens deletados por padrão

#### `GET /api/projects/{id}`
- Retorna projeto com detalhes completos
- Inclui nome do cliente (JOIN)
- Inclui lista de tarefas do projeto
- Calcula estatísticas: total de tarefas e concluídas
- Filtra por usuário (multiuser safe)
- Exclui itens deletados por padrão

#### `GET /api/tasks/{id}`
- Retorna tarefa com detalhes completos
- Inclui nome do cliente (JOIN)
- Inclui nome do projeto (JOIN)
- Inclui histórico de atividades (últimas 20)
- Filtra por usuário (multiuser safe)
- Exclui itens deletados por padrão

### 2. Páginas de detalhes criadas (Client Components)

#### `/app/clients/[id]/page.tsx`
- Usa nova API `GET /api/clients/{id}`
- Exibe informações do cliente (email, telefone, empresa, endereço)
- Mostra estatísticas (quantidade de projetos e tarefas)
- Barra de progresso visual para status
- Lista de projetos relacionados (com status)
- Lista de tarefas relacionadas (com prioridade/status)
- Links para navegar entre detalhes

#### `/app/projects/[id]/page.tsx`
- Usa nova API `GET /api/projects/{id}`
- Exibe informações do projeto (nome, cliente, status, datas)
- Mostra estatísticas de tarefas (total, concluídas, porcentagem)
- Barra de progresso visual (verde) mostrando % de conclusão
- Lista de tarefas com prioridade e status
- Destacar tarefas concluídas com checkmark
- Links para navegar entre tarefas

#### `/app/tasks/[id]/page.tsx`
- Usa nova API `GET /api/tasks/{id}`
- Exibe informações da tarefa (título, descrição, status, prioridade)
- Destaca se tarefa está atrasada (overdue badge)
- Mostra dias restantes até vencimento
- Exibe badges de status: Concluída, Atrasada, Prioridade
- Histórico de atividades com filtro de últimas 20
- Links para cliente e projeto relacionados

### 3. Design e UX

- **Gradiente fundo**: Azul claro com degradê para indigo para visual moderno
- **Cards brancos**: Sombra e borda para hierarquia visual
- **Badges coloridas**: Verde para sucesso, vermelho para urgência, amarelo para atenção
- **Loading states**: Spinner enquanto carrega
- **Error handling**: Mensagens de erro claras
- **Responsividade**: Grid layout que adapta para mobile
- **Links internos**: Navegação entre cliente → projeto → tarefa

### 4. Comportamentos especiais

#### Tarefa
- Se `dueDate` <= hoje e não está `completedAt`, mostra badge "⚠️ Atrasada"
- Se completedAt existe, mostra "✓ Concluída" em verde
- Calcula dias restantes dinamicamente
- Mostra histórico de atividades com timestamps

#### Projeto
- Calcula % de conclusão baseado em `completedAt` das tarefas
- Barra de progresso visual que cresce com execução
- Status é derivado do banco (Em andamento / Concluído / Planejamento)
- Se `completedAt` existe, mostra "✓ Concluído" em verde

#### Cliente
- Se `archivedAt` existe, mostra "🗂️ Arquivado" em amarelo
- Mostra todos os projetos não-deletados
- Mostra todas as tarefas não-deletadas (mesmo sem projeto)
- Estatísticas de projetos e tarefas

## Testes recomendados

1. **Cliente com muitos projetos**
   ```bash
   # Criar cliente com 10+ projetos
   # Acessar /clients/1 e verificar paginação/scroll
   ```

2. **Projeto com tarefas mistas**
   ```bash
   # Criar projeto com tarefas concluídas e pendentes
   # Verificar % de conclusão e barra de progresso
   ```

3. **Tarefa atrasada**
   ```bash
   # Criar tarefa com dueDate no passado
   # Verificar badge "⚠️ Atrasada" e cálculo de dias
   ```

4. **Multiuser isolation**
   ```bash
   # Login como user A
   # Tentar acessar /tasks/[outro_user_task_id]
   # Deve retornar erro 404
   ```

## APIs de teste

### Buscar cliente
```bash
curl http://localhost:3000/api/clients/1 \
  -H "Cookie: session=alice@test.local:token123"
```

### Buscar projeto
```bash
curl http://localhost:3000/api/projects/1 \
  -H "Cookie: session=alice@test.local:token123"
```

### Buscar tarefa
```bash
curl http://localhost:3000/api/tasks/1 \
  -H "Cookie: session=alice@test.local:token123"
```

## Status
✅ Implementação concluída
✅ Testes de compilação passando
✅ Client Components usando fetch()
✅ Pronto para integração com CRUD buttons

## Próximas etapas (Sprint 3)
- Adicionar botões de conclusão/arquivamento nos detalhes
- Implementar soft delete com lixeira
- Adicionar edição inline nos detalhes
- Criar página "Histórico e Lixeira" com restauração

## Validação
- `pnpm exec tsc --noEmit` passou sem erros
- Todas as rotas compilaram com sucesso
- Client Components com `"use client"` implementados
- APIs RESTful com authentication verificada
