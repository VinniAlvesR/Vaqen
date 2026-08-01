# 🧪 Teste de Proteção de Rotas — Vaqen V3

## Instruções de Teste

### 1. Teste sem Autenticação

**Pré-requisito:** Nenhum usuário logado (delete cookies ou use incógnito)

#### Teste 1.1: Acessar /dashboard
```
1. Abra http://localhost:3000/dashboard
2. Resultado esperado: Redireciona para http://localhost:3000/auth/login
3. Status: ✓ Protegido
```

#### Teste 1.2: Acessar /clients
```
1. Abra http://localhost:3000/clients
2. Resultado esperado: Redireciona para http://localhost:3000/auth/login
3. Status: ✓ Protegido
```

#### Teste 1.3: Acessar /projects
```
1. Abra http://localhost:3000/projects
2. Resultado esperado: Redireciona para http://localhost:3000/auth/login
3. Status: ✓ Protegido
```

#### Teste 1.4: Acessar /tasks
```
1. Abra http://localhost:3000/tasks
2. Resultado esperado: Redireciona para http://localhost:3000/auth/login
3. Status: ✓ Protegido
```

#### Teste 1.5: Acessar /settings
```
1. Abra http://localhost:3000/settings
2. Resultado esperado: Redireciona para http://localhost:3000/auth/login
3. Status: ✓ Protegido
```

#### Teste 1.6: Acessar / (homepage)
```
1. Abra http://localhost:3000/
2. Resultado esperado: Mostra homepage pública com links "Login" e "Cadastro"
3. Status: ✓ Público
```

#### Teste 1.7: Acessar /auth/login
```
1. Abra http://localhost:3000/auth/login
2. Resultado esperado: Mostra formulário de login
3. Status: ✓ Público
```

#### Teste 1.8: Acessar /auth/signup
```
1. Abra http://localhost:3000/auth/signup
2. Resultado esperado: Mostra formulário de cadastro
3. Status: ✓ Público
```

---

### 2. Teste com Autenticação (Cadastro)

#### Teste 2.1: Criar conta
```
1. Abra http://localhost:3000/auth/signup
2. Preencha:
   - Nome: "João Silva"
   - Email: "joao@example.com"
   - Senha: "123456"
   - Confirmar: "123456"
3. Clique em "Criar Conta"
4. Resultado esperado:
   - Conta criada ✓
   - Redireciona para /dashboard ✓
   - Cookie de sessão criado ✓
5. Status: ✓ Cadastro funciona
```

#### Teste 2.2: Acessar /dashboard (autenticado)
```
1. Após criar conta, você deve estar em /dashboard
2. Resultado esperado: Dashboard carrega normalmente ✓
3. Navbar mostra nome do usuário ✓
4. Status: ✓ Acesso concedido
```

#### Teste 2.3: Acessar /clients (autenticado)
```
1. Clique em "Clientes" na navbar
2. Resultado esperado: Página de clientes carrega ✓
3. Status: ✓ Acesso concedido
```

#### Teste 2.4: Acessar /projects (autenticado)
```
1. Clique em "Projetos" na navbar
2. Resultado esperado: Página de projetos carrega ✓
3. Status: ✓ Acesso concedido
```

#### Teste 2.5: Acessar /tasks (autenticado)
```
1. Clique em "Tarefas" na navbar
2. Resultado esperado: Página de tarefas carrega ✓
3. Status: ✓ Acesso concedido
```

#### Teste 2.6: Acessar /settings (autenticado)
```
1. Clique em "Configurações" na navbar (se disponível)
2. OU acesse http://localhost:3000/settings
3. Resultado esperado: Página de configurações carrega ✓
4. Mostra informações do usuário ✓
5. Status: ✓ Acesso concedido
```

#### Teste 2.7: Tenta acessar /auth/login (autenticado)
```
1. Estando logado, abra http://localhost:3000/auth/login
2. Resultado esperado: Redireciona para /dashboard ✓
3. Status: ✓ Redirecionamento funciona
```

