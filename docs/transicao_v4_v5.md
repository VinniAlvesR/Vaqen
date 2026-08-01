# Transição V4 → V5

## Objetivo desta etapa
Preparar o caminho de V4 (produto comercial) para V5 (workflow & execution) mantendo a compatibilidade e evoluindo a plataforma.

## O que V4 entrega
✅ Autenticação e segurança multiusuário
✅ CRUD de clientes, projetos e tarefas
✅ Busca global unificada
✅ Histórico de atividades com filtros e paginação
✅ Dashboard executivo com métricas
✅ Gestão de prazos e prioridades
✅ Filtros avançados

## O que V5 adiciona
📋 Conclusão de tarefas e projetos
🗂️ Arquivamento de clientes
📄 Páginas de detalhes
🗑️ Lixeira (soft delete)
✅ Subtarefas e checklist
💬 Comentários em tarefas
📅 Tela "Hoje"
⚡ Fluxo rápido com atalhos
🔍 Busca avançada e filtros salvos

## Mudanças no banco de dados

### Novas colunas
```sql
ALTER TABLE tasks ADD COLUMN deletedAt TEXT;
ALTER TABLE tasks ADD COLUMN completedAt TEXT;
ALTER TABLE projects ADD COLUMN deletedAt TEXT;
ALTER TABLE projects ADD COLUMN completedAt TEXT;
ALTER TABLE clients ADD COLUMN deletedAt TEXT;
ALTER TABLE clients ADD COLUMN archivedAt TEXT;
```

### Novas tabelas
```sql
CREATE TABLE subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Pendente',
  order INTEGER,
  FOREIGN KEY (taskId) REFERENCES tasks(id)
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (taskId) REFERENCES tasks(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

## Plano de migração

### Fase 1: Preparação
- [ ] Revisar V4 em produção (validação final)
- [ ] Criar branch de desenvolvimento para V5
- [ ] Planejar migrations de banco de dados

### Fase 2: Backend (Sprint 1-3)
- [ ] Adicionar soft delete em API routes
- [ ] Criar endpoints para conclusão
- [ ] Criar endpoints para lixeira
- [ ] Adicionar filtros de deletedAt

### Fase 3: Frontend (Sprint 2-6)
- [ ] Criar páginas de detalhes
- [ ] Implementar tela "Hoje"
- [ ] Criar UI de lixeira
- [ ] Adicionar subtarefas e comentários

### Fase 4: Otimização (Sprint 7+)
- [ ] Busca avançada
- [ ] Filtros salvos
- [ ] Performance de queries

## Critérios de sucesso V5
- Usuários podem concluir tarefas/projetos sem deletá-los
- Histórico completo de conclusão e exclusão
- Recuperação de itens deletados
- Tela "Hoje" mostra tarefas prioritárias
- Subtarefas melhoram organização de tarefas complexas

## Proximos passos após V5
- V6: Dashboard Executivo com métricas avançadas
- V7: Produto comercial com PostgreSQL e deploy

## Definição de sucesso V5
"Menos exclusões. Menos atrito. Mais execução. Mais foco no que realmente importa."
