# Sprint 5 — Tarefas Avançadas

## Objetivo

Transformar tarefas simples em unidades de trabalho gerenciáveis, com decomposição, progresso real e contexto preservado.

## Modelo de dados

### `checklist_items`

- `id`, `taskId`, `text`
- `completed` (`0` ou `1`)
- `position`
- `createdAt`, `updatedAt`

### `subtasks`

- `id`, `taskId`, `title`
- `status`: `Pendente`, `Em andamento` ou `Concluída`
- `completedAt`, `createdAt`, `updatedAt`

### `task_comments`

- `id`, `taskId`, `userId`, `content`
- `createdAt`, `updatedAt`

Todas as operações validam que a tarefa pertence ao usuário autenticado.

## APIs

- `POST|PATCH|DELETE /api/tasks/[id]/checklist`
- `POST|PATCH|DELETE /api/tasks/[id]/subtasks`
- `POST|DELETE /api/tasks/[id]/comments`
- `GET /api/tasks/[id]` retorna informações, checklist, subtarefas, comentários, resumo e atividades.

## Checklist e progresso

A barra de progresso usa `itens concluídos / total de itens`. Quando o último item é marcado, a interface sugere a conclusão da tarefa. A conclusão só ocorre após confirmação explícita.

## Subtarefas

Cada subtarefa possui status independente. A mudança para `Concluída` grava `completedAt`; reabrir limpa essa data.

## Comentários

Comentários registram decisões, observações e bloqueios. O autor e a data são exibidos na tarefa.

## Histórico automático

As ações abaixo geram eventos em `activity_logs`:

- item de checklist adicionado, atualizado ou removido;
- subtarefa adicionada, atualizada ou removida;
- comentário adicionado ou removido;
- tarefa concluída após sugestão do checklist.

## Resumo avançado

A página exibe:

- status, prioridade e prazo;
- projeto e cliente relacionados;
- progresso do checklist;
- subtarefas concluídas/total;
- quantidade de comentários;
- timeline de atividades.

## Critérios de conclusão

- [x] Checklist funcional
- [x] Subtarefas com status próprio
- [x] Comentários funcionais
- [x] Barra de progresso
- [x] Histórico automático
- [x] Resumo avançado da tarefa
