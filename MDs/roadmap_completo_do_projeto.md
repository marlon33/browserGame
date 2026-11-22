# Roadmap de Desenvolvimento — Browser & Mobile RPG

## Stack & Arquitetura Consolidada
* **Frontend (`app.seujogo.com` + Mobile App):** React + TypeScript + Vite + Capacitor + TanStack Query. Camada puramente visual (*Dummy Client*), sem cálculos ou regras de negócio.
* **Backend Core (`api.seujogo.com`):** PHP 8.3+ / Laravel (API REST Stateless via Laravel Sanctum). Totalmente autoritário (*Server-Authoritative*).
* **Banco de Dados & Cache:** PostgreSQL (com uso de `jsonb` e isolamento multi-servidor via `game_server_id`) + Redis (cache de configurações, rate-limiting e sessões de combate por turno).
* **Expansão Realtime (`pvp.seujogo.com`):** Colyseus (Node.js) isolado para torneios PvP e guerras territoriais em tempo real no futuro.

---

## Fase 1: Infraestrutura, Docker e Multi-Servidor
**Objetivo:** Configurar os repositórios separados, ambiente Docker local e o núcleo multi-servidor com configurações dinâmicas.

- [ ] Criar repositório `game-api` (Laravel) com Docker (`PHP-FPM/Nginx` ou `FrankenPHP` + `PostgreSQL` + `Redis`).
- [ ] Configurar CORS liberando `http://localhost:5173` (Web) e `capacitor://localhost` / `http://localhost` (Capacitor Mobile).
- [ ] Implementar tabela `game_settings` + `GameConfigService` com cache em memória no **Redis** (zero arquivos físicos de configuração).
- [ ] Implementar tabela `game_servers` (`S1`, `S2`...) com taxas e regras isoladas por servidor (`config` em `jsonb`).
- [ ] Criar repositório `game-web` com React + TypeScript + Vite + TanStack Query + Capacitor.

---

## Fase 2: Conta, Reinos, Personagens e Cultivo
**Objetivo:** Implementar o fluxo `Login -> Seleção de Personagem -> Cidade Atual`, incluindo a escolha de Reinos e o sistema de progressão por Estágios/Patentes.

- [ ] Autenticação stateless via **Laravel Sanctum** (Bearer Token).
- [ ] Criar tabelas `realms` (Afinidade A: Ágil/Físico vs. Afinidade B: Arcano/Buffs) e `cultivation_ranks` (Patentes e Estágios estilo *Tales of Demons and Gods*).
- [ ] Criar tabela `characters` vinculada a `user_id`, `game_server_id`, `realm_id` e `current_city_id`, respeitando o limite configurável de personagens por conta (ex: 3) e por servidor.
- [ ] Implementar cálculo sob demanda de regeneração de **HP** e **Energia** baseado em *timestamps* (`energy_updated_at`).
- [ ] Construir no React: Telas de Login/Registro, Lobby de Seleção de Servidor/Personagem e HUD da Cidade Atual.

---

## Fase 3: Economia Base, Treino e Atividades Temporizadas
**Objetivo:** Criar o ciclo diário de ganho de Ouro, XP e evolução de atributos.

- [ ] **Centro de Treino:** Treinamento dos 4 atributos base (`STR`, `AGI`, `INT`, `VIT`) com custo exponencial em Ouro.
- [ ] **Maestrias por Uso:** Evolução passiva de proficiências conforme o jogador utiliza armas, magias ou habilidades.
- [ ] **Sistema de Cultivo (Breakthrough):** Acúmulo de poder entre estrelas e validação de requisitos (atributos, quests ou itens) para romper gargalos e subir de patente.
- [ ] **Atividades Temporizadas (`character_activities`):**
  - **Caçadas Manuais (5 a 60 min):** Foco em XP, drops de materiais e avanço de quests.
  - **Trabalhos por Horas:** Foco em Ouro seguro enquanto o jogador está offline.
- [ ] **Quests e Inventário:** Missões de eliminar alvos ou coletar itens + inventário básico (`items` e `character_items`) com preparação de materiais para o futuro sistema de Craft.

---

## Fase 4: Motor de Combate por Turnos (15s) e Masmorras
**Objetivo:** Implementar batalhas estratégicas interativas processadas no servidor e o sistema de Auto-Farm.

- [ ] **Motor de Combate no Laravel + Redis:**
  - Sessões de batalha no Redis com timer estrito de **15 segundos por turno**.
  - Sistema de **Buffs, Debuffs e Gatilhos Reativos** controlados por duração (`duration_turns`), cargas (`charges`, ex: esquiva que consome ao ser atacado) e momentos de execução (`on_turn_start`, `on_calculate_attack`, `on_receive_hit`).
  - Tipos de ação: Ataque Físico, Magia, Cura, Veneno (DoT), Buff e Debuff.
- [ ] **Masmorras e Auto-Farm (Sweep):**
  - Combate contra ondas/chefes de masmorra.
  - Contador de vitórias por masmorra (`character_dungeon_progress`): após limpar a masmorra X vezes (ex: 5x ou 10x), liberar o **Auto-Farm (5x / 10x)** consumindo energia/chaves.
- [ ] Construir no React a interface de batalha por turnos com cronômetro visual de 15s e animações baseadas no log retornado pela API.

---

## Fase 5: Casa de Leilões, Deploy e Preparação para Escala
**Objetivo:** Fechar a economia entre jogadores de um mesmo servidor e colocar o jogo em produção desacoplada.

- [ ] **Casa de Leilões (Auction House):** Listagem de itens por servidor com compra direta (*Buyout*), prazo de expiração e taxas de listagem/venda (*Gold Sink*).
- [ ] **Moeda Premium por Servidor:** Carteira isolada por personagem/servidor para manter a competitividade justa em novos servidores.
- [ ] **Deploy em Produção:**
  - Frontend estático em CDN (`app.seujogo.com`) + builds Android/iOS via Capacitor.
  - Backend Stateless (`api.seujogo.com`) pronto para operar atrás de um Load Balancer com PostgreSQL e Redis gerenciados.

---

## Fase 6: Expansão Futura (Craft Avançado, Guildas e PvP Realtime)
**Objetivo:** Adicionar sistemas sociais, territoriais e competitivos em tempo real sem refatorar o núcleo.

- [ ] **Sistema de Craft/Forja:** Receitas combinando materiais base + cristais de atributos específicos (dano, crítico, etc.).
- [ ] **Clãs/Guildas e Controle de Cidades:** Eventos semanais/mensais onde guildas disputam o domínio de cidades para ganhar bônus econômicos e arrecadar taxas.
- [ ] **Servidor Colyseus (`pvp.seujogo.com`):** Microsserviço Node.js/TypeScript para torneios PvP em tempo real e guerras de guilda, consumindo os atributos já calculados pelo Laravel.