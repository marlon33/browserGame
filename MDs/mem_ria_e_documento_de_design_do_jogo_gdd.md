# Memória do Projeto & Game Design Document (GDD)

Este documento consolida todas as decisões técnicas, arquiteturais e de regras de negócio definidas durante a concepção do projeto.

---

## 1. Visão Geral e Filosofia Técnica
* **Tipo de Jogo:** Browser RPG Clássico (inspirado em *Gladiatus*, *Runescape* e sistemas de cultivo de *Tales of Demons and Gods*), jogável no navegador e empacotado para Android/iOS via **Capacitor**.
* **Princípio Zero-Trust (*Server-Authoritative*):** O frontend em React é estritamente visual. Ele não calcula dano, não valida tempo de caçada e não controla economia. Toda ação envia uma intenção para a API, que valida, processa e retorna o novo estado oficial.
* **Repositórios Separados:** Frontend (`game-web`) e Backend (`game-api`) ficam em repositórios e domínios distintos (`app.` e `api.`), facilitando deploy independente, uso de CDN no front e escalabilidade horizontal com **Load Balancer** no back.
* **Sem Arquivos Físicos de Configuração:** Todas as regras, limites e taxas ficam no **PostgreSQL** e são cacheadas em memória no **Redis** para leitura instantânea entre múltiplas instâncias da API.

---

## 2. Arquitetura Multi-Servidor e Contas
* **Isolamento Lógico por Servidor (`game_server_id`):** Em vez de criar bancos físicos separados para cada servidor, o sistema usa um único PostgreSQL com isolamento lógico por `server_id` (garantido via Middlewares e Global Scopes no Laravel). Isso permite login único, facilidade para aplicar atualizações e possibilidade de fusão de servidores (*Merge*) no futuro.
* **Limite de Personagens:** O jogador cria uma conta global (`users`) e pode criar múltiplos personagens (limite inicial de **3 personagens por conta**, configurável no banco/Redis), podendo distribuí-los entre servidores diferentes (`S1`, `S2`, etc.).
* **Economia Isolada por Servidor:** Tanto o **Ouro** quanto a **Moeda Premium** pertencem ao personagem/servidor, garantindo que jogadores veteranos não quebrem a economia de um servidor recém-lançado.

---

## 3. Reinos (Afinidades), Atributos e Progressão (Cultivo)
* **Escolha de Reino (Arquétipo Permanente):**
  * **Reino A (Agilidade / Lâmina):** Bônus em velocidade de ataque, esquiva, crítico e menor tempo de ação; penalidade em HP máximo e resistência.
  * **Reino B (Arcano / Espírito):** Bônus em poder mágico, mana máxima, potência e duração de buffs/debuffs.
* **Sistema Híbrido de Evolução:**
  * **4 Atributos Base (`STR`, `AGI`, `INT`, `VIT`):** Aumentados gastando **Ouro** no Centro de Treino (principal *Gold Sink* do jogo).
  * **Maestrias por Uso:** Habilidades e proficiências evoluem organicamente conforme o jogador as utiliza em batalha.
* **Ranking de Poder Evolutivo (Cultivo):**
  * Inspirado em *Tales of Demons and Gods*, o personagem evolui por **Patentes** subdivididas em **Estágios/Estrelas** (ex: *Bronze 1 a 5 Estrelas $\rightarrow$ Prata 1 a 5 Estrelas...*).
  * Para mudar de patente (ex: *Bronze 5 Estrelas $\rightarrow$ Prata 1 Estrela*), o jogador enfrenta uma **Quebra de Gargalo (Breakthrough)** que exige cumprir requisitos específicos (nível de treino, quests de ascensão, derrotar guardiões ou usar itens especiais).

---

## 4. Loop de Atividades e Economia
* **Caçadas Manuais (5 a 60 minutos):** Escolhidas manualmente pelo jogador. Geram XP, progresso em Quests e drops de materiais.
* **Trabalhos por Horas:** Atividade segura de longa duração focada em gerar **Ouro** para financiar o treino de atributos.
* **Quests:** Objetivos estruturados (matar X criaturas, coletar Y materiais, concluir etapas de cultivo).
* **Masmorras e Auto-Farm (Sweep):** Após derrotar uma masmorra manualmente X vezes (ex: 5 ou 10 limpezas), o jogador desbloqueia a opção de **Auto-Farm (5x / 10x)** para farmar recompensas gastando energia/entradas.
* **Casa de Leilões (Auction House):** Mercado centralizado por servidor onde jogadores listam itens para **Compra Direta (Buyout)**, com taxas de listagem e venda para controlar a inflação de ouro.
* **Craft (Planejado para Expansão):** Combinação de receitas, materiais base (metal, carvão) e cristais de atributos específicos (cristal de dano, cristal de crítico) para forjar equipamentos personalizados. Os materiais já existem como drops desde o início.

---

## 5. Sistema de Combate por Turnos (15 Segundos)
* **Dinâmica:** Combate PvE (masmorras e campo) por turnos interativos onde o jogador tem **15 segundos** para escolher sua ação (Ataque Físico, Magia, Cura, Veneno, Buff ou Debuff). Se o tempo expirar, o servidor avança o turno penalizando o jogador.
* **Gerenciamento de Estado:** O estado ativo da batalha fica armazenado no **Redis** com expiração por turno (`turn_expires_at`).
* **Mecânica de Buffs, Debuffs e Reações:**
  * Cada efeito ativo possui **Duração (`duration_turns`)**, **Cargas (`charges`)** e **Gatilho (`trigger`)**.
  * Exemplo prático: Um buff de *"Postura de Esquiva"* pode durar 2 turnos, mas possuir apenas `1 carga` com gatilho `on_receive_hit` — ele permanece ativo até ser consumido no exato momento em que o inimigo atacar, desaparecendo logo em seguida.
  * Efeitos contínuos como **Veneno** ou **Regeneração** rodam no gatilho `on_turn_start`.

---

## 6. Fluxo de Navegação e Expansões Futuras
* **Fluxo Base de Telas:** `Login / Registro` $\rightarrow$ `Seleção de Servidor e Personagem` $\rightarrow$ `Cidade Atual (Hub Central)`.
* **Guildas e Controle de Cidades (Expansão):** Eventos semanais ou mensais onde clãs disputam o domínio de cidades estratégicas para receber bônus passivos e arrecadar parte das taxas locais.
* **Torneios PvP Realtime (Expansão):** Implementação de um servidor **Colyseus (Node.js)** dedicado para batalhas em tempo real, recebendo os atributos já calculados pelo Laravel e devolvendo o resultado via webhook interno.