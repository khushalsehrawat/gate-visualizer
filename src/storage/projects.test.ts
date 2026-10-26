// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { deleteProject, getProject, listProjects, renameProject, saveProject } from './projects';
import { defaultPhotoSettings } from '../photo/model';
import type { SavedProject } from '../photo/model';
const fixture = (): SavedProject => ({ version: 1, id: crypto.randomUUID(), name: 'Courtyard option', createdAt: 1, updatedAt: 2, photo: new Blob(['photo'], { type: 'image/png' }), gate: new Blob(['gate'], { type: 'image/png' }), composite: new Blob(['composite'], { type: 'image/png' }), gateName: 'Linear', photoWidth: 100, photoHeight: 100, corners: [{ x: .1, y: .1 }, { x: .9, y: .1 }, { x: .9, y: .9 }, { x: .1, y: .9 }], settings: { ...defaultPhotoSettings } });
describe('IndexedDB project lifecycle integration', () => {
  it('saves image blobs and settings, reopens, renames, updates and deletes atomically', async () => {
    const record = fixture(); await saveProject(record);
    const opened = await getProject(record.id);
    expect(await opened.photo.text()).toBe('photo'); expect(await opened.gate.text()).toBe('gate'); expect(opened.settings).toEqual(record.settings);
    await renameProject(record.id, '  Final entrance  '); expect((await getProject(record.id)).name).toBe('Final entrance');
    await saveProject({ ...await getProject(record.id), settings: { ...record.settings, opacity: .7 } });
    expect((await getProject(record.id)).settings.opacity).toBe(.7);
    expect((await listProjects()).some((item) => item.id === record.id)).toBe(true);
    await deleteProject(record.id); await expect(getProject(record.id)).rejects.toThrow(/no longer exists/);
    expect((await listProjects()).some((item) => item.id === record.id)).toBe(false);
  });
  it('rejects invalid geometry/names rather than storing an anchor or a broken default', async () => {
    const record = fixture(); record.corners[1] = record.corners[0];
    await expect(saveProject(record)).rejects.toThrow(/invalid/);
    await expect(renameProject('missing', '')).rejects.toThrow(/1 and 120/);
  });
});
