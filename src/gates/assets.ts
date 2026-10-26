export const gateCategories = ['Modern', 'Minimal', 'Horizontal Slat', 'Vertical Slat', 'Laser Cut', 'Classic', 'Luxury'] as const;
export type GateCategory = typeof gateCategories[number];
export interface GateAsset { id: string; name: string; src: string; widthPixels: number; heightPixels: number; placeholder: boolean; category?: GateCategory }
export const sampleGate: GateAsset = {
  id: 'gate-01', name: 'Gate 01 — local placeholder', src: `${import.meta.env.BASE_URL}gates/gate-01.png`,
  widthPixels: 640, heightPixels: 360, placeholder: true, category: 'Modern',
};
export const gateCatalogue: GateAsset[] = [
  sampleGate,
  { id: 'gate-02', name: 'Linear — horizontal slats', src: `${import.meta.env.BASE_URL}gates/gate-02.png`, widthPixels: 640, heightPixels: 360, placeholder: true, category: 'Horizontal Slat' },
  { id: 'gate-03', name: 'Rhythm — vertical slats', src: `${import.meta.env.BASE_URL}gates/gate-03.png`, widthPixels: 480, heightPixels: 360, placeholder: true, category: 'Vertical Slat' },
  { id: 'gate-04', name: 'Quiet — minimal frame', src: `${import.meta.env.BASE_URL}gates/gate-04.png`, widthPixels: 640, heightPixels: 360, placeholder: true, category: 'Minimal' },
  { id: 'gate-05', name: 'Lattice — laser-cut study', src: `${import.meta.env.BASE_URL}gates/gate-05.png`, widthPixels: 640, heightPixels: 360, placeholder: true, category: 'Laser Cut' },
  { id: 'gate-06', name: 'Heritage — classic bars', src: `${import.meta.env.BASE_URL}gates/gate-06.png`, widthPixels: 640, heightPixels: 360, placeholder: true, category: 'Classic' },
  { id: 'gate-07', name: 'Atelier — framed geometry', src: `${import.meta.env.BASE_URL}gates/gate-07.png`, widthPixels: 640, heightPixels: 360, placeholder: true, category: 'Luxury' },
];
