# Sprint 6 — Fluxo Rápido

## Objetivo

Reduzir navegação e cliques nas operações mais frequentes.

## Criação global

O botão `+` fica disponível em qualquer página autenticada e abre um modal para criar:

- cliente, com nome, email e empresa;
- projeto, com cliente, prioridade e prazo;
- tarefa, com projeto opcional, prioridade e prazo.

Após salvar, o modal fecha e as listas abertas são atualizadas por um evento local, sem troca de página.

## Ações em listas

Detalhes permanece como ação direta. Editar, concluir/reabrir, arquivar/desarquivar e mover para lixeira ficam agrupados no menu de contexto `⋮`.

## Integração com Hoje

Os cards de tarefa permitem abrir, concluir ou comentar. O comentário é criado em modal e registrado no histórico da tarefa.

## Navegação entre relacionamentos

- Cliente: atalho para projetos.
- Projeto: atalhos para cliente e tarefas.
- Tarefa: atalho para projeto.

## Últimos acessados

As páginas de detalhes registram localmente os oito itens mais recentes. O dashboard exibe esses atalhos sem armazenar dados pessoais adicionais no servidor.

## Critérios de conclusão

- [x] Botão global `+`
- [x] Modais rápidos
- [x] Atualização das listas sem navegação
- [x] Ações diretas e menu de contexto
- [x] Integração com Tela Hoje
- [x] Navegação entre relacionamentos
- [x] Últimos itens acessados
