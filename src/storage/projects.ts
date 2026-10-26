import type { SavedProject } from '../photo/model';
import { validPhotoSettings } from '../photo/model';
import { validateQuad } from '../detection/geometry';
const databaseName = 'gatevisualizer-local';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Local saving is unavailable in this browser. Export your image instead.')); return; }
    const request = indexedDB.open(databaseName, 1);
    let abandoned = false;
    request.onupgradeneeded = () => { request.result.createObjectStore('previews', { keyPath: 'id' }); };
    request.onsuccess = () => { if (abandoned) { request.result.close(); return; } request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(new Error('Could not open local storage. Check private browsing or storage permissions.'));
    request.onblocked = () => { abandoned = true; reject(new Error('Storage update is blocked by another tab. Close other GateVisualizer tabs and retry.')); };
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('previews', mode); const request = action(tx.objectStore('previews'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Local storage failed or is full. Export your image and free browser storage before retrying.')); };
  });
}
export function validateSavedProject(project: SavedProject) {
  if (!project || typeof project.id !== 'string' || typeof project.name !== 'string' || !project.settings || !Array.isArray(project.corners) || project.corners.length !== 4 || project.corners.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new Error('Saved preview data is invalid or from an unsupported version.');
  if (project.version !== 1 || !project.id || !project.name.trim() || project.name.length > 120 || !validPhotoSettings(project.settings) || !Number.isInteger(project.photoWidth) || !Number.isInteger(project.photoHeight) || project.photoWidth < 32 || project.photoWidth > 1600 || project.photoHeight < 32 || project.photoHeight > 1600 || validateQuad(project.corners.map((p) => ({ x: p.x * project.photoWidth, y: p.y * project.photoHeight })), project.photoWidth, project.photoHeight) || !project.photo?.size || !project.gate?.size || !project.composite?.size) throw new Error('Saved preview data is invalid or from an unsupported version.');
}
export async function saveProject(project: SavedProject) { validateSavedProject(project); await transaction('readwrite', (store) => store.put(project)); }
export async function listProjects(): Promise<SavedProject[]> { const items = await transaction<SavedProject[]>('readonly', (store) => store.getAll()); return items.sort((a, b) => b.updatedAt - a.updatedAt); }
export async function getProject(id: string): Promise<SavedProject> { const value = await transaction<SavedProject | undefined>('readonly', (store) => store.get(id)); if (!value) throw new Error('This preview no longer exists.'); validateSavedProject(value); return value; }
export async function renameProject(id: string, name: string) {
  const clean = name.trim(); if (!clean || clean.length > 120) throw new Error('Use a name between 1 and 120 characters.');
  // A single read/write transaction avoids a read-then-write race with deletion.
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('previews', 'readwrite'), store = tx.objectStore('previews'), request = store.get(id);
    request.onsuccess = () => { const value = request.result as SavedProject | undefined; if (!value) { tx.abort(); return; } store.put({ ...value, name: clean, updatedAt: Date.now() }); };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Could not rename this preview. Refresh and retry.')); };
  });
}
export async function deleteProject(id: string) { await transaction('readwrite', (store) => store.delete(id)); }
