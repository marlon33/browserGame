Roteiro de Desenvolvimento — Etapa 1: Autenticação da API

    Configuração de Base da API (CORS, Sanctum e Respostas JSON):

        Garantir que o Laravel retorne sempre JSON nas rotas /api/* (mesmo em erros de validação 422 ou não autenticado 401, sem tentar redirecionar para telas HTML).

        Configurar o config/cors.php para liberar o acesso do frontend React (http://localhost:5173) e permitir headers customizados que usaremos depois (X-Server-Id, X-Character-Id).

        Ajustar o User Model com a trait HasApiTokens (do Sanctum).

    Endpoints Públicos de Entrada (Registro & Login):

        POST /api/auth/register: Validação estrita (nome, e-mail único, senha forte com confirmação), criação do usuário e retorno imediato do token de acesso (Bearer Token) + dados do usuário.

        POST /api/auth/login: Verificação de credenciais, revogação de tokens antigos (opcional, para evitar múltiplas sessões simultâneas no mesmo usuário se desejar) e emissão do novo token.

    Recuperação de Senha (Fluxo Completo para SPA/API):

        POST /api/auth/forgot-password: Gera o token de redefinição do Laravel (Password::sendResetLink) e dispara o e-mail (que podemos testar localmente usando o MAIL_MAILER=log ou Mailpit).

        POST /api/auth/reset-password: Valida o token recebido por e-mail + e-mail + nova senha, atualiza o hash no banco e invalida tokens antigos.

    Endpoints Protegidos (auth:sanctum) — Sessão e Segurança:

        GET /api/auth/me: Validação ativa do token ao abrir/recarregar o frontend — retorna os dados atualizados da conta (e futuramente a lista de personagens do jogador nos servidores).

        PUT /api/auth/password: Troca de senha para o usuário já logado (exigindo a current_password por segurança).

        POST /api/auth/logout: Revoga o token atual no banco de dados.

    Integração no Frontend (React + Axios + TanStack Query):

        Criar a instância configurada do api.ts (Axios) com interceptors para injetar automaticamente o Authorization: Bearer <token> e capturar erros 401 (deslogando o usuário se o token expirar).

        Montar o hook useAuth com TanStack Query e as telas iniciais de Login, Registro e Recuperação de Senha.

Como ficam as próximas etapas logo após a Autenticação:

    Etapa 2 (Mundo & Personagens): Tabelas game_servers, realms (Reino A / Reino B), cultivation_ranks e characters (criação e seleção do personagem dentro de um servidor).

    Etapa 3 (Loop Principal & Energia): Sincronização lazy de regeneração de energia/HP no backend, treino de atributos e HUD principal no React.