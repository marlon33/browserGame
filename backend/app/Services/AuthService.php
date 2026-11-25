<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthService
{
    private function normalizeEmail(Request $request): void
    {
        $email = $request->input('email');
        if (is_string($email)) {
            $request->merge(['email' => strtolower(trim($email))]);
        }
    }

    private function throttleKey(Request $request, string $purpose): string
    {
        $email = is_string($request->input('email')) ? strtolower(trim($request->input('email'))) : '';
        return $purpose . '|' . $request->ip() . '|' . $email;
    }

    private function ensureRateLimit(string $key, int $maxAttempts, int $decaySeconds): void
    {
        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);
            abort(429, "Muitas tentativas. Aguarde {$seconds} segundos e tente novamente.");
        }

        RateLimiter::hit($key, $decaySeconds);
    }


    /** Registro de nova conta */
    public function register(Request $request): JsonResponse
    {
        $this->ensureRateLimit($this->throttleKey($request, 'register'), 5, 3600);
        $this->normalizeEmail($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:30', 'unique:users,name'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Conta criada com sucesso.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at,
            ],
        ], 201);
    }


    /** Login e emissão de Bearer Token */
    public function login(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:256'],
            'device_name' => ['nullable', 'string', 'max:60', 'regex:/^[a-zA-Z0-9._ -]+$/'],
        ]);

        $key = $this->throttleKey($request, 'login');
        $this->ensureRateLimit($key, 5, 60);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas. Verifique seu e-mail e senha.'],
            ]);
        }

        RateLimiter::clear($key);

        // Revoga o token anterior desse dispositivo antes de emitir outro.
        $deviceName = $validated['device_name'] ?? 'browser_session';
        $user->tokens()->where('name', $deviceName)->delete();


        $token = $user->createToken($deviceName)->plainTextToken;


        return response()->json([
            'message' => 'Login realizado com sucesso.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }


    /** Validação ativa de token e retorno dos dados da conta (/me) */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at,
            ],
        ]);
    }


    /** Logout (revoga o token atual) */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();


        return response()->json([
            'message' => 'Sessão encerrada com sucesso.',
        ]);
    }


    /** Troca de senha para usuário autenticado */
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', PasswordRule::min(8), 'different:current_password'],
        ]);

        $user = $request->user();
        $user->update([
            'password' => $validated['password'],
        ]);

        // Revoga todos os outros tokens ativos por segurança, mantendo apenas o atual.
        $currentTokenId = $user->currentAccessToken()?->id;
        $user->tokens()->where('id', '!=', $currentTokenId)->delete();


        return response()->json([
            'message' => 'Senha alterada com sucesso.',
        ]);
    }


    /** Solicitação de link/token de recuperação de senha */
    public function forgotPassword(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $this->ensureRateLimit($this->throttleKey($request, 'forgot-password'), 3, 3600);

        Password::sendResetLink(['email' => $validated['email']]);

        // Resposta neutra: não revela status nem existência da conta.
        return response()->json([
            'message' => 'Se o e-mail estiver cadastrado, enviamos as instruções de recuperação.',
        ]);
    }


    /** Redefinição efetiva da senha via token recebido por e-mail */
    public function resetPassword(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                ])->setRememberToken(Str::random(60));

                $user->save();

                // Revoga todos os tokens antigos após redefinição de senha.
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );


        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['Token inválido ou expirado. Solicite uma nova recuperação de senha.'],
            ]);
        }


        return response()->json([
            'message' => 'Senha redefinida com sucesso. Faça login com sua nova senha.',
        ]);
    }
}
