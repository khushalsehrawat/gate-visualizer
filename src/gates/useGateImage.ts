import { useEffect, useRef, useState } from 'react';
import { sampleGate } from './assets';
import type { GateAsset } from './assets';
import { loadGateImage, validateUpload } from './loadImage';
import type { GateImage } from './loadImage';

export function useGateImage() {
  const [gate, setGate] = useState<GateImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const ownedUrl = useRef<string | null>(null);
  const pendingUrls = useRef(new Set<string>());

  async function restore(file?: File, catalogueAsset: GateAsset = sampleGate): Promise<GateImage | null> {
    const version = ++request.current;
    let url: string | null = null;
    setLoading(true); setError('');
    try {
      if (file) { validateUpload(file); url = URL.createObjectURL(file); pendingUrls.current.add(url); }
      const next = await loadGateImage(url ?? catalogueAsset.src, file?.name ?? catalogueAsset.name, !file && catalogueAsset.placeholder);
      if (request.current !== version) { if (url) URL.revokeObjectURL(url); return null; }
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
      ownedUrl.current = url;
      setGate(next);
      return next;
    } catch (reason) {
      if (url) URL.revokeObjectURL(url);
      if (request.current === version) setError(reason instanceof Error ? reason.message : 'Image loading failed.');
      return null;
    } finally { if (url) pendingUrls.current.delete(url); if (request.current === version) setLoading(false); }
  }
  async function load(file?: File, catalogueAsset: GateAsset = sampleGate) { await restore(file, catalogueAsset); }

  useEffect(() => {
    const version = ++request.current;
    const pending = pendingUrls.current;
    void loadGateImage(sampleGate.src, sampleGate.name, true).then((next) => {
      if (request.current === version) { setGate(next); setLoading(false); }
    }).catch((reason: unknown) => {
      if (request.current === version) { setError(reason instanceof Error ? reason.message : 'Sample loading failed.'); setLoading(false); }
    });
    return () => {
      request.current += 1;
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current); ownedUrl.current = null;
      for (const url of pending) URL.revokeObjectURL(url);
      pending.clear();
    };
  }, []);
  return { gate, loading, error, load, restore };
}
