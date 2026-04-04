# Plano de Redesign — Noctification Web App

> **Objetivo:** Tornar o frontend mais bonito e limpo, mantendo a stack atual.
> **Abordagem:** Incremental, parte por parte, sem quebrar funcionalidades.
> **Restrição:** Não implementar ainda.

---

## 1. Auditoria do Estado Atual

### Stack (sem mudanças necessárias)
- React 18 + Vite + TypeScript — já é React, nenhuma migração necessária
- Tailwind CSS 3 com CSS variables (light/dark mode via `.dark` no `<html>`)
- Inter como fonte única (pesos 300–900)
- Socket.IO para real-time
- PWA pronto (service worker, manifest)

### O que já funciona bem
- Sistema de tokens via CSS variables é sólido e bem estruturado
- Light/dark mode implementado de forma consistente
- Estrutura semântica correta (`<main>`, `<header>`, `<aside>`, `<nav>`)
- Animações suaves (`fade-in`, `rise-in`) bem calibradas
- Acessibilidade básica presente (`aria-label`, `aria-hidden`, `sr-only`)

---

## 2. Problemas Visuais e de UX Identificados

### 2.1 Header — Crítico
| Problema | Localização | Impacto |
|---|---|---|
| Botões de rota brutos (`/login`, `/admin/login`) aparecem no header quando deslogado — parecem debug tools | `AppHeader`, linha ~175 | Baixa confiança / aparência inacabada |
| Info do usuário exibida como texto puro `"Nome (role)"` | `AppHeader`, `currentUser` block | Não polido |
| Sem identidade visual no header (apenas texto "Plataforma interna") | `AppHeader`, div esquerda | Sem branding |
| "Plataforma interna" em `text-[10px]` com `tracking-[0.22em]` — difícil de ler | `AppHeader` | Legibilidade fraca |
| Botão "Sair" sem ícone, estilo genérico | `AppHeader`, botão logout | Inconsistente com o resto |

### 2.2 Sidebar — Alto
| Problema | Localização | Impacto |
|---|---|---|
| Texto "Operations / Precision Orchestrator" parece placeholder | `UserWorkspace`, seção de logo | Falta de identidade |
| Dois avatars do usuário: um no topo e um no card do rodapé | `UserWorkspace` | Redundância visual |
| Card de workspace no rodapé duplica informação já visível no topo | `UserWorkspace`, div `mt-6` | Poluição visual |
| Nav items em UPPERCASE + `tracking-[0.12em]` — difícil de escanear | `userMenuButtonClass` | Legibilidade comprometida |
| Estado ativo: `bg-surfaceHighest` é muito sutil — difícil de perceber | `userMenuButtonClass` | Hierarquia fraca |
| Mobile nav não tem ícones — perde escaneabilidade | `UserWorkspace`, `<nav className="lg:hidden">` | UX mobile fraco |

### 2.3 Tokens e Estilos Base — Médio
| Problema | Localização | Impacto |
|---|---|---|
| `btn-primary` usa gradiente `#000 → #188ace` — a cor preta parece estranha para uma plataforma em azul | `index.css` | Inconsistência de marca |
| `shadow-glow` com opacidade de 6% é praticamente invisível | `tailwind.config.ts` | Elevação não comunica hierarquia |
| Border radius inconsistente: `0.7rem`, `0.75rem`, `1.75rem`, `2rem`, `rounded-3xl` usados sem padrão | Vários componentes | Falta de coesão visual |
| `text-[10px]` usado em vários lugares — abaixo do mínimo legível (12px) | Múltiplos | Acessibilidade e legibilidade |
| Sem escala de elevação (apenas 1 shadow token) | `tailwind.config.ts` | Cards não têm profundidade |

### 2.4 Tipografia — Médio
| Problema | Impacto |
|---|---|
| Overuse de uppercase + letter-spacing em labels critica a legibilidade geral | Textos parecem gritando |
| Falta de hierarquia clara entre título de página, subtítulo e corpo | Difícil escanear seções |
| `font-display` e `font-sans` apontam para a mesma fonte (Inter) — config redundante | Mínimo |

### 2.5 Componentes Gerais — Baixo/Médio
| Problema | Impacto |
|---|---|
| Sem estados de loading skeleton — telas flasham em branco durante fetch | Experiência percebida como lenta |
| Toasts sem ícone de status (ok/error apenas por cor) | Acessibilidade por cor |
| Modais sem focus trap explícito | Acessibilidade de teclado |

---

## 3. Arquitetura de Informação Proposta

Nenhuma mudança de estrutura de rotas. O redesign é puramente visual/estilístico.

