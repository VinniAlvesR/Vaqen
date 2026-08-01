# Sprint 1 — Conclusão e Arquivamento

## Data de implementação
18 de junho de 2026

## Objetivo
Permitir que usuários concluam tarefas e projetos, arquivem clientes e projetos e preservem dados por soft delete.

### Complemento — ciclo de vida completo
- Projetos também podem ser arquivados por `archivedAt`.
- Listagens oferecem filtros de ativos, concluídos e arquivados.
- A exclusão comum usa `deletedAt` e envia o registro para a lixeira.
- Concluir, reabrir, arquivar e desarquivar geram eventos em `activity_logs`.

## O que foi feito

### 1. Banco de dados (lib/db.ts)
- Adicionada coluna `completedAt` em `tasks`
- Adicionada coluna `deletedAt` em `tasks`
- Adicionada coluna `completedAt` em `projects`
- Adicionada coluna `deletedAt` em `projects`
- Adicionada coluna `archivedAt` em `clients`
- Adicionada coluna `deletedAt` em `clients`

### 2. API Routes criadas

#### `app/api/tasks/[id]/complete/route.ts`
- PATCH `/api/tasks/:id/complete`
- Marca tarefa como concluída (`completedAt` + status = "Concluída")
- Permite reabrir tarefa (limpar `completedAt`)
- Registra atividade com log

#### `app/api/projects/[id]/complete/route.ts`
- PATCH `/api/projects/:id/complete`
- Marca projeto como concluído (`completedAt` + status = "Concluído")
- Permite reabrir projeto (limpar `completedAt`)
- Registra atividade com log

#### `app/api/clients/[id]/archive/route.ts`
- PATCH `/api/clients/:id/archive`
- Arquiva cliente (`archivedAt`)
- Permite desarquivar cliente (limpar `archivedAt`)
- Registra atividade com log

### 3. Melhorias em APIs existentes

#### GET `/api/tasks`
- Adicionado filtro `deletedAt IS NULL` por padrão
- Parâmetro `showDeleted=true` para mostrar itens deletados

#### GET `/api/projects`
- Adicionado filtro `deletedAt IS NULL` por padrão
- Parâmetro `showDeleted=true` para mostrar itens deletados

#### GET `/api/clients`
- Adicionado filtro `deletedAt IS NULL` por padrão
- Adicionado filtro `archivedAt IS NULL` por padrão (não mostra arquivados)
- Parâmetro `showArchived=true` para mostrar clientes arquivados
- Parâmetro `showDeleted=true` para mostrar itens deletados

### 4. Novos tipos de atividade
- `completed` — tarefa/projeto concluído
- `reopened` — tarefa/projeto reabierto
- `archived` — cliente arquivado
- `unarchived` — cliente desarquivado

## APIs de teste

### Concluir tarefa
```bash
curl -X PATCH http://localhost:3000/api/tasks/1/complete \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### Reabrir tarefa
```bash
curl -X PATCH http://localhost:3000/api/tasks/1/complete \
  -H "Content-Type: application/json" \
  -d '{"completed": false}'
```

### Arquivar cliente
```bash
curl -X PATCH http://localhost:3000/api/clients/1/archive \
  -H "Content-Type: application/json" \
  -d '{"archived": true}'
```

## Próximas etapas (Sprint 2)
- Criar páginas de detalhes para cliente, projeto e tarefa
- Adicionar botões de conclusão/arquivamento na UI
- Mostrar status de conclusão nas listas
- Implementar UI de lixeira com restauração

## Status
✅ Implementação concluída
✅ Testes de compilação passando
✅ Pronto para integração na UI

## Validação
- `pnpm exec tsc --noEmit` passou sem erros
- Todas as rotas compilaram com sucesso
- Tipos corrigidos para Next.js 16 (params como Promise)
