# Vaqen — Documentação Oficial (V5)

## Status do Projeto
Versão Atual: V5
Status: Em desenvolvimento ativo

## Nome Oficial
Vaqen V5 — Workflow & Execution

## Objetivo
Ajudar o usuário a organizar melhor suas demandas, reduzir perda de informações, evitar exclusões desnecessárias e saber exatamente o que fazer primeiro.

## Definição da V5
Menos exclusões.
Menos atrito.
Mais execução.
Mais foco no que realmente importa.

---

## Funcionalidades Principais

### ✅ Sprint 1 — Conclusão e Arquivamento (CONCLUÍDA)
- [x] Concluir tarefas com `completedAt`
- [x] Concluir projetos com `completedAt`
- [x] Arquivar clientes com `archivedAt`
- [x] APIs PATCH para conclusão e arquivamento
- [x] Filtros para excluir itens deletados/arquivados
- [x] Registros de atividade para conclusões
- Documentação: [Sprint 1 — Conclusão e Arquivamento](./sprint1_conclusao_arquivamento.md)

### ✅ Sprint 2 — Páginas de detalhes (CONCLUÍDA)
- [x] Página de detalhe de cliente
- [x] Página de detalhe de projeto
- [x] Página de detalhe de tarefa
- [x] APIs REST para detalhes (GET /api/clients/[id], etc.)
- [x] Client Components com fetch()
- [x] Relacionamentos e estatísticas
- Documentação: [Sprint 2 — Páginas de Detalhes](./sprint2_paginas_detalhes.md)

### ✅ Sprint 3 — Histórico e Lixeira (CONCLUÍDA)
- [x] Histórico com filtros, busca e exclusão individual
- [x] Lixeira (Soft Delete) para clientes, projetos e tarefas
- [x] Restauração e exclusão permanente de itens

### ✅ Sprint 4 — Tela Hoje (CONCLUÍDA)
- [x] Central de foco em `/today`
- [x] Resumo de atrasadas, urgentes, vencendo hoje e projetos próximos
- [x] Conclusão rápida de tarefas
- [x] Prazo final de projetos com janela de 7 dias
- [x] Progresso semanal por `completedAt`
- [x] Ações rápidas e estados vazios
- Documentação: [Sprint 4 — Tela Hoje](./sprint4_tela_hoje.md)

### ✅ Sprint 5 — Tarefas avançadas (CONCLUÍDA)
- [x] Checklist com sugestão de conclusão
- [x] Subtarefas com status próprio
- [x] Comentários em tarefas
- [x] Barra de progresso por checklist
- [x] Timeline automática de atividades
- [x] Resumo avançado da tarefa
- Documentação: [Sprint 5 — Tarefas Avançadas](./sprint5_tarefas_avancadas.md)

### ✅ Sprint 6 — Fluxo rápido (CONCLUÍDA)
- [x] Botão global e modal para cliente, projeto e tarefa
- [x] Menus de contexto nas listas
- [x] Conclusão e comentário direto na Tela Hoje
- [x] Atalhos entre registros relacionados
- [x] Últimos itens acessados no dashboard
- [x] Atualização de listas sem trocar de página
- Documentação: [Sprint 6 — Fluxo Rápido](./sprint6_fluxo_rapido.md)

### Sprint 7 — Busca e filtros avançados
- Busca avançada com operadores
- Filtros salvos
- Filtros por labels/tags
- Filtros por assignee (futuro)

---

## Arquitetura esperada

```
V5 Features → API Routes atualizadas → Database com soft delete
└─ Páginas de detalhe
└─ Tela /today
└─ Lixeira
└─ Comentários
└─ Subtarefas
```

---

## Transição de V4 → V5

### O que muda
- Adição de coluna `deletedAt` para soft delete
- Adição de coluna `archivedAt` para arquivo de clientes
- Adição de coluna `completedAt` para conclusão de tarefas/projetos
- Nova tabela `subtasks` para subtarefas
- Nova tabela `comments` para comentários
- Nova tabela `task_details` para informações estendidas

### O que permanece
- Autenticação e segurança
- Busca global
- Histórico de atividades
- Dashboard executivo
- Filtros de prioridade, status e due date

---

## Próximas etapas
1. Completar validação de V4
2. Planejar migrations de banco de dados
3. Iniciar implementação de Sprint 1 (Conclusão e Arquivamento)
4. Atualizar README e roadmap com V5