```
/ (raiz)
├── Header (branding + user info + ações)
├── Sidebar (desktop) / Nav mobile
│   ├── Logo + ident. da plataforma
│   ├── Seção: Principal (Painel, Notificações, Tarefas, Lembretes)
│   ├── Seção: Operação (APR, KML/KMZ) — condicional
│   └── Footer: info do usuário (apenas 1x)
└── Área de conteúdo
    ├── Banners de alerta (notificações, lembretes em tempo real)
    └── Página atual
```

---

## 4. Plano por Seção

### Fase 1 — Design Tokens (base de tudo)
Afeta todos os componentes. Deve ser feito primeiro.

**Tokens a ajustar em `index.css` e `tailwind.config.ts`:**

```
BORDER RADIUS — definir escala de 3 valores:
  --radius-sm:  0.5rem   (8px)  → inputs, badges, tooltips
  --radius-md:  0.875rem (14px) → botões, cards internos
  --radius-lg:  1.5rem   (24px) → painéis, sidebar, containers principais

SHADOWS — definir escala de 3 níveis:
  shadow-xs:  0 1px 3px rgba(0,0,0,0.07)      → badges, chips
  shadow-sm:  0 4px 12px rgba(0,0,0,0.08)     → cards, botões focados
  shadow-md:  0 8px 24px rgba(0,0,0,0.10)     → modais, dropdowns, sidebar

TIPOGRAFIA — remover text-[10px], substituir por text-xs (12px):
  Hierarquia:
    display:  text-2xl / font-extrabold  → título de página
    heading:  text-base / font-semibold  → títulos de seção
    label:    text-xs / font-medium      → labels, caps (sem uppercase forçado)
    body:     text-sm / font-normal      → conteúdo
    caption:  text-xs / text-textMuted   → metadados

BTN-PRIMARY — substituir gradiente black→blue por:
  background: rgb(var(--color-accent))
  hover: rgb(var(--color-accent-warm))
  (ou gradiente accent→accentWarm, sem preto)

UPPERCASE — restringir a: seções de navegação e labels de categoria.
  Remover de: valores de dados, nomes de usuário, conteúdo textual.
```

---

### Fase 2 — App Header

**Estado não autenticado:**
- Remover botões `/login` e `/admin/login`
- Substituir por indicador sutil de rota atual (ou remover completamente, já que o LoginScreen se auto-apresenta)
- Manter theme toggle

**Estado autenticado:**
- Substituir `span` de texto puro com nome+role por um componente `UserBadge`:
  ```
  [Avatar Inicial] Nome   →  visual de chip/pill refinado
  ```
- Reorganizar header:
  ```
  [Logo] Título da página          |     [UserBadge] [ThemeToggle] [Sair]
  ```
- Reduzir `text-[10px]` do "Plataforma interna" para `text-xs` ou remover o label
- Adicionar ícone da plataforma ao lado do título no header (logo 20x20)

---

### Fase 3 — Sidebar Desktop

**Topo:**
- Remover textos "Operations" e "Precision Orchestrator" (são placeholders)
- Manter logo + avatar no topo, mas em layout mais limpo:
  ```
  [Logo Icon]                [Pin Button]
  ```

**Navegação:**
- Remover uppercase dos labels de nav (manter ícone + texto normal)
- Aumentar padding horizontal dos items de nav
- Estado ativo: `bg-accent/10 text-accent` (mais visível, alinhado ao accent color)
- Estado hover: `bg-panelAlt/80`
- Ícone no estado ativo: cor accent

**Rodapé da sidebar:**
- Manter o card de workspace mas simplificar:
  ```
  [Avatar] Nome
           Role (tag pequena)
  ```
- Remover o avatar duplicado do topo quando a sidebar está expandida

**Títulos de seção:**
- Trocar `tracking-[0.22em]` por `tracking-wide` (mais suave)
- Reduzir de CAPS+bold para apenas `text-textMuted text-xs`

---

### Fase 4 — Mobile Navigation

- Adicionar ícones aos botões de nav mobile (atualmente só têm texto)
- Estado ativo mais evidente: `bg-accent/10 text-accent` ao invés de `bg-surfaceHighest`
- Layout dos botões: icon acima + label abaixo (pill vertical pequeno)

---

### Fase 5 — Login Screen (Unificado)

**Decisão:** rota `/admin/login` removida. Login único em `/login` detecta role pelo retorno da API.

**Como funciona o fluxo unificado:**
- `api.login(login, password)` — sem `expected_role` no body
- Backend retorna `{ user: { role: "user" | "admin" } }`
- Frontend roteia com base em `user.role` (já acontece em `App.tsx`)
- Remover o check `if (user.role !== expectedRole)` em `App.tsx`

