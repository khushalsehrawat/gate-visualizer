import { useState } from 'react';
import { gateCatalogue, gateCategories } from '../gates/assets';
import { useGateLibrary } from '../gates/GateProvider';
export function Catalogue() {
  const { gate, loading, error, restore } = useGateLibrary();
  const [category, setCategory] = useState('All'), [notice, setNotice] = useState('');
  return <div>
    <div className="page-intro"><p className="eyebrow">Consider every possibility</p><h1>A gate for your architecture.</h1><p>Explore the proportions, lines and character of each style. Select a design, then see it at your own entrance.</p></div>
    <div className="category-tabs" aria-label="Gate categories">{['All', ...gateCategories].map((item) => <button aria-pressed={category === item} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
    {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status" className="form-notice">{notice} <a href="#/photo">Open Photo Preview →</a> or <a href="#/live">Live Preview →</a></p>}
    <div className="catalogue-grid">{gateCatalogue.filter((asset) => category === 'All' || asset.category === category).map((asset, i) => <article className="design-card" key={asset.id}>
      <div className="design-image"><img src={asset.src} alt={`${asset.name}, flat gate design placeholder`} width={asset.widthPixels} height={asset.heightPixels} loading="lazy" /><span>Illustrative design</span></div>
      <div className="design-meta"><p className="eyebrow">{asset.category} / {String(i + 1).padStart(2, '0')}</p><h2>{asset.name.replace(' — local placeholder', '').replace('Gate 01', 'Frame — modern lines')}</h2><button className="text-link" disabled={loading} onClick={() => { void restore(undefined, asset).then((next) => { if (next) setNotice(`${asset.name} selected.`); }); }}>{gate?.asset.src === asset.src ? 'Selected ✓' : 'Select design →'}</button></div>
    </article>)}</div>
    <div className="editorial-note"><p>Every included gate is an original 2D placeholder, not a product available for purchase. Have a particular design in mind?</p><a className="text-link" href="#/upload">Upload your own gate →</a></div>
  </div>;
}
