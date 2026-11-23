<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_bearer_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'NieLi_Test',
            'email' => 'nieli@reino.com',
            'password' => 'SenhaForte123',
            'password_confirmation' => 'SenhaForte123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'message',
                'token',
                'token_type',
                'user' => ['id', 'name', 'email'],
            ]);

        $this->assertDatabaseHas('users', [
            'name' => 'NieLi_Test',
            'email' => 'nieli@reino.com',
        ]);
    }

    public function test_user_cannot_register_with_duplicate_email_or_name(): void
    {
        User::factory()->create([
            'name' => 'XiaoYan',
            'email' => 'xiaoyan@reino.com',
        ]);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'XiaoYan',
            'email' => 'xiaoyan@reino.com',
            'password' => 'SenhaForte123',
            'password_confirmation' => 'SenhaForte123',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email']);
    }

    public function test_user_can_login_and_validate_token_on_me_endpoint(): void
    {
        $user = User::factory()->create([
            'email' => 'cultivador@reino.com',
            'password' => Hash::make('SenhaForte123'),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'cultivador@reino.com',
            'password' => 'SenhaForte123',
        ]);

        $loginResponse->assertOk();
        $token = $loginResponse->json('token');

        $meResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');

        $meResponse->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.email', 'cultivador@reino.com');
    }

    public function test_user_can_update_password_and_old_tokens_are_revoked(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('SenhaAntiga123'),
        ]);

        $oldToken = $user->createToken('old_device')->plainTextToken;
        $currentToken = $user->createToken('current_device')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$currentToken}")
            ->putJson('/api/auth/password', [
                'current_password' => 'SenhaAntiga123',
                'password' => 'NovaSenha456',
                'password_confirmation' => 'NovaSenha456',
            ]);

        $response->assertOk();

        $this->assertTrue(Hash::check('NovaSenha456', $user->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@reino.com',
            'password' => Hash::make('SenhaAntiga123'),
        ]);

        $resetToken = Password::createToken($user);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $resetToken,
            'email' => 'reset@reino.com',
            'password' => 'SenhaRedefinida789',
            'password_confirmation' => 'SenhaRedefinida789',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('SenhaRedefinida789', $user->fresh()->password));
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('session')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