**Arquivos afetados:**
| Arquivo | Mudança |
|---|---|
| `App.tsx` | Remover handler `/admin/login`, remover `expectedRole` do `login()`, unificar em um handler só |
| `appShell.tsx` | Remover `/admin/login` de `AppPath`, `normalizePath`, `getPageTitle`, botões do header |
| `LoginScreen.tsx` | Remover prop `mode`, unificar UI (admin e usuário usam a mesma tela) |

**Visual da tela unificada:**
- Ícone SVG da plataforma acima do formulário
- Heading: "Acesso interno" (para todos)
- Tabs "Entrar" / "Criar conta" visíveis para todos (admin pode tentar criar conta — backend rejeitará se indevido)
- Remover texto "Use as credenciais fixas admin/admin" (expõe credencial)
- Remover campo `login` pré-preenchido com `"admin"`
- Suavizar sombra: `shadow-md` no lugar de `shadow-glow`
- Botão: usar novo `btn-primary` sem gradiente preto

---

### Fase 6 — Dashboard e Painéis de Conteúdo

- Padronizar cabeçalhos de seção em todos os painéis:
  ```
  [Ícone]  Título Seção
           Subtítulo/descrição opcional
  ```
- Cards/painéis: usar `shadow-xs` ou `shadow-sm` para dar profundidade real
- Banners de alerta (NotificationAlertCenter, ReminderAlertCenter): revisar para visual menos intrusivo mas mais claro
- Adicionar skeleton loading nos lugares onde há fetch de dados

---

## 5. Inventário de Componentes

| Componente | Ação | Justificativa |
|---|---|---|
| `AppHeader` | **Estender** | Ajustes visuais; estrutura ok |
| `UserWorkspace` + sidebar | **Estender** | Remover placeholders, melhorar nav |
| `SidebarLogo` | **Estender** | Manter estrutura, refinar visual |
| `SidebarTooltip` | **Manter** | Funciona bem |
| `AppToastStack` | **Estender** | Adicionar ícone de status |
| `LoginScreen` | **Estender** | Pequenos ajustes visuais |
| Mobile `<nav>` | **Estender** | Adicionar ícones |
| `btn-primary` (CSS) | **Substituir** | Trocar gradiente preto |
| `shadow-glow` | **Substituir** | Trocar por escala de shadows |
| `.input` | **Manter** | Está bom |

**Novos componentes a criar:**
| Componente | Descrição |
|---|---|
| `UserBadge` | Chip com avatar inicial + nome + role para o header |
| `SectionHeader` | Título + subtítulo padronizado para painéis |
| `SkeletonBlock` | Skeleton loading reutilizável |

---

## 6. Mudanças nos Design Tokens

```diff
# index.css — acréscimos/modificações

+ :root {
+   --radius-sm:  0.5rem;
+   --radius-md:  0.875rem;
+   --radius-lg:  1.5rem;
+ }

  .btn-primary {
-   background: linear-gradient(135deg, #000000 0%, #188ace 100%);
+   background: rgb(var(--color-accent));
+   /* hover: rgb(var(--color-accent-warm)) via Tailwind hover: */
  }

# tailwind.config.ts — acréscimos

  boxShadow: {
-   glow: "0 8px 32px rgba(19, 27, 46, 0.06)"
+   xs:  "0 1px 3px rgba(0,0,0,0.07)",
+   sm:  "0 4px 12px rgba(0,0,0,0.08)",
+   md:  "0 8px 24px rgba(0,0,0,0.10)",
+   glow: "0 8px 32px rgba(19, 27, 46, 0.06)"  // manter por compatibilidade
  },

  borderRadius: {
+   sm: "0.5rem",
+   md: "0.875rem",
+   lg: "1.5rem",
  }
```

Nenhuma mudança nas cores do tema — a paleta já é consistente e funcional.

---

## 7. Comportamento Responsivo

| Área | Desktop (lg+) | Mobile (< lg) | Ação |
|---|---|---|---|
| Sidebar | Collapsível via hover/pin | Oculta | Sem mudança estrutural |
| Header | 1 linha completa | Quebra em 2 linhas | Melhorar flex-wrap behavior |
| Mobile nav | Oculta | Horizontal com scroll | Adicionar ícones |
| Cards | Grid multi-coluna | Coluna única | Sem mudança |
| Toasts | Bottom-right fixo | Bottom-right fixo | Reduzir largura no mobile |

**Atenção especial no mobile:**
- `text-[10px]` impacta muito mais em telas menores — prioridade alta na substituição
- Nav mobile sem ícone força o usuário a ler texto — ícones melhoram scan

