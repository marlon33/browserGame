# Roadmap e Arquitetura: Browser & Mobile Game (Laravel + React + Colyseus)

## Visão Geral da Arquitetura
* **Frontend (`app.seujogo.com` + Mobile App):** React + TypeScript + Vite + Capacitor + TanStack Query. Atua apenas como camada de visualização (Zero lógica de cálculo ou regras de negócio).
* **Backend Core (`api.seujogo.com`):** PHP 8.3+ / Laravel 11+ (API REST Stateless via Laravel Sanctum). Responsável por toda a validação, persistência, economia e regras autoritárias.
* **Banco de Dados & Cache:** PostgreSQL (com uso estratégico de colunas `jsonb`) + Redis (cache, sessões, rate-limiting).
* **Futuro Realtime (`pvp.seujogo.com`):** Colyseus (Node.js) isolado para salas de torneio PvP em tempo real, consumindo os atributos já calculados pelo Laravel.

---

## Fase 1: Infraestrutura e Ambiente Local (Semana 1)
**Objetivo:** Ter repositórios separados rodando localmente com Docker (PostgreSQL + Redis), CORS configurado e comunicação validada entre Web/Mobile e API.

- [ ] Criar repositório `game-api` (Laravel) com `docker-compose.yml` (PHP-FPM/Nginx ou FrankenPHP + Postgres 16 + Redis).
- [ ] Configurar CORS no Laravel liberando `http://localhost:5173` (Web) e `capacitor://localhost` / `http://localhost` (iOS/Android).
- [ ] Criar repositório `game-web` com React + Vite + TypeScript.
- [ ] Configurar **TanStack Query** e cliente HTTP (Axios) com interceptors para tokens Bearer.
- [ ] Inicializar o **Capacitor** no projeto frontend e validar a conexão com a API local.

---

## Fase 2: Autenticação e Estrutura do Jogador (Semana 2)
**Objetivo:** Permitir cadastro, login e carregamento do estado inicial do jogador sem depender de cookies.

- [ ] Configurar **Laravel Sanctum** para emissão de Personal Access Tokens (Bearer).
- [ ] Criar Migrations base:
  - `users` (credenciais).
  - `players` (nível, xp, moedas, timestamps de regeneração, coluna `jsonb` para atributos dinâmicos).
  - `items` (catálogo base do jogo).
  - `player_items` (inventário do jogador).
- [ ] Criar endpoint `GET /api/me` retornando o estado completo e autoritário do jogador.
- [ ] Criar telas de Login, Registro e HUD principal no React consumindo exclusivamente `GET /api/me`.

---

## Fase 3: O Core Loop Autoritário (Semanas 3 e 4)
**Objetivo:** Implementar a mecânica principal do jogo garantindo segurança contra trapaças e condições de corrida (*race conditions*).

- [ ] Implementar a mecânica principal no Laravel (ex: Coleta de recursos, Exploração ou Combate PvE por turnos).
- [ ] Aplicar `DB::transaction()` e `lockForUpdate()` em todas as rotas que alteram saldo ou inventário.
- [ ] Implementar regeneração passiva baseada em *timestamps* (`last_energy_at`) calculada sob demanda no backend (evitando crons pesados a cada minuto).
- [ ] Criar interface reativa no React: botões disparam `POST /api/actions/...`, exibem estado de *loading* e atualizam a UI apenas com o payload retornado pela API.

---

## Fase 4: Deploy Desacoplado e Preparação para Escala (Semana 5)
**Objetivo:** Colocar o jogo no ar com domínios separados, pronto para receber um Load Balancer no futuro.

- [ ] Publicar `game-web` como build estático em CDN (Cloudflare Pages ou Vercel) em `app.seujogo.com`.
- [ ] Publicar `game-api` + Postgres + Redis em servidor/nuvem em `api.seujogo.com` com SSL.
- [ ] Garantir que a API seja 100% *Stateless* (nenhum arquivo local em disco ou sessão em memória) para permitir múltiplas réplicas atrás de um Load Balancer.
- [ ] Gerar builds de teste do Capacitor (APK/IPA) apontando para `https://api.seujogo.com`.

---

## Fase 5: Torneios PvP Realtime (Expansão Futura)
**Objetivo:** Adicionar batalhas em tempo real sem reescrever as regras do jogo.

- [ ] Subir servidor **Colyseus** (Node.js/TypeScript) em `pvp.seujogo.com`.
- [ ] Criar endpoint no Laravel `POST /api/pvp/matchmaking` que valida o jogador, calcula seus atributos finais e gera um token JWT assinado para a sala.
- [ ] Colyseus valida o token, executa o loop da batalha em tempo real e envia um webhook `POST /api/internal/pvp-result` ao Laravel ao fim da luta para entrega de recompensas.