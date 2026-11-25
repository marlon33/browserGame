import type { TFunction } from 'i18next';
import type { Item, Monster, QuestDefinition, Realm } from '@/types/game';

export function tMonsterName(t: TFunction, monster: Pick<Monster, 'slug' | 'name'>): string {
  return t(`db.monsters.${monster.slug}.name`, { defaultValue: monster.name });
}

export function tMonsterZone(t: TFunction, monster: Pick<Monster, 'slug' | 'zone_name'>): string {
  return t(`db.monsters.${monster.slug}.zone`, { defaultValue: monster.zone_name });
}

export function tItemName(t: TFunction, item: Pick<Item, 'slug' | 'name'>): string {
  return t(`db.items.${item.slug}.name`, { defaultValue: item.name });
}

export function tItemDesc(t: TFunction, item: Pick<Item, 'slug' | 'description'>): string {
  return t(`db.items.${item.slug}.description`, { defaultValue: item.description });
}

export function tQuestTitle(t: TFunction, quest: Pick<QuestDefinition, 'slug' | 'title'>): string {
  return t(`db.quests.${quest.slug}.title`, { defaultValue: quest.title });
}

export function tQuestDesc(t: TFunction, quest: Pick<QuestDefinition, 'slug' | 'description'>): string {
  return t(`db.quests.${quest.slug}.description`, { defaultValue: quest.description });
}

export function tRealmName(t: TFunction, realm: Pick<Realm, 'slug' | 'name'>): string {
  return t(`db.realms.${realm.slug}.name`, { defaultValue: realm.name });
}
