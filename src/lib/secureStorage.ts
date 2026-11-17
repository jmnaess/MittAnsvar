import * as SecureStore from 'expo-secure-store';

// SecureStore anbefaler maks 2048 byte per verdi, og en Supabase-sesjon er ofte
// større. Vi deler derfor verdien i biter: `key.count` sier hvor mange, og
// bitene ligger i `key.0`, `key.1` osv. Alt blir liggende kryptert på enheten.
const CHUNK_SIZE = 1800;

// SecureStore tillater bare bokstaver, tall og . - _ i nøkler.
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function removeItem(key: string): Promise<void> {
  const base = safeKey(key);
  const count = Number(await SecureStore.getItemAsync(`${base}.count`)) || 0;
  for (let i = 0; i < count; i++) {
    await SecureStore.deleteItemAsync(`${base}.${i}`);
  }
  await SecureStore.deleteItemAsync(`${base}.count`);
}

async function getItem(key: string): Promise<string | null> {
  const base = safeKey(key);
  const count = Number(await SecureStore.getItemAsync(`${base}.count`)) || 0;
  if (count === 0) return null;

  const chunks: string[] = [];
  for (let i = 0; i < count; i++) {
    const chunk = await SecureStore.getItemAsync(`${base}.${i}`);
    if (chunk === null) return null; // ufullstendig lagring – behandles som tom
    chunks.push(chunk);
  }
  return chunks.join('');
}

async function setItem(key: string, value: string): Promise<void> {
  await removeItem(key);
  const base = safeKey(key);
  const count = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(`${base}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  // Antallet skrives sist, så en avbrutt lagring aldri ser komplett ut.
  await SecureStore.setItemAsync(`${base}.count`, String(count));
}

export const secureStorage = { getItem, setItem, removeItem };
