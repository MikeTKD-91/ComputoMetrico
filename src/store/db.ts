import { openDB } from 'idb';
import type { VocePrezzario } from '@/types';

const DB_NAME = 'computo-metrico';
const DB_VERSION = 1;

export const getDB = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('prezzario')) {
      db.createObjectStore('prezzario', { keyPath: 'id' });
    }
  },
});

export async function salvaPrezzarioDB(voci: VocePrezzario[]) {
  const db = await getDB();
  const tx = db.transaction('prezzario', 'readwrite');
  await tx.store.clear();
  for (const voce of voci) await tx.store.put(voce);
  await tx.done;
}

export async function caricaPrezzarioDB(): Promise<VocePrezzario[]> {
  const db = await getDB();
  return db.getAll('prezzario');
}
