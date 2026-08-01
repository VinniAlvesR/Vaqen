# Sprint 4 — Tela Hoje (Central de Foco)

## Objetivo

Responder, em uma única página, à pergunta: **“O que eu preciso resolver agora?”**

## Rotas

- Página: `GET /today`
- Dados agregados: `GET /api/today`
- Conclusão rápida: `PATCH /api/tasks/[id]/complete`

Todas as consultas são limitadas ao usuário autenticado e ignoram registros excluídos ou concluídos.

## Fontes de dados e regras

### Tarefas atrasadas

- Fonte: `tasks`, relacionada a `projects` e `clients`.
- Regra: `dueDate < hoje`, `completedAt IS NULL` e status diferente de `Concluída`.
- Exibe tarefa, projeto, cliente, prioridade e dias de atraso.
- Ações: abrir detalhes ou concluir.

### Tarefas urgentes

- Regra: prioridade `Urgente` e tarefa ainda aberta.
- Uma tarefa urgente também pode aparecer entre atrasadas ou vencendo hoje; cada seção responde a um critério diferente.

### Vencendo hoje

- Regra: `dueDate = hoje` e tarefa ainda aberta.

### Projetos próximos do prazo

- Novo campo: `projects.dueDate`.
- Regra: prazo entre hoje e os próximos 7 dias, projeto não concluído e não excluído.
- Exibe projeto, cliente e dias restantes.

### Progresso semanal

- Semana considerada: segunda-feira até hoje.
- Tarefas concluídas: contagem por `tasks.completedAt`.
- Projetos que avançaram: projetos distintos com ao menos uma tarefa concluída na semana.

## Ações rápidas

- `+ Nova tarefa` abre `/tasks?new=1`.
- `+ Novo projeto` abre `/projects?new=1`.
- `+ Novo cliente` abre `/clients?new=1`.

## Estados vazios

Cada seção possui estado vazio próprio. Quando não há nenhuma demanda de atenção, a página mostra “Tudo organizado”.

## Critério de conclusão

- Resumo diário carregado para o usuário autenticado.
- Listas de atrasadas, urgentes e vencendo hoje.
- Projetos com prazo nos próximos 7 dias.
- Conclusão rápida com atualização das métricas.
- Progresso semanal calculado por datas reais de conclusão.
- Atalhos de criação e navegação `Hoje` no menu.
