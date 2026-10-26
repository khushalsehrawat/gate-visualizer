import { useEffect, useRef, useState } from 'react';
import { deleteProject, listProjects, renameProject } from '../storage/projects';
import type { SavedProject } from '../photo/model';

function SavedCard({ project, refresh, onOpen }: { project: SavedProject; refresh: () => void; onOpen: (id: string) => Promise<void> }) {
  const image = useRef<HTMLImageElement>(null), download = useRef<HTMLAnchorElement>(null);
  const [editing, setEditing] = useState(false), [confirmDelete, setConfirmDelete] = useState(false), [busy, setBusy] = useState(false), [name, setName] = useState(project.name), [error, setError] = useState('');
  useEffect(() => { const url = URL.createObjectURL(project.composite); if (image.current) image.current.src = url; if (download.current) download.current.href = url; return () => URL.revokeObjectURL(url); }, [project.composite]);
  async function action(task: () => Promise<void>) { setBusy(true); setError(''); try { await task(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.'); } finally { setBusy(false); } }
  return <article className="saved-card"><img ref={image} alt={`Saved composited entrance: ${project.name}`} />
    <div className="saved-card-body"><p className="eyebrow">Saved on this device</p><h2>{project.name}</h2><p className="fine-print">{new Date(project.updatedAt).toLocaleDateString()} · {project.gateName}</p>
      {editing ? <form onSubmit={(event) => { event.preventDefault(); void action(async () => { await renameProject(project.id, name); setEditing(false); refresh(); }); }}><label className="field-label">New preview name<input value={name} maxLength={120} onChange={(event) => setName(event.currentTarget.value)} /></label><div className="button-row"><button className="text-link" disabled={busy || !name.trim()}>Save name</button><button className="text-link" type="button" onClick={() => setEditing(false)}>Cancel rename</button></div></form> : <div className="button-row"><button className="text-link" disabled={busy} onClick={() => { void action(() => onOpen(project.id)); }}>Open preview →</button><button className="text-link" disabled={busy} onClick={() => setEditing(true)}>Rename</button></div>}
      <div className="button-row"><a ref={download} className="text-link" download={`${project.name}-preview.png`}>Export image</a><button className="text-link" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete</button></div>
      {confirmDelete && <div className="delete-confirm"><p>Delete “{project.name}” from this device?</p><button className="text-link" disabled={busy} onClick={() => { void action(async () => { await deleteProject(project.id); refresh(); }); }}>Yes, delete preview</button><button className="text-link" onClick={() => setConfirmDelete(false)}>Keep preview</button></div>}
      {error && <p role="alert" className="form-error">{error}</p>}
    </div></article>;
}
export function SavedPreviews({ onOpen }: { onOpen: (id: string) => Promise<void> }) {
  const [items, setItems] = useState<SavedProject[] | null>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => { let active = true; void listProjects().then((list) => { if (active) { setItems(list); setError(''); } }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load saved previews.'); }); return () => { active = false; }; }, [revision]);
  return <div><div className="page-intro"><p className="eyebrow">Space to consider</p><h1>Your saved perspectives.</h1><p>Revisit a design, compare your options, or continue where you left off. Photos, gates and settings are saved in this browser, on this device.</p></div>
    {error && <div role="alert" className="form-error">{error} <button className="text-link" onClick={() => setRevision((n) => n + 1)}>Retry local storage</button></div>}
    {!items && !error && <p role="status">Loading your previews…</p>}
    {items?.length === 0 && <div className="empty-state"><span className="large-number">—</span><h2>A place for your possibilities.</h2><p>Your first saved preview will appear here.</p><a className="primary-button" href="#/photo">Create a Photo Preview</a></div>}
    <div className="saved-grid">{items?.map((item) => <SavedCard key={`${item.id}-${item.updatedAt}`} project={item} refresh={() => setRevision((n) => n + 1)} onOpen={onOpen} />)}</div>
    <p className="fine-print mt-6">Clearing browser data, private browsing or storage eviction can remove these files. Export important images. Saved photos do not restore a real-world XR anchor.</p>
  </div>;
}
