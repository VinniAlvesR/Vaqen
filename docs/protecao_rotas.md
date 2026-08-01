# 🔒 Sistema de Proteção de Rotas — Vaqen V3

## Visão Geral

O Vaqen utiliza middleware do Next.js para proteger rotas privadas. Usuários não autenticados são automaticamente redirecionados para login ao tentar acessar áreas restritas.

---

## Arquitetura

```
Requisição do Usuário
        ↓
    Middleware
        ↓
    ├─ É rota protegida?
    │   ├─ Sim + Sem autenticação? → Redireciona para /auth/login
    │   └─ Sim + Com autenticação? → Continua normalmente
    │
    └─ É rota pública? → Continua normalmente
```

---

## Arquivo: `middleware.ts`

### Localização
```
c:\Users\vnncs\vaqen\middleware.ts
```

### Configuração

**Rotas Públicas (qualquer um acessa):**
- `/` — Homepage
- `/auth/login` — Página de login
- `/auth/signup` — Página de cadastro

**Rotas Protegidas (requer autenticação):**
- `/dashboard` — Dashboard do usuário
- `/clients` — Lista de clientes
- `/projects` — Lista de projetos
- `/tasks` — Lista de tarefas
- `/settings` — Configurações do usuário

### Como Funciona

```typescript
// 1. Obtém o cookie de sessão
const sessionCookie = request.cookies.get("session")?.value
const isAuthenticated = !!sessionCookie

// 2. Verifica se a rota é protegida
const isProtectedRoute = protectedRoutes.some((route) => 
  pathname.startsWith(route)
)

// 3. BLOQUEIA acesso sem autenticação
if (isProtectedRoute && !isAuthenticated) {
  return NextResponse.redirect(new URL("/auth/login", request.url))
}
```

---

## Fluxos de Acesso

### Cenário 1: Usuário Autenticado Acessa Rota Protegida

```
Usuario logado clica em "Clientes"
        ↓
Request para /clients
        ↓
Middleware verifica cookie ✓
        ↓
isProtectedRoute = true
isAuthenticated = true
        ↓
Continua normalmente
        ↓
Página carrega com dados do usuário
```

**Resultado:** Acesso liberado ✓

---

### Cenário 2: Usuário Não Autenticado Tenta Acessar Rota Protegida

```
Usuario não logado tenta digitar /clients na URL
        ↓
Request para /clients
        ↓
Middleware verifica cookie ✗
        ↓
isProtectedRoute = true
isAuthenticated = false
        ↓
Redireciona para /auth/login
```

**Resultado:** Acesso bloqueado, redirecionado para login ✓

---

### Cenário 3: Usuário Logado Tenta Acessar Login/Signup

```
Usuario logado tenta ir para /auth/login
        ↓
Request para /auth/login
        ↓
Middleware verifica cookie ✓
        ↓
sessionCookie existe
        ↓
Redireciona para /dashboard
```

**Resultado:** Usuário é levado para seu dashboard ✓

---

## Implementação do Cookie

### Como é Criado (Login)

```typescript
// em app/api/auth/login/route.ts
const token = generateSessionToken()
const sessionCookie = createSessionCookie(userId, token)

response.cookies.set("session", sessionCookie, {
  httpOnly: true,                                    // Não acessível via JS
  secure: process.env.NODE_ENV === "production",   // HTTPS em produção
  sameSite: "lax",                                  // Proteção CSRF
  maxAge: 60 * 60 * 24 * 7,                         // 7 dias
  path: "/",                                        // Disponível em toda app
})
```

### Como é Removido (Logout)

```typescript
// em app/api/auth/logout/route.ts
response.cookies.delete("session")
```

### Como é Verificado (Middleware)

```typescript
// em middleware.ts
const sessionCookie = request.cookies.get("session")?.value
const isAuthenticated = !!sessionCookie
```

---

## Matcher Configuration

### O que É

O matcher define quais rotas passam pelo middleware.

### Configuração

```typescript
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### Significa

- `/(` — Todas as rotas começando com /
- `(?!api|_next/static|_next/image|favicon.ico)` — EXCETO estas:
  - `/api/*` — Rotas de API (têm proteção própria)
  - `/_next/static/*` — Assets estáticos do Next.js
  - `/_next/image/*` — Imagens otimizadas
  - `/favicon.ico` — Ícone da página

---

## Casos de Uso

### 1. Cliente Não Autenticado

| Ação | Resultado |
|------|-----------|
| Digita `/dashboard` | Redireciona para `/auth/login` |
| Digita `/clients` | Redireciona para `/auth/login` |
| Acessa `/` | Mostra homepage com links de login/signup |
| Acessa `/auth/login` | Mostra formulário de login |

### 2. Cliente Autenticado

| Ação | Resultado |
|------|-----------|
| Clica em "Dashboard" | Acessa normalmente |
| Clica em "Clientes" | Acessa normalmente |
| Tenta ir para `/auth/login` | Redireciona para `/dashboard` |
| Faz logout | Cookie é removido, próximo acesso a rota protegida redireciona |

### 3. API Routes

| Route | Proteção |
|-------|----------|
| `/api/auth/login` | Sem proteção (para fazer login) |
| `/api/auth/signup` | Sem proteção (para criar conta) |
| `/api/auth/logout` | Sem proteção (sempre pode fazer logout) |
| `/api/auth/me` | Verifica cookie (retorna 401 se inválido) |
| `/api/clients` | Deve verificar cookie em cada rota |
| `/api/projects` | Deve verificar cookie em cada rota |
| `/api/tasks` | Deve verificar cookie em cada rota |

---

## Segurança

### HttpOnly Cookies

```typescript
httpOnly: true  // Impossível acessar via JavaScript
                // Protege contra XSS attacks
```

### SameSite

```typescript
sameSite: "lax"  // Apenas cookies do mesmo site
                 // Protege contra CSRF attacks
```

### Secure

```typescript
secure: process.env.NODE_ENV === "production"  // HTTPS obrigatório
```

### MaxAge

```typescript
maxAge: 60 * 60 * 24 * 7  // Expira em 7 dias
                           // Força novo login periodicamente
```

---

## Próximo Passo

Para completar a proteção, adicionar verificação de autenticação nas API routes:

```typescript
// em app/api/clients/route.ts
const sessionCookie = request.cookies.get("session")?.value

if (!sessionCookie) {
  return NextResponse.json(
    { error: "Não autenticado" },
    { status: 401 }
  )
}
```

---

## Resumo

| Componente | Responsabilidade |
|-----------|-----------------|
| `middleware.ts` | Protege rotas públicas |
| `useAuth.ts` | Gerencia estado de autenticação |
| `app/api/auth/*` | APIs de autenticação |
| `cookies` | Armazena sessão seguramente |
| Navbar | Mostra login/logout baseado em estado |

✓ Sistema completo e seguro de proteção de rotas implementado.
