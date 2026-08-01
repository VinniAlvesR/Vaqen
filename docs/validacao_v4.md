# Validação e Refinamento V4

Este documento reúne as tarefas de qualidade para a versão V4 do Vaqen.

## 1. Objetivo
Garantir que a V4 esteja documentada, validada e pronta para uso real antes de avançar para a próxima fase.

## 2. Revisão de documentação e roadmap
- Atualizar o roadmap com o status atual das funcionalidades.
- Confirmar o escopo das features implementadas:
  - autenticação e segurança
  - filtros e busca global
  - histórico de atividades
  - dashboard executivo
- Alinhar o README, a documentação V4 e qualquer material de apresentação.

## 3. Testes de fluxo multiusuário
- Criar ao menos duas contas diferentes para testes.
- Validar que cada usuário:
  - somente vê seus clientes, projetos e tarefas
  - acessa apenas seu dashboard e histórico
  - não consegue ler ou alterar dados de outro usuário
- Testar funcionalidades principais:
  - login e logout
  - criação/edição/exclusão de clientes, projetos e tarefas
  - filtros por prioridade, status e due date
  - busca global e busca de atividades

## 4. Ajustes de usabilidade e visual
- Verificar formulários e campos obrigatórios.
- Ajustar mensagens de erro e sucesso.
- Melhorar o layout de tabelas e cards.
- Garantir navegação clara entre dashboard, clientes, projetos, tarefas e histórico.
- Revisar responsividade e acessibilidade básica.

## 4.1 Seed de testes multiusuário
- Use `pnpm run seed:test` para criar dados de exemplo.
- O script cria dois usuários de teste:
  - `alice@test.local / password123`
  - `bob@test.local / password123`
- Valide que cada conta enxerga apenas seus próprios clientes, projetos, tarefas e histórico.

## 5. Critérios de aceitação
- Documentação atualizada e fácil de entender.
- Fluxo multiusuário validado sem vazamento de dados.
- UI consistente e usável em telas comuns.
- Histórico de atividades filtrável e paginável.

## 6. Próximos passos
- Implementar observações encontradas nos testes.
- Planejar passagem para V5 com base nos resultados da validação.