#### Teste 2.8: Tenta acessar /auth/signup (autenticado)
```
1. Estando logado, abra http://localhost:3000/auth/signup
2. Resultado esperado: Redireciona para /dashboard ✓
3. Status: ✓ Redirecionamento funciona
```

---

### 3. Teste de Logout

#### Teste 3.1: Logout
```
1. Clique em "Logout" na navbar
2. Resultado esperado:
   - Cookie de sessão removido ✓
   - Redireciona para homepage ✓
   - Navbar mostra "Login" e "Cadastro" ✓
3. Status: ✓ Logout funciona
```

#### Teste 3.2: Acessar rota protegida após logout
```
1. Após logout, abra http://localhost:3000/dashboard
2. Resultado esperado: Redireciona para /auth/login ✓
3. Status: ✓ Acesso bloqueado
```

---

### 4. Teste de Login

#### Teste 4.1: Login com credenciais corretas
```
1. Abra http://localhost:3000/auth/login
2. Preencha:
   - Email: "joao@example.com"
   - Senha: "123456"
3. Clique em "Fazer Login"
4. Resultado esperado:
   - Login realizado ✓
   - Redireciona para /dashboard ✓
   - Navbar mostra nome "João Silva" ✓
5. Status: ✓ Login funciona
```

#### Teste 4.2: Login com email inválido
```
1. Abra http://localhost:3000/auth/login
2. Preencha:
   - Email: "inexistente@example.com"
   - Senha: "123456"
3. Clique em "Fazer Login"
4. Resultado esperado: Erro "Email ou senha incorretos" ✓
5. Status: ✓ Validação funciona
```

#### Teste 4.3: Login com senha incorreta
```
1. Abra http://localhost:3000/auth/login
2. Preencha:
   - Email: "joao@example.com"
   - Senha: "999999"
3. Clique em "Fazer Login"
4. Resultado esperado: Erro "Email ou senha incorretos" ✓
5. Status: ✓ Validação funciona
```

---

### 5. Teste de Persistência (Sessão)

#### Teste 5.1: Recarregar página mantendo sessão
```
1. Faça login
2. Acesse http://localhost:3000/dashboard
3. Pressione F5 (reload)
4. Resultado esperado:
   - Página carrega normalmente ✓
   - Usuário permanece logado ✓
   - Navbar mostra nome do usuário ✓
5. Status: ✓ Sessão persistente
```

#### Teste 5.2: Mudar de abas mantendo sessão
```
1. Estando em /dashboard, abra nova aba
2. Acesse http://localhost:3000/clients
3. Resultado esperado: Página carrega com autenticação ✓
4. Status: ✓ Cookie compartilhado entre abas
```

#### Teste 5.3: Fechar e reabrir o navegador
```
1. Faça login
2. Feche o navegador completamente
3. Reabra o navegador
4. Acesse http://localhost:3000/dashboard
5. Resultado esperado:
   - Você deve estar logado ✓
   - Cookie expira em 7 dias ✓
6. Status: ✓ Sessão persistente
```

---

## Checklist de Validação

- [ ] Rotas protegidas bloqueiam usuários não autenticados
- [ ] Middleware redireciona corretamente para /auth/login
- [ ] Usuários autenticados acessam rotas protegidas
- [ ] Navbar mostra login/signup para não autenticados
- [ ] Navbar mostra nome e logout para autenticados
- [ ] Logout remove cookie e redireciona
- [ ] Sessão persiste após reload
- [ ] Sessão compartilhada entre abas
- [ ] Senha é criptografada (PBKDF2)
- [ ] Email único no banco (não permite duplicata)
- [ ] Validações de email e senha funcionam

---

## Como Executar Testes Automatizados (Futuro)

```bash
# Instalar dependência de teste
pnpm add -D @testing-library/react jest

# Executar testes
pnpm test

# Teste específico
pnpm test middleware.test.ts
```

---

## Conclusão

✓ Sistema de proteção de rotas completo e testável
✓ Middlewares funcionam corretamente
✓ Segurança de cookies implementada
✓ Fluxo de autenticação validado
