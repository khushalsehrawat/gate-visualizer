// One owner per XRSystem, including permission/setup and asynchronous teardown.
const owners = new WeakMap<object, symbol>();
const sessions = new Set<XRSession>();
const sources = new Set<XRHitTestSource>();
export function acquireXR(system: object): (() => void) | null {
  if (owners.has(system)) return null;
  const token = Symbol(); owners.set(system, token);
  return () => { if (owners.get(system) === token) owners.delete(system); };
}
export function trackXRSession(session: XRSession, releaseOwner: () => void) {
  sessions.add(session);
  const ended = () => { sessions.delete(session); releaseOwner(); session.removeEventListener('end', ended); };
  session.addEventListener('end', ended, { once: true });
}
export function trackHitSource(source: XRHitTestSource) { sources.add(source); }
export function releaseHitSource(source: XRHitTestSource) { sources.delete(source); source.cancel(); }
export function xrResourceCounts() { return { sessions: sessions.size, hitSources: sources.size }; }
