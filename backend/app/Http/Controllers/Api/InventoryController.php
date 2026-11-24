<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Character;
use App\Models\CharacterItem;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryController extends Controller
{
    private function resolveCharacter(Request $request): Character
    {
        $characterId = $request->header('X-Character-Id');
        if (! $characterId) {
            abort(400, 'Header X-Character-Id ausente.');
        }

        $character = Character::with(['server', 'realm', 'cultivationRank'])
            ->where('id', $characterId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $character) {
            abort(404, 'Personagem não encontrado ou não pertence à sua conta.');
        }

        return $character;
    }

    /**
     * Retorna o catálogo da loja e a mochila completa do personagem
     */
    public function index(Request $request): JsonResponse
    {
        $character = $this->resolveCharacter($request);

        $shopItems = Item::where('is_purchasable', true)
            ->orderBy('required_level')
            ->orderBy('buy_price')
            ->get();

        $inventory = CharacterItem::with('item')
            ->where('character_id', $character->id)
            ->orderByDesc('is_equipped')
            ->orderBy('id')
            ->get();

        return response()->json([
            'shop_items' => $shopItems,
            'inventory' => $inventory,
            'character' => $character,
        ]);
    }

    /**
     * Compra um item da loja usando Pedras Espirituais
     */
    public function buy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_id' => ['required', 'integer', 'exists:items,id'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $quantity = $validated['quantity'] ?? 1;
        $character = $this->resolveCharacter($request);

        return DB::transaction(function () use ($character, $validated, $quantity) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $item = Item::findOrFail($validated['item_id']);

            if (! $item->is_purchasable) {
                throw ValidationException::withMessages([
                    'item_id' => ['Este item exclusivo só pode ser obtido derrotando bestas em combate.'],
                ]);
            }

            if ($item->type !== 'consumable' && $quantity > 1) {
                $quantity = 1;
            }

            $totalCost = $item->buy_price * $quantity;

            if ($char->spirit_stones < $totalCost) {
                throw ValidationException::withMessages([
                    'spirit_stones' => ["Pedras Espirituais insuficientes. Necessário: {$totalCost}."],
                ]);
            }

            $char->spirit_stones -= $totalCost;
            $char->save();

            $char->addItemToInventory($item, $quantity);
            $char->load(['server', 'realm', 'cultivationRank']);

            return response()->json([
                'message' => "Você adquiriu {$quantity}x {$item->name}!",
                'character' => $char,
            ]);
        });
    }

    /**
     * Equipa ou desequipa uma arma, armadura ou acessório
     */
    public function toggleEquip(Request $request, int $characterItemId): JsonResponse
    {
        $character = $this->resolveCharacter($request);

        return DB::transaction(function () use ($character, $characterItemId) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $charItem = CharacterItem::with('item')
                ->where('id', $characterItemId)
                ->where('character_id', $char->id)
                ->firstOrFail();

            $item = $charItem->item;

            if ($item->type === 'consumable') {
                throw ValidationException::withMessages([
                    'item' => ['Itens consumíveis não podem ser equipados. Use-os para ativar o efeito.'],
                ]);
            }

            if (! $charItem->is_equipped) {
                if ($char->level < $item->required_level) {
                    throw ValidationException::withMessages([
                        'level' => ["Nível {$item->required_level} necessário para equipar {$item->name}."],
                    ]);
                }

                // Desequipa qualquer outro item do mesmo slot (weapon, armor ou accessory)
                $sameSlotIds = CharacterItem::where('character_id', $char->id)
                    ->where('is_equipped', true)
                    ->whereHas('item', fn ($q) => $q->where('type', $item->type))
                    ->pluck('id');

                if ($sameSlotIds->isNotEmpty()) {
                    CharacterItem::whereIn('id', $sameSlotIds)->update(['is_equipped' => false]);
                }

                $charItem->is_equipped = true;
                $charItem->save();
                $msg = "{$item->name} equipado!";
            } else {
                $charItem->is_equipped = false;
                $charItem->save();
                $msg = "{$item->name} desequipado.";
            }

            // Ajusta HP atual caso supere o novo HP máximo após desequipar
            $effectiveMaxHp = $char->effective_stats['max_hp'];
            if ($char->hp > $effectiveMaxHp) {
                $char->hp = $effectiveMaxHp;
                $char->save();
            }

            $char->load(['server', 'realm', 'cultivationRank']);

            return response()->json([
                'message' => $msg,
                'character' => $char,
            ]);
        });
    }

    /**
     * Consome uma pílula ou elixir para restaurar HP ou Energia
     */
    public function useItem(Request $request, int $characterItemId): JsonResponse
    {
        $character = $this->resolveCharacter($request);

        return DB::transaction(function () use ($character, $characterItemId) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $char->syncLazyResources();

            $charItem = CharacterItem::with('item')
                ->where('id', $characterItemId)
                ->where('character_id', $char->id)
                ->firstOrFail();

            $item = $charItem->item;

            if ($item->type !== 'consumable') {
                throw ValidationException::withMessages([
                    'item' => ['Apenas pílulas e elixires consumíveis podem ser usados.'],
                ]);
            }

            $effectiveMaxHp = $char->effective_stats['max_hp'];

            if ($item->heal_hp > 0 && $char->hp >= $effectiveMaxHp && $item->restore_energy <= 0) {
                throw ValidationException::withMessages([
                    'hp' => ['Sua vitalidade (HP) já está no máximo.'],
                ]);
            }

            if ($item->restore_energy > 0 && $char->energy >= $char->max_energy && $item->heal_hp <= 0) {
                throw ValidationException::withMessages([
                    'energy' => ['Sua Energia Espiritual já está no máximo.'],
                ]);
            }

            if ($item->heal_hp > 0) {
                $char->hp = min($effectiveMaxHp, $char->hp + $item->heal_hp);
            }

            if ($item->restore_energy > 0) {
                $char->energy = min($char->max_energy, $char->energy + $item->restore_energy);
            }

            $char->save();

            if ($charItem->quantity > 1) {
                $charItem->decrement('quantity');
            } else {
                $charItem->delete();
            }

            $char->load(['server', 'realm', 'cultivationRank']);

            return response()->json([
                'message' => "Você consumiu {$item->name}!",
                'character' => $char,
            ]);
        });
    }

    /**
     * Vende um item não equipado por Pedras Espirituais
     */
    public function sell(Request $request, int $characterItemId): JsonResponse
    {
        $character = $this->resolveCharacter($request);

        return DB::transaction(function () use ($character, $characterItemId) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $charItem = CharacterItem::with('item')
                ->where('id', $characterItemId)
                ->where('character_id', $char->id)
                ->firstOrFail();

            if ($charItem->is_equipped) {
                throw ValidationException::withMessages([
                    'item' => ['Desequipe o item antes de vendê-lo.'],
                ]);
            }

            $item = $charItem->item;
            $char->spirit_stones += $item->sell_price;
            $char->save();

            if ($charItem->quantity > 1) {
                $charItem->decrement('quantity');
            } else {
                $charItem->delete();
            }

            $char->load(['server', 'realm', 'cultivationRank']);

            return response()->json([
                'message' => "Vendido {$item->name} por +{$item->sell_price} Pedras Espirituais.",
                'character' => $char,
            ]);
        });
    }
}