---

## 8. Acessibilidade

**Melhorias incluídas neste plano:**
- Substituir `text-[10px]` por mínimo `text-xs` (12px) — legibilidade
- Toasts com ícone além de cor (`role="alert"` já deve existir ou ser adicionado)
- Nav mobile com ícones + texto (não apenas texto)
- Contraste do estado ativo de nav melhorado (`text-accent` > `text-textMain` em `bg-surfaceHighest`)

**Fora do escopo deste redesign (próxima fase):**
- Focus trap em modais
- Navegação por teclado (setas) na sidebar
- Skip-to-content link

---

## 9. Ordem de Implementação

```
Etapa 1 ── Design Tokens
           index.css + tailwind.config.ts
           • Escala de shadows (xs, sm, md)
           • Escala de border-radius (sm, md, lg)
           • btn-primary sem gradiente preto
           • Remover/substituir text-[10px] global
           Risco: Baixo. Mudança aditiva.

Etapa 2 ── App Header
           appShell.tsx → componente AppHeader
           • Estado não-autenticado: remover botões /login /admin/login
           • Estado autenticado: componente UserBadge
           • Reduzir label "Plataforma interna"
           Risco: Baixo. Apenas visual.

Etapa 3 ── Sidebar Desktop
           appShell.tsx → componente UserWorkspace + sidebar
           • Remover "Operations / Precision Orchestrator"
           • Novo estado ativo de nav (accent)
           • Simplificar rodapé da sidebar
           • Remover avatar duplicado
           Risco: Baixo. Sem mudança de lógica.

Etapa 4 ── Mobile Navigation
           appShell.tsx → nav lg:hidden
           • Adicionar ícones aos botões
           • Novo estado ativo
           Risco: Baixo.

Etapa 5 ── Login Screen
           LoginScreen.tsx
           • Logo/ícone no topo
           • Ajustar shadow do card
           • btn-primary atualizado (vem da Etapa 1)
           Risco: Mínimo.

Etapa 6 ── Dashboard e Painéis
           UserDashboard.tsx + painéis individuais
           • SectionHeader padronizado
           • Shadows nos cards
           • Skeleton loading (opcional nesta fase)
           Risco: Médio. Muitos componentes.
```

---

## 10. Riscos e Questões Abertas

| Risco | Mitigação |
|---|---|
| Login unificado: admin com `expected_role` omitido pode ter comportamento diferente no backend | `apiAuth.ts` já omite `expected_role` quando não fornecido — backend já suporta; validar com teste real |
| Remover check `user.role !== expectedRole` em `App.tsx` expõe usuários comuns ao dashboard admin se backend retornar role errado | O backend é a fonte de verdade — se retornar `role: "admin"` corretamente, o frontend está seguro |
| Texto "Use as credenciais fixas admin/admin" aparece no código — credencial hardcoded | Remover na Etapa 5; verificar se está exposto também no backend |
| Mudança no `btn-primary` afeta todos os botões — pode revelar contextos não testados | Auditar todos os usos de `.btn-primary` antes da Etapa 1 |
| `shadow-glow` é usado como `className` em vários componentes | Manter o token existente, apenas adicionar os novos |
| Nomes de usuário longos quebram o `UserBadge` no header | Implementar `truncate` + `max-w` no componente |

### Questões Respondidas
1. ✅ **"Operations / Precision Orchestrator"** — **remover**. Era placeholder.
2. ✅ **Logo visual** — apenas o ícone SVG `/icons/icon-192.svg`. Sem texto.
3. ✅ **Login unificado** — remover `/admin/login`. Uma única tela `/login` detecta o role pelo retorno da API.
4. **Etapa 6** pode ser dividida por painel conforme preferência.

---

## 11. React — Situação

**O projeto já é 100% React 18 + Vite + TypeScript.**

Não há migração de framework necessária. As perguntas relevantes são:

| Opção | Vale a pena? | Nota |
|---|---|---|
| Migrar para Next.js / Remix | Não neste momento | App é SPA interna, SSR não agrega valor |
| Adicionar biblioteca de componentes (shadcn/ui, Radix) | Opcional, fase futura | Radix UI para primitivos acessíveis (Dialog, DropdownMenu) poderia ajudar os modais |
| Separar componentes UI em package próprio (`packages/ui`) | Opcional, fase futura | Monorepo já está preparado para isso |

**Recomendação:** manter a stack atual. O sistema de tokens + Tailwind é mais do que suficiente para este redesign.

---

*Plano gerado em 2026-04-02. Nenhuma alteração de código foi feita.*
