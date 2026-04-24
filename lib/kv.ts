import { Redis } from '@upstash/redis';
import type { CustomWord, Story } from './types';

const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

// ── Custom Words ──────────────────────────────────────────────────────────────

export async function getCustomWords(): Promise<CustomWord[]> {
  const data = await redis.get<CustomWord[]>('custom-words');
  return data ?? [];
}

export async function saveCustomWords(words: CustomWord[]): Promise<void> {
  await redis.set('custom-words', words);
}

export async function addCustomWord(
  input: Omit<CustomWord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CustomWord> {
  const words = await getCustomWords();
  const now = new Date().toISOString();
  const newWord: CustomWord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await saveCustomWords([...words, newWord]);
  return newWord;
}

export async function updateCustomWord(
  id: string,
  patch: Partial<Omit<CustomWord, 'id' | 'createdAt'>>,
): Promise<CustomWord | null> {
  const words = await getCustomWords();
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  words[idx] = { ...words[idx], ...patch, updatedAt: new Date().toISOString() };
  await saveCustomWords(words);
  return words[idx];
}

export async function deleteCustomWord(id: string): Promise<boolean> {
  const words = await getCustomWords();
  const filtered = words.filter((w) => w.id !== id);
  if (filtered.length === words.length) return false;
  await saveCustomWords(filtered);
  return true;
}

export async function deleteCustomWords(ids: string[]): Promise<number> {
  const idSet = new Set(ids);
  const words = await getCustomWords();
  const filtered = words.filter((w) => !idSet.has(w.id));
  const deleted = words.length - filtered.length;
  if (deleted > 0) await saveCustomWords(filtered);
  return deleted;
}

// ── Stories ───────────────────────────────────────────────────────────────────

export async function getStories(): Promise<Story[]> {
  const data = await redis.get<Story[]>('stories');
  return data ?? [];
}

export async function saveStories(stories: Story[]): Promise<void> {
  await redis.set('stories', stories);
}

export async function addStory(
  input: Omit<Story, 'id' | 'createdAt'>,
): Promise<Story> {
  const stories = await getStories();
  const newStory: Story = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await saveStories([...stories, newStory]);
  return newStory;
}

export async function updateStory(
  id: string,
  patch: Partial<Omit<Story, 'id' | 'createdAt'>>,
): Promise<Story | null> {
  const stories = await getStories();
  const idx = stories.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  stories[idx] = { ...stories[idx], ...patch };
  await saveStories(stories);
  return stories[idx];
}

export async function deleteStory(id: string): Promise<boolean> {
  const stories = await getStories();
  const filtered = stories.filter((s) => s.id !== id);
  if (filtered.length === stories.length) return false;
  await saveStories(filtered);
  return true;
}
