import { sampleGate } from '../gates/assets';
import type { GateImage } from '../gates/loadImage';

export function GatePreview({ gate }: { gate: GateImage | null }) {
  const asset = gate?.asset ?? sampleGate;
  return <section className="panel overflow-hidden" aria-labelledby="asset-title">
    <div className="flex items-start justify-between gap-4 p-5"><div><p className="eyebrow">Selected asset</p><h2 id="asset-title">Gate image</h2></div><span className="tag">{asset.placeholder ? 'Placeholder' : 'Local upload'}</span></div>
    <div className="checkerboard px-5 py-8"><img className="mx-auto h-auto w-full max-w-lg" src={asset.src} width={asset.widthPixels} height={asset.heightPixels} alt={asset.name} /></div>
    <p className="p-5 text-sm text-slate-600">{asset.name} · {asset.widthPixels} × {asset.heightPixels} px. This panel previews the asset; live placement uses a textured Three.js world-space plane.</p>
  </section>;
}
