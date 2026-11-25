import type { TFunction } from 'i18next';
import type { GameServer, Item, Monster, QuestDefinition, Realm } from '@/types/game';

export function tRegionName(t: TFunction, slug: string, fallback: string): string {
  return t(`db.regions.${slug}`, { defaultValue: fallback });
}

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

export function tRealmTagline(t: TFunction, realm: Pick<Realm, 'slug' | 'tagline'>): string {
  return t(`db.realms.${realm.slug}.tagline`, { defaultValue: realm.tagline });
}

export function tRealmDesc(t: TFunction, realm: Pick<Realm, 'slug' | 'description'>): string {
  return t(`db.realms.${realm.slug}.description`, { defaultValue: realm.description });
}

export function tServerName(t: TFunction, server: Pick<GameServer, 'code' | 'name'>): string {
  return t(`db.servers.${server.code}.name`, { defaultValue: server.name });
}

export function tServerDesc(
  t: TFunction,
  server: Pick<GameServer, 'code' | 'description'>
): string | null {
  if (!server.description) return null;
  return t(`db.servers.${server.code}.description`, { defaultValue: server.description });
}
