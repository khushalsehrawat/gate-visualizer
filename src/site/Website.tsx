import { useEffect, useState } from 'react';
import { GateProvider, useGateLibrary } from '../gates/GateProvider';
import { checking, detectBrowserCapability } from '../capabilities/detect';
import { Catalogue } from './Catalogue';
import { UploadGate } from './UploadGate';
import { SavedPreviews } from './SavedPreviews';
import { Home } from './Home';
import { Help } from './Help';
import LivePreview from '../LivePreview';
import PhotoPage from '../photo/PhotoPage';
import type { SavedProject } from '../photo/model';
import { getProject } from '../storage/projects';
const links = [['home', 'Home'], ['live', 'Live Preview'], ['catalogue', 'Gate Catalogue'], ['upload', 'Upload Your Gate'], ['photo', 'Photo Preview'], ['saved', 'Saved Previews'], ['help', 'Compatibility & Help']] as const;
function currentPage() { return window.location.hash.replace(/^#\/?/, '') || 'home'; }
function Website() {
  const [page, setPage] = useState(currentPage), [menu, setMenu] = useState(false), [activeAR, setActiveAR] = useState(false);
  const [capability, setCapability] = useState(checking), [restored, setRestored] = useState<SavedProject | null>(null);
  const library = useGateLibrary();
  useEffect(() => { const change = () => { if (activeAR && currentPage() !== 'live') { window.location.hash = '/live'; return; } setPage(currentPage()); setMenu(false); }; window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, [activeAR]);
  useEffect(() => { let active = true; void detectBrowserCapability().then((value) => { if (active) setCapability(value); }); return () => { active = false; }; }, []);
  useEffect(() => {
    document.title = `${links.find(([key]) => key === page)?.[1] ?? 'Welcome'} | GateVisualizer`;
    const heading = [...document.querySelectorAll<HTMLElement>('main h1')].find((node) => !node.closest('[hidden]'));
    heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
    if (document.documentElement.scrollTop > 0) window.scrollTo({ top: 0 });
  }, [page]);
  async function reopen(id: string) {
    const project = await getProject(id);
    const gate = await library.restore(new File([project.gate], project.gateName, { type: project.gate.type || 'image/png' }));
    if (!gate) throw new Error('The saved gate could not be decoded. Your saved record has not been changed.');
    setRestored(project); window.location.hash = '/photo';
  }
  return <div className="site-shell"><a href="#main-content" className="skip-link" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a><header className="site-header"><a className="wordmark" href="#/home" aria-label="GateVisualizer home"><span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span>GateVisualizer<span className="brand-period">.</span></a><button className="menu-toggle" aria-expanded={menu} aria-controls="site-navigation" onClick={() => setMenu(!menu)}>{menu ? 'Close menu' : 'Menu'}</button><nav id="site-navigation" className={menu ? 'site-nav is-open' : 'site-nav'} aria-label="Main navigation">{links.filter(([key]) => key !== 'home').map(([key, label]) => <a key={key} className={(capability.status === 'supported' ? key === 'live' : key === 'photo') ? 'nav-live' : ''} href={`#/${key}`} aria-current={page === key ? 'page' : undefined} aria-disabled={activeAR && key !== 'live'} onClick={(event) => { if (activeAR && key !== 'live') event.preventDefault(); }}>{label}</a>)}</nav></header>
    {activeAR && <p className="active-session-note">Live Preview is active. Exit AR before switching workspaces.</p>}
    <main id="main-content" className="site-main" tabIndex={-1}>
      {page === 'home' && <Home supported={capability.status === 'supported'} checking={capability.status === 'checking'} />}
      {page === 'live' && <LivePreview onActiveChange={setActiveAR} />}
      {page === 'catalogue' && <Catalogue />}{page === 'upload' && <UploadGate />}
      <section hidden={page !== 'photo'} aria-label="Photo Preview workspace"><PhotoPage enabled={page === 'photo'} restored={restored} /></section>
      {page === 'saved' && <SavedPreviews onOpen={reopen} />}{page === 'help' && <Help capability={capability} />}
      {!links.some(([key]) => key === page) && <div className="empty-state"><h1>A new direction.</h1><p>This page could not be found.</p><a className="primary-button" href="#/home">Return home</a></div>}
    </main><footer className="site-footer"><div><a className="wordmark" href="#/home">GateVisualizer.</a><p>A considered entrance starts with a clear view.</p></div><div><a href="#/help">Compatibility & privacy</a><a href="#/help">Image credits</a><span>Local previews. No account required.</span></div></footer>
  </div>;
}
export default function CustomerWebsite() { return <GateProvider><Website /></GateProvider>; }
